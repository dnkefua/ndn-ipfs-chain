import fp from 'fastify-plugin';
import { SiweMessage } from 'siwe';

// Hybrid auth: X-API-Key, JWT Bearer, or Sign-In With Ethereum.
// Sandbox mode (NODE_ENV=sandbox) requires explicit SANDBOX_MODE=true env var.
export const authPlugin = fp(async (app) => {
  app.decorate('authenticate', async function (req, reply) {
    // Sandbox mode requires BOTH NODE_ENV=sandbox AND explicit SANDBOX_MODE=true
    // This prevents accidental auth bypass in production
    if (process.env.NODE_ENV === 'sandbox' && process.env.SANDBOX_MODE === 'true') {
      app.log.warn({ path: req.url }, 'Sandbox mode: authentication bypassed');
      req.user = { tenant: 'sandbox', scopes: ['*'] };
      return;
    }

    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      const key = await app.db.apiKeys.verify(apiKey);
      if (!key) return reply.code(401).send({ error: 'invalid_api_key' });
      req.user = { tenant: key.tenantId, scopes: key.scopes, keyId: key.id };
      return;
    }

    const auth = req.headers.authorization ?? '';
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice(7);

      // SIWE tokens carry a 'siwe' prefix in our format
      if (token.startsWith('siwe.')) {
        const [, message, signature] = token.split('.');
        const siwe = new SiweMessage(Buffer.from(message, 'base64').toString('utf8'));
        const { data, success } = await siwe.verify({ signature: Buffer.from(signature, 'base64').toString('utf8') });
        if (!success) return reply.code(401).send({ error: 'siwe_verification_failed' });
        req.user = { tenant: data.address.toLowerCase(), scopes: ['pins:*', 'gateway:read'], address: data.address };
        return;
      }

      try {
        const payload = await req.jwtVerify();
        req.user = { tenant: payload.tenant, scopes: payload.scopes ?? [], userId: payload.sub };
        return;
      } catch {
        return reply.code(401).send({ error: 'invalid_jwt' });
      }
    }

    return reply.code(401).send({ error: 'authentication_required' });
  });

  app.decorate('requireScope', (...required) => async (req, reply) => {
    const has = req.user?.scopes ?? [];
    if (has.includes('*')) return;
    for (const s of required) {
      if (!has.includes(s) && !has.includes(s.split(':')[0] + ':*')) {
        return reply.code(403).send({ error: 'insufficient_scope', required });
      }
    }
  });
});
