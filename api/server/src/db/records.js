// NDP §5 — Structured DB data layer.
//
// Content-addressed, immutable envelopes (records), mutable pointers (collections,
// views). Every write produces a new envelope whose CID is computed elsewhere
// (services/canonicalize.js) from JCS-canonicalized JSON; this layer only persists
// the pre-computed envelope + its CID.

export const records = ({ sql, one, pool }) => ({
  // --------------------------------------------------------------
  // collections
  // --------------------------------------------------------------
  collections: {
    async create(tenantId, { name, schemaCid = null }) {
      return one(
        `INSERT INTO collections (tenant_id, name, schema_cid)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, name) DO UPDATE SET schema_cid = EXCLUDED.schema_cid
         RETURNING *`,
        [tenantId, name, schemaCid]
      );
    },
    list(tenantId) {
      return sql(
        `SELECT * FROM collections WHERE tenant_id = $1 ORDER BY name`,
        [tenantId]
      );
    },
    get(tenantId, name) {
      return one(
        `SELECT * FROM collections WHERE tenant_id = $1 AND name = $2`,
        [tenantId, name]
      );
    },
    async touchHead(collectionId, headCid, delta = 0) {
      return one(
        `UPDATE collections
            SET head_cid = $2,
                record_count = GREATEST(0, record_count + $3),
                updated_at = now()
          WHERE id = $1
          RETURNING *`,
        [collectionId, headCid, delta]
      );
    },
  },

  // --------------------------------------------------------------
  // records — immutable envelopes with version chains
  // --------------------------------------------------------------
  async put({ tenantId, collectionId, recordId, cid, parentCid, body, envelope, version, sizeBytes }) {
    // Transactional: demote prior head, insert new head.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE records SET is_head = FALSE
          WHERE collection_id = $1 AND record_id = $2 AND is_head = TRUE`,
        [collectionId, recordId]
      );
      const { rows } = await client.query(
        `INSERT INTO records
           (cid, tenant_id, collection_id, record_id, parent_cid, body, envelope,
            version, is_head, size_bytes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
         RETURNING *`,
        [cid, tenantId, collectionId, recordId, parentCid,
         JSON.stringify(body), JSON.stringify(envelope), version, sizeBytes]
      );
      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  getByCid(cid) {
    return one(`SELECT * FROM records WHERE cid = $1`, [cid]);
  },

  getHead(collectionId, recordId) {
    return one(
      `SELECT * FROM records
        WHERE collection_id = $1 AND record_id = $2 AND is_head = TRUE`,
      [collectionId, recordId]
    );
  },

  history(collectionId, recordId) {
    return sql(
      `SELECT cid, parent_cid, version, created_at, size_bytes
         FROM records
        WHERE collection_id = $1 AND record_id = $2
        ORDER BY version DESC`,
      [collectionId, recordId]
    );
  },

  // --------------------------------------------------------------
  // query — NDP §5.3 Mongo-ish DSL, translated to Postgres JSONB.
  // Supported ops: equality, $eq/$ne/$gt/$gte/$lt/$lte,
  //                $in/$nin, $exists, $and/$or/$not, dot-paths.
  // --------------------------------------------------------------
  async query({ tenantId, collectionId, filter = {}, projection, sort, limit = 100, cursorVersion }) {
    const { whereSql, params } = buildWhere(filter, [tenantId, collectionId]);
    const orderSql = buildOrder(sort);
    const cursorSql = cursorVersion ? `AND version < $${params.length + 1}` : '';
    if (cursorVersion) params.push(cursorVersion);
    const lim = Math.min(Number(limit), 1000);
    params.push(lim + 1);

    const rows = await sql(
      `SELECT cid, record_id, body, version, created_at, size_bytes
         FROM records
        WHERE tenant_id = $1 AND collection_id = $2 AND is_head = TRUE
          ${whereSql}
          ${cursorSql}
        ${orderSql}
        LIMIT $${params.length}`,
      params
    );

    const hasMore = rows.length > lim;
    const results = rows.slice(0, lim).map((r) => projection ? project(r, projection) : r);
    return {
      results,
      next: hasMore ? String(rows[lim - 1].version) : null,
    };
  },

  // --------------------------------------------------------------
  // views — saved queries, content-addressed snapshots
  // --------------------------------------------------------------
  views: {
    create(tenantId, v) {
      return one(
        `INSERT INTO views
           (tenant_id, name, collection_id, filter, projection, sort, refresh_mode, refresh_seconds)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [tenantId, v.name, v.collectionId, JSON.stringify(v.filter ?? {}),
         v.projection ?? [], v.sort ? JSON.stringify(v.sort) : null,
         v.refreshMode ?? 'on_write', v.refreshSeconds ?? null]
      );
    },
    get(tenantId, name) {
      return one(`SELECT * FROM views WHERE tenant_id = $1 AND name = $2`, [tenantId, name]);
    },
    list(tenantId) {
      return sql(`SELECT * FROM views WHERE tenant_id = $1 ORDER BY name`, [tenantId]);
    },
    async recordSnapshot({ viewId, tenantId, cid, envelope, resultCount }) {
      await one(
        `INSERT INTO view_snapshots (cid, view_id, tenant_id, envelope, result_count)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (cid) DO NOTHING
         RETURNING cid`,
        [cid, viewId, tenantId, JSON.stringify(envelope), resultCount]
      );
      return one(
        `UPDATE views SET head_cid = $2, last_evaluated = now()
          WHERE id = $1
          RETURNING *`,
        [viewId, cid]
      );
    },
    getSnapshotByCid(cid) {
      return one(`SELECT * FROM view_snapshots WHERE cid = $1`, [cid]);
    },
  },

  // --------------------------------------------------------------
  // schemas
  // --------------------------------------------------------------
  schemas: {
    create(tenantId, { cid, name, schema, dialect }) {
      return one(
        `INSERT INTO schemas (cid, tenant_id, name, schema, dialect)
         VALUES ($1, $2, $3, $4, COALESCE($5, 'https://json-schema.org/draft/2020-12/schema'))
         ON CONFLICT (cid) DO NOTHING
         RETURNING *`,
        [cid, tenantId, name, JSON.stringify(schema), dialect]
      );
    },
    getByCid(cid) {
      return one(`SELECT * FROM schemas WHERE cid = $1`, [cid]);
    },
    list(tenantId) {
      return sql(`SELECT cid, name, dialect, created_at FROM schemas WHERE tenant_id = $1`, [tenantId]);
    },
  },
});

