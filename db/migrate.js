const pool = require('./pool');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      property_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      boxes INTEGER NOT NULL CHECK (boxes > 0),
      contract_months INTEGER NOT NULL,
      price_per_box_pence INTEGER NOT NULL,
      callout_fee_pence INTEGER NOT NULL DEFAULT 0,
      collection_date DATE NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending_payment',
      stripe_session_id TEXT,
      stripe_subscription_id TEXT,
      stripe_customer_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_collection_date ON bookings (collection_date);`);
  console.log('Migration complete.');
  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
