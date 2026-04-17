import { SiweMessage, generateNonce } from 'siwe';

// Auth flows: signup, login (email+password), SIWE nonce/verify, and
// API-key CRUD. All protected routes live under other prefixes; this
// one is the on-ramp.
export default async function authRoutes(app) {
  app.post('/signup', async (req, reply) => {
    const { email, password, walletAddr, orgName } = req.body ?? {};
    if (!email || (!password && !walletAddr)) {
      return reply.code(400).send({ error: 'email_and_password_or_wallet_required' });
    }
    try {
      const { tenant, user } = await app.db.tenants.signup({ email, password, walletAddr, orgName });
      // Auto-mint a starter API key for the DX win.
      const key = await app.db.apiKeys.create({
        tenantId: tenant.id, name: 'default', scopes: ['*'],
      });
      const token = app.jwt.sign({ sub: user.id, tenant: tenant.id, scopes: ['*'] });
      reply.code(201);
      return { tenant, user, apiKey: key.rawKey, jwt: token };
    } catch (err) {
      if (err.code === '23505') return reply.code(409).send({ error: 'email_taken' });
      throw err;
    }
  });

  app.post('/login', async (req, reply) => {
    const { email, password } = req.body ?? {};
    const user = await app.db.tenants.verifyPassword(email, password);
    if (!user) return reply.code(401).send({ error: 'invalid_credentials' });
    const token = app.jwt.sign({ sub: user.id, tenant: user.tenant_id, scopes: ['*'] });
    return { jwt: token, user };
  });

  // SIWE flow: client requests a nonce, signs it, we verify and issue a JWT.
  app.get('/siwe/nonce', async (req, reply) => {
    const nonce = generateNonce();
    // In production, bind nonce to the session cookie / redis, TTL 5 min.
    reply.header('Cache-Control', 'no-store');
    return { nonce };
  });

  app.post('/siwe/verify', async (req, reply) => {
    const { message, signature } = req.body ?? {};
    const msg = new SiweMessage(message);
    const { success, data } = await msg.verify({ signature });
    if (!success) return reply.code(401).send({ error: 'siwe_verification_failed' });

    let user = await app.db.tenants.findByWallet(data.address);
    if (!user) {
      const r = await app.db.tenants.signup({
        email: `${data.address.toLowerCase()}@wallet.ndn`,
        walletAddr: data.address.toLowerCase(),
      });
      user = r.user;
    }
    const token = app.jwt.sign({ sub: user.id, tenant: user.tenant_id, scopes: ['*'], address: data.address });
    return { jwt: token, user };
  });

  // API-key CRUD
  app.addHook('onRequest', async (req, reply) => {
    if (req.url.startsWith('/keys')) await app.authenticate(req, reply);
  });

  app.get('/keys', async (req) => app.db.apiKeys.list(req.user.tenant));

  app.post('/keys', async (req, reply) => {
    const { name, scopes = ['*'] } = req.body ?? {};
    const k = await app.db.apiKeys.create({ tenantId: req.user.tenant, name, scopes });
    reply.code(201);
    return k; // rawKey only returned here, never again
  });

  app.delete('/keys/:id', async (req, reply) => {
    await app.db.apiKeys.revoke(req.user.tenant, req.params.id);
    reply.code(204).send();
  });
}
