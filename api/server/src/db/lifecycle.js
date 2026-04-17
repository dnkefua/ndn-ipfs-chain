export const lifecycle = ({ sql, one }) => ({
  list(tenantId) {
    return sql(`SELECT * FROM lifecycle_policies WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId]);
  },

  async create(tenantId, { name, rules }) {
    return one(
      `INSERT INTO lifecycle_policies (tenant_id, name, rules)
       VALUES ($1,$2,$3::jsonb)
       ON CONFLICT (tenant_id, name) DO UPDATE SET rules = EXCLUDED.rules
       RETURNING *`,
      [tenantId, name, JSON.stringify(rules)]);
  },

  delete(tenantId, id) {
    return sql(`DELETE FROM lifecycle_policies WHERE tenant_id = $1 AND id = $2`, [tenantId, id]);
  },

  all() {
    return sql(`SELECT * FROM lifecycle_policies`);
  },
});
