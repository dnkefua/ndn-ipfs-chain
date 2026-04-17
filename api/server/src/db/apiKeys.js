import { createHash, randomBytes } from 'node:crypto';

export const apiKeys = ({ sql, one }) => ({
  /** Hash lookup — bcrypt is overkill for high-entropy random keys; sha-256 is fine. */
  async verify(rawKey) {
    const hash = sha256(rawKey);
    const row = await one(
      `SELECT * FROM api_keys WHERE hash = $1 AND revoked_at IS NULL`, [hash]);
    if (!row) return null;
    void sql(`UPDATE api_keys SET last_used_at = now() WHERE id = $1`, [row.id]);
    return { id: row.id, tenantId: row.tenant_id, scopes: row.scopes };
  },

  async create({ tenantId, name, scopes }) {
    const raw = `ndn_live_${randomBytes(24).toString('base64url')}`;
    const hash = sha256(raw);
    const prefix = raw.slice(0, 14);
    const row = await one(
      `INSERT INTO api_keys (tenant_id, name, hash, prefix, scopes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [tenantId, name, hash, prefix, scopes]);
    return { ...row, rawKey: raw }; // rawKey returned ONCE
  },

  list(tenantId) {
    return sql(
      `SELECT id, name, prefix, scopes, created_at, last_used_at, revoked_at
         FROM api_keys WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId]);
  },

  revoke(tenantId, id) {
    return sql(
      `UPDATE api_keys SET revoked_at = now()
         WHERE tenant_id = $1 AND id = $2 AND revoked_at IS NULL`, [tenantId, id]);
  },
});

function sha256(s) { return createHash('sha256').update(s).digest('hex'); }
