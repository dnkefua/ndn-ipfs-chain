export const models = ({ sql, one }) => ({
  async create(tenantId, m) {
    return one(
      `INSERT INTO models (tenant_id, name, version, root_cid, shard_map, model_card)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tenantId, m.name, m.version, m.root_cid, JSON.stringify(m.shard_map ?? {}), JSON.stringify(m.model_card ?? {})]
    );
  },

  async get(name, version) {
    return one(
      `SELECT * FROM models WHERE name = $1 AND version = $2`,
      [name, version]
    );
  },

  list(tenantId) {
    return sql(`SELECT * FROM models WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId]);
  },

  delete(id) {
    return sql(`DELETE FROM models WHERE id = $1`, [id]);
  },
});
