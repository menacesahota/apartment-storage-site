# BlockBox Storage

Booking + payments site for a plastic storage box service targeting apartment
blocks in the West Midlands. Node/Express + Postgres + Stripe.

## Pricing

Edit `config.js` — it's the single source of truth for the pricing ladder,
delivery/collection fee, service area copy, and daily collection capacity.
The frontend and Stripe checkout both read from it.

## Local development

```
npm install
cp .env.example .env   # fill in DATABASE_URL, Stripe keys
npm run migrate         # creates the bookings table
npm start
```

## Deploying on Render

1. Create a Postgres instance, copy its connection string into `DATABASE_URL`.
2. Create a Web Service pointed at this repo:
   - Build command: `npm install && npm run migrate`
   - Start command: `npm start`
3. Set env vars: `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
4. In Stripe, add a webhook endpoint at `https://<your-app>/api/stripe-webhook`
   listening for `checkout.session.completed`, and copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`.

Until Stripe keys are set, bookings still save to the database but skip the
payment step (useful for testing the site before Stripe is live).
