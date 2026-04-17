import { models } from '../db/models.js';

export default async function modelRoutes(app) {
  app.addHook('onRequest', app.authenticate);

  app.post('/', { preHandler: app.requireScope('models:write') }, async (req, reply) => {
    const model = await app.db.models.create(req.user.tenant, req.body);
    reply.code(201);
    return model;
  });

  app.get('/:name/:version', { preHandler: app.requireScope('models:read') }, async (req, reply) => {
    const model = await app.db.models.get(req.params.name, req.params.version);
    if (!model) return reply.code(404).send({ error: 'model_not_found' });
    return model;
  });

  app.get('/', { preHandler: app.requireScope('models:read') }, async (req, reply) => {
    return app.db.models.list(req.user.tenant);
  });
}
