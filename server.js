require('dotenv').config();
const express = require('express');
const path = require('path');
const { router: apiRouter, handleStripeWebhook } = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Stripe webhook needs the raw body — must be registered before express.json()
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());
app.use('/api', apiRouter);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`BlockBox Storage running on port ${PORT}`));
