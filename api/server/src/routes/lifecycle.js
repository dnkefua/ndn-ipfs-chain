// Declarative lifecycle policies. Rules run on a nightly reconciliation
// pass (also triggered by pin access events) via a lightweight worker.
export default async function lifecycleRoutes(app) {
  app.addHook('onRequest', app.authenticate);

  app.get('/policies', { preHandler: app.requireScope('lifecycle:read') }, async (req) => {
    return app.db.lifecycle.list(req.user.tenant);
  });

  app.post('/policies', { preHandler: app.requireScope('lifecycle:write') }, async (req, reply) => {
    const { name, rules } = req.body ?? {};
    if (!name || !Array.isArray(rules)) return reply.code(400).send({ error: 'invalid_policy' });
    for (const rule of rules) {
      if (!['move-to-warm', 'move-to-cold', 'move-to-filecoin', 'delete', 'reduce-replication'].includes(rule.action)) {
        return reply.code(400).send({ error: 'invalid_action', action: rule.action });
      }
    }
    const policy = await app.db.lifecycle.create(req.user.tenant, { name, rules });
    reply.code(201);
    return policy;
  });

  app.delete('/policies/:id', { preHandler: app.requireScope('lifecycle:write') }, async (req, reply) => {
    await app.db.lifecycle.delete(req.user.tenant, req.params.id);
    reply.code(204).send();
  });
}
