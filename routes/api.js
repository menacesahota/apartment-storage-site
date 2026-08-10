const express = require('express');
const Stripe = require('stripe');
const pool = require('../db/pool');
const { PRICING_TIERS, CALLOUT_FEE_PENCE, MAX_COLLECTIONS_PER_DAY, SERVICE_AREA, BOX_SPEC, MIN_BOXES, MAX_BOXES, getTier } = require('../config');

const router = express.Router();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

router.get('/pricing', (req, res) => {
  res.json({
    tiers: PRICING_TIERS,
    calloutFeePence: CALLOUT_FEE_PENCE,
    serviceArea: SERVICE_AREA,
    boxSpec: BOX_SPEC,
    minBoxes: MIN_BOXES,
    maxBoxes: MAX_BOXES
  });
});

// Returns booked counts per day for a given month so the calendar can show live availability.
router.get('/availability', async (req, res) => {
  const month = req.query.month; // format YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(month || '')) {
    return res.status(400).json({ error: 'month must be in YYYY-MM format' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT collection_date::text AS date, COUNT(*)::int AS count
       FROM bookings
       WHERE status != 'cancelled' AND to_char(collection_date, 'YYYY-MM') = $1
       GROUP BY collection_date`,
      [month]
    );
    const booked = {};
    rows.forEach(r => { booked[r.date] = r.count; });
    res.json({ maxPerDay: MAX_COLLECTIONS_PER_DAY, booked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load availability' });
  }
});

router.post('/bookings', async (req, res) => {
  const { propertyName, contactName, email, phone, address, boxes, contractMonths, collectionDate, notes } = req.body;

  if (!propertyName || !contactName || !email || !phone || !address || !boxes || !contractMonths || !collectionDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const tier = getTier(contractMonths);
  if (!tier) return res.status(400).json({ error: 'Invalid contract length' });
  const boxCount = parseInt(boxes, 10);
  if (!Number.isInteger(boxCount) || boxCount < MIN_BOXES || boxCount > MAX_BOXES) {
    return res.status(400).json({ error: `Boxes must be between ${MIN_BOXES} and ${MAX_BOXES}` });
  }

  const collDate = new Date(collectionDate + 'T00:00:00Z');
  if (isNaN(collDate.getTime()) || collDate < new Date(new Date().toDateString())) {
    return res.status(400).json({ error: 'Invalid collection date' });
  }

  try {
    // Enforce daily capacity
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM bookings WHERE collection_date = $1 AND status != 'cancelled'`,
      [collectionDate]
    );
    if (countRows[0].count >= MAX_COLLECTIONS_PER_DAY) {
      return res.status(409).json({ error: 'That collection date is fully booked. Please choose another date.' });
    }

    const calloutFee = tier.months >= 12 ? 0 : CALLOUT_FEE_PENCE;

    const { rows } = await pool.query(
      `INSERT INTO bookings
        (property_name, contact_name, email, phone, address, boxes, contract_months, price_per_box_pence, callout_fee_pence, collection_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [propertyName, contactName, email, phone, address, boxCount, tier.months, tier.pricePerBoxPence, calloutFee, collectionDate, notes || null]
    );
    const bookingId = rows[0].id;

    if (!stripe) {
      // No Stripe keys configured yet — booking is recorded, payment step skipped.
      return res.json({ bookingId, checkoutUrl: null, warning: 'Payment is not configured yet on this site.' });
    }

    const lineItems = [
      {
        price_data: {
          currency: 'gbp',
          product_data: { name: `BlockBox Storage — ${boxCount} box(es), ${tier.label}` },
          unit_amount: tier.pricePerBoxPence,
          recurring: { interval: 'month' }
        },
        quantity: boxCount
      }
    ];
    if (calloutFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: { name: 'One-off delivery & collection fee' },
          unit_amount: calloutFee
        },
        quantity: 1
      });
    }

    const subscriptionData = { metadata: { bookingId: String(bookingId) } };
    if (tier.months > 1) {
      const cancelAt = new Date(collDate);
      cancelAt.setMonth(cancelAt.getMonth() + tier.months);
      subscriptionData.cancel_at = Math.floor(cancelAt.getTime() / 1000);
    }

    const origin = `${req.protocol}://${req.get('host')}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: lineItems,
      subscription_data: subscriptionData,
      success_url: `${origin}/success.html?booking=${bookingId}`,
      cancel_url: `${origin}/booking.html?cancelled=1`,
      metadata: { bookingId: String(bookingId) }
    });

    await pool.query(`UPDATE bookings SET stripe_session_id = $1 WHERE id = $2`, [session.id, bookingId]);

    res.json({ bookingId, checkoutUrl: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create booking' });
  }
});

router.get('/booking/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, property_name, boxes, contract_months, collection_date, status FROM bookings WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load booking' });
  }
});

// Raw-body webhook handler is mounted separately in server.js
async function handleStripeWebhook(req, res) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).send('Webhook not configured');
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const bookingId = session.metadata && session.metadata.bookingId;
    if (bookingId) {
      try {
        await pool.query(
          `UPDATE bookings SET status = 'confirmed', stripe_subscription_id = $1, stripe_customer_id = $2 WHERE id = $3`,
          [session.subscription, session.customer, bookingId]
        );
      } catch (err) {
        console.error('Failed to update booking after payment:', err);
      }
    }
  }

  res.json({ received: true });
}

module.exports = { router, handleStripeWebhook };
