export const audit = ({ sql }) => ({
  log({ tenantId, userId, action, resource, resourceId, payload, ip }) {
    return sql(
      `INSERT INTO audit_log (tenant_id, user_id, action, resource, resource_id, payload, ip)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,'{}'::jsonb),$7)`,
      [tenantId, userId, action, resource, resourceId, JSON.stringify(payload ?? {}), ip]);
  },

  list(tenantId, { limit = 100 } = {}) {
    return sql(
      `SELECT * FROM audit_log WHERE tenant_id = $1 ORDER BY at DESC LIMIT $2`,
      [tenantId, limit]);
  },

  /** Daily job — Merkle root of new rows → to be anchored on L2. */
  todaysRowsForAnchor() {
    return sql(
      `SELECT id, tenant_id, action, resource, resource_id, at
         FROM audit_log
        WHERE at >= date_trunc('day', now() - interval '1 day')
          AND at <  date_trunc('day', now())
        ORDER BY id`);
  },
});
