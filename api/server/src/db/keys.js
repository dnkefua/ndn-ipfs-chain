// Envelope-key records. In production the `wrapped` bytes are created by
// HashiCorp Vault transit engine or AWS KMS; the API server never holds
// an unwrapped key. The stub below keeps it simple for local dev.
export const envelopeKeys = ({ sql, one }) => ({
  async create(tenantId, material /* Buffer */) {
    return one(
      `INSERT INTO envelope_keys (tenant_id, wrapped) VALUES ($1,$2) RETURNING *`,
      [tenantId, material]);
  },

  list(tenantId) {
    return sql(
      `SELECT id, algorithm, created_at, shredded_at IS NOT NULL AS shredded
         FROM envelope_keys WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]);
  },

  get(tenantId, id) {
    return one(
      `SELECT * FROM envelope_keys WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id]);
  },

  shred(tenantId, id) {
    // Zero the wrapped bytes in-place, then flag + log.
    return sql(
      `UPDATE envelope_keys
         SET wrapped = decode(repeat('00', length(wrapped)), 'hex'),
             shredded_at = now()
       WHERE tenant_id = $1 AND id = $2 AND shredded_at IS NULL`,
      [tenantId, id]);
  },

  store(tenantId, material, iv) {
    // Convenience for the upload route's inline-encryption path.
    return this.create(tenantId, material);
  },
});
