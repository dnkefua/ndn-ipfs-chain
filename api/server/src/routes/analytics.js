export default async function analyticsRoutes(app) {
  app.addHook('onRequest', app.authenticate);

  app.get('/usage', { preHandler: app.requireScope('analytics:read') }, async (req) => {
    const { from, to, granularity = 'day' } = req.query;
    return app.db.analytics.usage(req.user.tenant, {
      from: from ? new Date(from) : new Date(Date.now() - 30 * 24 * 3600 * 1000),
      to:   to   ? new Date(to)   : new Date(),
      granularity,
    });
  });

  app.get('/replication', { preHandler: app.requireScope('analytics:read') }, async (req) => {
    return app.db.analytics.replicationHealth(req.user.tenant);
  });

  app.get('/filecoin-deals', { preHandler: app.requireScope('analytics:read') }, async (req) => {
    return app.db.analytics.filecoinDeals(req.user.tenant);
  });
}