// =================================================================
// Query DSL → SQL translator. Keeps the filter small and predictable.
// =================================================================
const CMP = { $eq: '=', $ne: '!=', $gt: '>', $gte: '>=', $lt: '<', $lte: '<=' };

function buildWhere(filter, baseParams) {
  const params = [...baseParams];
  const clause = translate(filter, params);
  return { whereSql: clause ? `AND (${clause})` : '', params };
}

function translate(node, params) {
  if (node == null || typeof node !== 'object') return null;
  const clauses = [];
  for (const [key, val] of Object.entries(node)) {
    if (key === '$and' && Array.isArray(val)) {
      const parts = val.map((v) => translate(v, params)).filter(Boolean);
      if (parts.length) clauses.push(`(${parts.join(' AND ')})`);
    } else if (key === '$or' && Array.isArray(val)) {
      const parts = val.map((v) => translate(v, params)).filter(Boolean);
      if (parts.length) clauses.push(`(${parts.join(' OR ')})`);
    } else if (key === '$not') {
      const inner = translate(val, params);
      if (inner) clauses.push(`NOT (${inner})`);
    } else {
      clauses.push(translateField(key, val, params));
    }
  }
  return clauses.filter(Boolean).join(' AND ');
}

function translateField(path, val, params) {
  const jsonPath = jsonbPath(path);
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    const parts = [];
    for (const [op, operand] of Object.entries(val)) {
      if (op === '$in' && Array.isArray(operand)) {
        params.push(JSON.stringify(operand));
        parts.push(`(body #> '${arrayPath(path)}') <@ $${params.length}::jsonb OR body #> '${arrayPath(path)}' = ANY(SELECT jsonb_array_elements($${params.length}::jsonb))`);
      } else if (op === '$nin' && Array.isArray(operand)) {
        params.push(JSON.stringify(operand));
        parts.push(`NOT ((body #> '${arrayPath(path)}') = ANY(SELECT jsonb_array_elements($${params.length}::jsonb)))`);
      } else if (op === '$exists') {
        const exists = `body #> '${arrayPath(path)}' IS NOT NULL`;
        parts.push(operand ? exists : `NOT (${exists})`);
      } else if (CMP[op] !== undefined) {
        params.push(JSON.stringify(operand));
        parts.push(`(body #> '${arrayPath(path)}') ${CMP[op]} $${params.length}::jsonb`);
      }
    }
    return parts.length ? parts.join(' AND ') : null;
  }
  // Equality
  params.push(JSON.stringify(val));
  return `(body #> '${arrayPath(path)}') = $${params.length}::jsonb`;
}

function jsonbPath(dottedPath) {
  return dottedPath.split('.').map((p) => `'${p.replace(/'/g, "''")}'`).join(',');
}

function arrayPath(dottedPath) {
  return `{${dottedPath.split('.').map((p) => p.replace(/[{}]/g, '')).join(',')}}`;
}

function buildOrder(sort) {
  if (!sort || typeof sort !== 'object') return 'ORDER BY version DESC';
  const parts = Object.entries(sort).map(([field, dir]) => {
    const d = dir === -1 || dir === 'desc' ? 'DESC' : 'ASC';
    return `(body #> '${arrayPath(field)}') ${d}`;
  });
  return parts.length ? `ORDER BY ${parts.join(', ')}` : 'ORDER BY version DESC';
}

function project(row, fields) {
  const out = { cid: row.cid, record_id: row.record_id, version: row.version };
  if (!fields?.length) { out.body = row.body; return out; }
  const body = {};
  for (const f of fields) {
    const parts = f.split('.');
    let cur = row.body;
    for (const p of parts) { cur = cur?.[p]; if (cur === undefined) break; }
    if (cur !== undefined) assignPath(body, parts, cur);
  }
  out.body = body;
  return out;
}

function assignPath(obj, parts, value) {
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] ??= {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}
