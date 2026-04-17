import fp from 'fastify-plugin';

// Per-request bandwidth + request counting. Accumulates in-memory and
// flushes every 60 s. Storage-tier GB-hours are produced by a separate
// hourly job that calls app.db.analytics.snapshotStorage().
export const meteringPlugin = fp(async (app) => {
  const pending = new Map(); // tenantId → { egressBytes, reads, writes }

  app.addHook('onResponse', async (req, reply) => {
    if (!req.user?.tenant) return;
    const tid = req.user.tenant;
    const entry = pending.get(tid) ?? { egressBytes: 0, reads: 0, writes: 0 };
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const len = Number(reply.getHeader('content-length') ?? 0);
    entry.egressBytes += Number.isFinite(len) ? len : 0;
    if (isWrite) entry.writes += 1; else entry.reads += 1;
    pending.set(tid, entry);
  });

  const flush = async () => {
    if (pending.size === 0) return;
    const batch = Array.from(pending.entries());
    pending.clear();
    await Promise.all(batch.map(([tenantId, d]) =>
      app.db.analytics.incrementHour(tenantId, {
        egressGB: d.egressBytes / 1e9,
        reads:    d.reads,
        writes:   d.writes,
      }).catch((err) => app.log.error({ err, tenantId }, 'metering flush'))));
  };

  const interval = setInterval(flush, 60_000).unref();
  app.addHook('onClose', async () => { clearInterval(interval); await flush(); });
});
