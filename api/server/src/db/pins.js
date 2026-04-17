export const pins = ({ sql, one }) => ({
  async create(p) {
    return one(
      `INSERT INTO pins (tenant_id, cid, name, status, tier, region, replication,
                         size_bytes, encryption, key_id, lifecycle, meta)
       VALUES ($1,$2,$3,COALESCE($4,'queued'),COALESCE($5,'hot'),$6,$7,$8,
               COALESCE($9,false),$10,$11,COALESCE($12,'{}'::jsonb))
       RETURNING *`,
      [p.tenant, p.cid, p.name, p.status, p.tier, p.region, p.replication ?? 3,
       p.size, p.encryption, p.keyId, p.lifecycle, JSON.stringify(p.meta ?? {})]
    );
  },

  async list({ tenant, cid, name, status, limit = 100, cursor }) {
    const where = ['tenant_id = $1'];
    const args = [tenant];
    if (cid)    { args.push(cid);    where.push(`cid = $${args.length}`); }
    if (name)   { args.push(`%${name}%`); where.push(`name ILIKE $${args.length}`); }
    if (status) { args.push(status); where.push(`status = $${args.length}`); }
    if (cursor) { args.push(cursor); where.push(`created_at < $${args.length}`); }
    args.push(Math.min(limit, 1000));
    const rows = await sql(
      `SELECT * FROM pins WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC LIMIT $${args.length}`, args);
    return {
      results: rows,
      next: rows.length === limit ? rows[rows.length - 1].created_at.toISOString() : null,
    };
  },

  get(tenant, id) {
    return one(`SELECT * FROM pins WHERE tenant_id=$1 AND id=$2`, [tenant, id]);
  },

  update(id, patch) {
    const keys = Object.keys(patch);
    const setClause = keys.map((k, i) => `${toColumn(k)} = $${i + 2}`).join(', ');
    return one(
      `UPDATE pins SET ${setClause}, updated_at = now() WHERE id = $1 RETURNING *`,
      [id, ...keys.map((k) => patch[k])]
    );
  },

  delete(tenant, id) {
    return sql(`DELETE FROM pins WHERE tenant_id=$1 AND id=$2`, [tenant, id]);
  },

  /** Pins eligible for a lifecycle action tonight. */
  async dueFor(action, days) {
    return sql(
      `SELECT p.* FROM pins p
         JOIN lifecycle_policies lp ON lp.name = p.lifecycle AND lp.tenant_id = p.tenant_id
        WHERE lp.rules @> $1::jsonb
          AND p.tier != $2
          AND p.created_at < now() - make_interval(days => $3)
        LIMIT 1000`,
      [JSON.stringify([{ action }]), tierFor(action), days]
    );
  },

  setLastAccess(id) {
    return sql(`UPDATE pins SET last_access = now() WHERE id = $1`, [id]);
  },
});

function toColumn(k) {
  return ({ size: 'size_bytes', keyId: 'key_id', lastAccess: 'last_access' })[k] ?? k;
}
function tierFor(action) {
  return { 'move-to-warm': 'warm', 'move-to-cold': 'cold', 'move-to-filecoin': 'cold', 'move-to-glacier': 'glacier' }[action] ?? 'hot';
}
