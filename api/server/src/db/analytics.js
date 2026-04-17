export const analytics = ({ sql, one }) => ({
  async usage(tenantId, { from, to, granularity }) {
    const bucket = ({ hour: 'hour', day: 'day', month: 'month' })[granularity] ?? 'day';
    const rows = await sql(
      `SELECT date_trunc($1, hour) AS bucket,
              SUM(storage_hot_gb_h)     / 24 AS hot_gb,
              SUM(storage_warm_gb_h)    / 24 AS warm_gb,
              SUM(storage_cold_gb_h)    / 24 AS cold_gb,
              SUM(storage_glacier_gb_h) / 24 AS glacier_gb,
              SUM(egress_gb)                 AS egress_gb,
              SUM(requests_read)             AS reads,
              SUM(requests_write)            AS writes
         FROM usage_hourly
        WHERE tenant_id = $2 AND hour >= $3 AND hour < $4
        GROUP BY bucket ORDER BY bucket`,
      [bucket, tenantId, from, to]);

    return {
      buckets: rows,
      totals: rows.reduce(
        (acc, r) => ({
          hotGB:      (acc.hotGB     ?? 0) + Number(r.hot_gb),
          warmGB:     (acc.warmGB    ?? 0) + Number(r.warm_gb),
          coldGB:     (acc.coldGB    ?? 0) + Number(r.cold_gb),
          glacierGB:  (acc.glacierGB ?? 0) + Number(r.glacier_gb),
          egressGB:   (acc.egressGB  ?? 0) + Number(r.egress_gb),
          reads:      (acc.reads     ?? 0) + Number(r.reads),
          writes:     (acc.writes    ?? 0) + Number(r.writes),
        }),
        {}),
    };
  },

  async replicationHealth(tenantId) {
    return one(
      `SELECT COUNT(*) FILTER (WHERE replicas_ok) AS healthy,
              COUNT(*) FILTER (WHERE NOT replicas_ok) AS degraded,
              COUNT(*) AS total
         FROM (
           SELECT p.id, COUNT(r.*) >= p.replication AS replicas_ok
             FROM pins p LEFT JOIN pin_replicas r ON r.pin_id = p.id
            WHERE p.tenant_id = $1
            GROUP BY p.id, p.replication
         ) q`, [tenantId]);
  },

  filecoinDeals(tenantId) {
    return sql(
      `SELECT fd.*, p.cid, p.name
         FROM filecoin_deals fd JOIN pins p ON p.id = fd.pin_id
        WHERE p.tenant_id = $1
        ORDER BY fd.expires_at ASC
        LIMIT 500`, [tenantId]);
  },

  /** Idempotent upsert used by the metering plugin every minute. */
  incrementHour(tenantId, deltas) {
    return sql(
      `INSERT INTO usage_hourly (tenant_id, hour, egress_gb, requests_read, requests_write)
       VALUES ($1, date_trunc('hour', now()), $2, $3, $4)
       ON CONFLICT (tenant_id, hour) DO UPDATE SET
         egress_gb       = usage_hourly.egress_gb      + EXCLUDED.egress_gb,
         requests_read   = usage_hourly.requests_read  + EXCLUDED.requests_read,
         requests_write  = usage_hourly.requests_write + EXCLUDED.requests_write`,
      [tenantId, deltas.egressGB ?? 0, deltas.reads ?? 0, deltas.writes ?? 0]);
  },

  /** Hourly job: snapshot storage bytes → GB-hours. */
  snapshotStorage() {
    return sql(
      `INSERT INTO usage_hourly (tenant_id, hour, storage_hot_gb_h, storage_warm_gb_h,
                                 storage_cold_gb_h, storage_glacier_gb_h)
       SELECT tenant_id, date_trunc('hour', now()),
              SUM(size_bytes) FILTER (WHERE tier = 'hot')     / 1e9,
              SUM(size_bytes) FILTER (WHERE tier = 'warm')    / 1e9,
              SUM(size_bytes) FILTER (WHERE tier = 'cold')    / 1e9,
              SUM(size_bytes) FILTER (WHERE tier = 'glacier') / 1e9
         FROM pins WHERE size_bytes IS NOT NULL
         GROUP BY tenant_id
       ON CONFLICT (tenant_id, hour) DO UPDATE SET
         storage_hot_gb_h     = EXCLUDED.storage_hot_gb_h,
         storage_warm_gb_h    = EXCLUDED.storage_warm_gb_h,
         storage_cold_gb_h    = EXCLUDED.storage_cold_gb_h,
         storage_glacier_gb_h = EXCLUDED.storage_glacier_gb_h`);
  },
});
