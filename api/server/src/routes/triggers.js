import { ethers } from 'ethers';

// Smart-contract event triggers. Each trigger subscribes to a specific
// event signature on a specific contract and auto-pins the CID carried
// in the designated event field. Runs as a background worker that
// maintains WebSocket subscriptions to chain RPCs.
export default async function triggersRoutes(app) {
  app.addHook('onRequest', app.authenticate);

  app.get('/', { preHandler: app.requireScope('triggers:read') }, async (req) => {
    return app.db.triggers.list(req.user.tenant);
  });

  app.post('/', { preHandler: app.requireScope('triggers:write') }, async (req, reply) => {
    const { chain, contract, event, cidField, filter, policy } = req.body ?? {};
    if (!chain || !contract || !event || !cidField) {
      return reply.code(400).send({ error: 'missing_fields' });
    }
    if (!SUPPORTED_CHAINS.includes(chain)) {
      return reply.code(400).send({ error: 'unsupported_chain', chain });
    }
    if (!ethers.isAddress(contract) && chain !== 'solana') {
      return reply.code(400).send({ error: 'invalid_contract' });
    }
    const trigger = await app.db.triggers.create(req.user.tenant, { chain, contract, event, cidField, filter, policy });
    app.triggerWorker?.register(trigger);
    reply.code(201);
    return trigger;
  });

  app.delete('/:id', { preHandler: app.requireScope('triggers:write') }, async (req, reply) => {
    const trigger = await app.db.triggers.get(req.user.tenant, req.params.id);
    if (!trigger) return reply.code(404).send({ error: 'not_found' });
    await app.db.triggers.delete(req.user.tenant, req.params.id);
    app.triggerWorker?.unregister(trigger);
    reply.code(204).send();
  });
}

const SUPPORTED_CHAINS = ['ethereum', 'polygon', 'arbitrum', 'base', 'optimism', 'avalanche', 'solana'];
