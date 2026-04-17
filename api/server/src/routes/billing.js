import Stripe from 'stripe';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Stripe subscription management + USDC crypto-pay reconciliation.
// Both paths converge on app.db.tenants.upgradePlan().
export default async function billingRoutes(app) {
  const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
    : null;

  app.post('/checkout', { preHandler: app.authenticate }, async (req, reply) => {
    if (!stripe) return reply.code(501).send({ error: 'stripe_not_configured' });
    const { plan } = req.body ?? {};
    const priceId = PRICE_IDS[plan];
    if (!priceId) return reply.code(400).send({ error: 'invalid_plan' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: req.user.tenant,
      success_url: `${process.env.DASHBOARD_URL}/billing?ok=1`,
      cancel_url:  `${process.env.DASHBOARD_URL}/billing`,
    });
    return { url: session.url };
  });

  // Stripe webhook — /v1/billing/stripe
  app.post('/stripe', { config: { rawBody: true } }, async (req, reply) => {
    if (!stripe) return reply.code(501).send();
    const sig = req.headers['stripe-signature'];
    let evt;
    try {
      evt = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return reply.code(400).send({ error: 'bad_signature' });
    }
    if (evt.type === 'checkout.session.completed' || evt.type === 'customer.subscription.updated') {
      const s = evt.data.object;
      const plan = PLAN_FROM_PRICE[s.items?.data?.[0]?.price?.id] ?? 'pro';
      const tenantId = s.client_reference_id ?? s.metadata?.tenantId;
      await app.db.tenants.upgradePlan(tenantId, plan, s.customer);
    }
    return { received: true };
  });

  // Crypto pay — /v1/billing/crypto
  // Flow: client sends a USDC tx to our treasury; the receipt webhook (e.g., from
  // Alchemy/Moralis Streams) hits this endpoint and we upgrade the plan.
  app.post('/crypto', async (req, reply) => {
    const hmac = req.headers['x-ndn-signature'];
    const expected = createHmac('sha256', process.env.CRYPTO_WEBHOOK_SECRET ?? '').update(req.rawBody ?? '').digest('hex');
    if (!hmac || !timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expected, 'hex'))) {
      return reply.code(400).send({ error: 'bad_signature' });
    }
    const { tenantId, plan, txHash, amountUSDC, from } = req.body ?? {};
    const expectedAmount = { pro: 18.62, team: 195.02 }[plan]; // 2% crypto discount
    if (!expectedAmount || amountUSDC < expectedAmount - 0.5) {
      return reply.code(400).send({ error: 'insufficient_amount' });
    }
    await app.db.tenants.upgradePlan(tenantId, plan, `crypto:${txHash}`);
    return { ok: true };
  });
}

const PRICE_IDS = {
  pro:  process.env.STRIPE_PRICE_PRO  ?? 'price_pro_default',
  team: process.env.STRIPE_PRICE_TEAM ?? 'price_team_default',
};
const PLAN_FROM_PRICE = Object.fromEntries(Object.entries(PRICE_IDS).map(([k, v]) => [v, k]));
