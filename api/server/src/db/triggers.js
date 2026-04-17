export const triggers = ({ sql, one }) => ({
  async create(tenantId, t) {
    return one(
      `INSERT INTO triggers (tenant_id, chain, contract, event, cid_field, filter, policy)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,'{}'::jsonb),COALESCE($7,'{}'::jsonb))
       RETURNING *`,
      [tenantId, t.chain, t.contract, t.event, t.cidField,
       JSON.stringify(t.filter ?? {}), JSON.stringify(t.policy ?? {})]);
  },

  list(tenantId) {
    return sql(`SELECT * FROM triggers WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId]);
  },

  listEnabledByChain(chain) {
    return sql(`SELECT * FROM triggers WHERE chain = $1 AND enabled`, [chain]);
  },

  get(tenantId, id) {
    return one(`SELECT * FROM triggers WHERE tenant_id = $1 AND id = $2`, [tenantId, id]);
  },

  updateLastBlock(id, block) {
    return sql(`UPDATE triggers SET last_block = $2 WHERE id = $1`, [id, block]);
  },

  delete(tenantId, id) {
    return sql(`DELETE FROM triggers WHERE tenant_id = $1 AND id = $2`, [tenantId, id]);
  },
});
