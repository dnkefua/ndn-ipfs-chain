export default async function teamsRoutes(app) {
  app.addHook('onRequest', app.authenticate);

  app.get('/', { preHandler: app.requireScope('teams:read') }, async (req) => {
    return app.db.teams.list(req.user.tenant);
  });

  app.post('/', { preHandler: app.requireScope('teams:write') }, async (req, reply) => {
    const team = await app.db.teams.create(req.user.tenant, req.body);
    reply.code(201);
    return team;
  });

  app.post('/:id/members', { preHandler: app.requireScope('teams:write') }, async (req, reply) => {
    const { userId, role } = req.body ?? {};
    if (!['owner', 'admin', 'developer', 'viewer', 'billing'].includes(role)) {
      return reply.code(400).send({ error: 'invalid_role' });
    }
    await app.db.teams.addMember(req.user.tenant, req.params.id, { userId, role });
    reply.code(204).send();
  });
}
