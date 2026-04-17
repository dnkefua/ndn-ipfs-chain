import { CID } from 'multiformats/cid';

export default async function pinsRoutes(app) {
  app.addHook('onRequest', app.authenticate);

  app.get('/', { preHandler: app.requireScope('pins:read') }, async (req) => {
    const { cid, name, status, limit = 100, cursor } = req.query;
    const { results, next } = await app.db.pins.list({
      tenant: req.user.tenant, cid, name, status, limit: Math.min(Number(limit), 1000), cursor,
    });
    return { count: results.length, results, next };
  });

  app.post('/', { preHandler: app.requireScope('pins:write') }, async (req, reply) => {
    const { cid, name, origins, replication = 3, region, encryption = false, lifecycle, meta } = req.body ?? {};
    if (!cid) return reply.code(400).send({ error: 'cid_required' });
    try { CID.parse(cid); } catch { return reply.code(400).send({ error: 'invalid_cid' }); }

    const pin = await app.db.pins.create({
      tenant: req.user.tenant, cid, name, origins, replication, region, encryption, lifecycle, meta,
      status: 'queued', created: new Date(),
    });
    app.cluster.pin(cid, { replication, region, name, meta })
      .then(() => app.db.pins.update(pin.id, { status: 'pinning' }))
      .catch((err) => app.log.error({ err, cid }, 'pin failed'));

    reply.code(202);
    return pin;
  });

  app.get('/:id', { preHandler: app.requireScope('pins:read') }, async (req, reply) => {
    const pin = await app.db.pins.get(req.user.tenant, req.params.id);
    if (!pin) return reply.code(404).send({ error: 'not_found' });
    const status = await app.cluster.status(pin.cid).catch(() => null);
    return { ...pin, replicas: status?.peer_map ? Object.keys(status.peer_map) : [] };
  });

  app.delete('/:id', { preHandler: app.requireScope('pins:write') }, async (req, reply) => {
    const pin = await app.db.pins.get(req.user.tenant, req.params.id);
    if (!pin) return reply.code(404).send({ error: 'not_found' });
    await app.cluster.unpin(pin.cid);
    await app.db.pins.delete(req.user.tenant, req.params.id);
    reply.code(204).send();
  });
}
