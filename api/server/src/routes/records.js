// NDP §5 — Structured DB HTTP surface.
// Implements the record / collection / view / schema endpoints from the spec.
// Canonicalization + CID minting are delegated to services/ndp.js so the wire
// format stays spec-aligned.

import { envelopeWithCid, mintCid, validateAgainstSchema } from '../services/ndp.js';

export default async function recordsRoutes(app) {
  app.addHook('onRequest', app.authenticate);

  // =================================================================
  // COLLECTIONS
  // =================================================================

  app.post('/collections', { preHandler: app.requireScope('records:write') }, async (req, reply) => {
    const { name, schema_cid } = req.body ?? {};
    if (!name) return reply.code(400).send({ error: 'name_required' });
    try {
      const c = await app.db.records.collections.create(req.user.tenant, { name, schemaCid: schema_cid });
      reply.code(201);
      return c;
    } catch (err) {
      if (err.code === '23514') return reply.code(400).send({ error: 'invalid_collection_name' });
      throw err;
    }
  });

  app.get('/collections', { preHandler: app.requireScope('records:read') }, async (req) => {
    const results = await app.db.records.collections.list(req.user.tenant);
    return { count: results.length, results };
  });

  app.get('/collections/:name', { preHandler: app.requireScope('records:read') }, async (req, reply) => {
    const c = await app.db.records.collections.get(req.user.tenant, req.params.name);
    if (!c) return reply.code(404).send({ error: 'collection_not_found' });
    return c;
  });

  // =================================================================
  // RECORDS
  // =================================================================

  // PUT a record into a collection. Immutable version chain.
  app.post('/', { preHandler: app.requireScope('records:write') }, async (req, reply) => {
    const { collection, id, body, schema_cid } = req.body ?? {};
    if (!collection || !body || typeof body !== 'object') {
      return reply.code(400).send({ error: 'collection_and_body_required' });
    }
    const coll = await app.db.records.collections.get(req.user.tenant, collection);
    if (!coll) return reply.code(404).send({ error: 'collection_not_found' });

    // Validate against schema if the collection has one (or if caller passed one).
    const effectiveSchemaCid = schema_cid ?? coll.schema_cid;
    if (effectiveSchemaCid) {
      const schema = await app.db.records.schemas.getByCid(effectiveSchemaCid);
      if (!schema) return reply.code(400).send({ error: 'schema_not_found', schema_cid: effectiveSchemaCid });
      const errors = await validateAgainstSchema(body, schema.schema, effectiveSchemaCid);
      if (errors.length) return reply.code(400).send({ error: 'schema_validation_failed', details: errors });
    }

    const recordId = id ?? crypto.randomUUID();
    const prior = await app.db.records.getHead(coll.id, recordId);
    const { envelope: env, cid, bytes } = await envelopeWithCid({
      kind: 'record',
      tenantId: req.user.tenant,
      parentCid: prior?.cid ?? null,
      body: { collection, id: recordId, data: body },
    });

    const row = await app.db.records.put({
      tenantId: req.user.tenant,
      collectionId: coll.id,
      recordId,
      cid,
      parentCid: prior?.cid ?? null,
      body,              // stored decomposed for indexed queries
      envelope: env,     // full envelope kept for faithful replay
      version: (prior?.version ?? 0) + 1,
      sizeBytes: bytes.byteLength,
    });

    // Update the collection head pointer (its own envelope + CID).
    const headEnvelope = await envelopeWithCid({
      kind: 'collection-head',
      tenantId: req.user.tenant,
      parentCid: coll.head_cid ?? null,
      body: {
        collection: coll.name,
        updated_at: new Date().toISOString(),
        last_write_cid: cid,
      },
    });
    await app.db.records.collections.touchHead(coll.id, headEnvelope.cid, prior ? 0 : 1);

    reply.code(201);
    return { cid: row.cid, id: recordId, version: row.version, collection: coll.name, parent_cid: row.parent_cid };
  });

  // Retrieve by CID (any version, any collection).
  app.get('/:cid', { preHandler: app.requireScope('records:read') }, async (req, reply) => {
    // Prefix-match check: a CID starts with 'bafk' (CIDv1) or 'Qm' (CIDv0, legacy).
    // /:collection/:id routes are handled below; keep CIDs distinct by prefix.
    if (!/^(baf|Qm)/.test(req.params.cid)) {
      return reply.code(400).send({ error: 'invalid_cid' });
    }
    const row = await app.db.records.getByCid(req.params.cid);
    if (!row || row.tenant_id !== req.user.tenant) return reply.code(404).send({ error: 'not_found' });
    return row.envelope;
  });

  // Retrieve the latest version by collection + logical id.
  app.get('/:collection/:id', { preHandler: app.requireScope('records:read') }, async (req, reply) => {
    const coll = await app.db.records.collections.get(req.user.tenant, req.params.collection);
    if (!coll) return reply.code(404).send({ error: 'collection_not_found' });
    const row = await app.db.records.getHead(coll.id, req.params.id);
    if (!row) return reply.code(404).send({ error: 'not_found' });
    return row.envelope;
  });

  // Version history for a logical id.
  app.get('/:collection/:id/history', { preHandler: app.requireScope('records:read') }, async (req, reply) => {
    const coll = await app.db.records.collections.get(req.user.tenant, req.params.collection);
    if (!coll) return reply.code(404).send({ error: 'collection_not_found' });
    const versions = await app.db.records.history(coll.id, req.params.id);
    return { count: versions.length, versions };
  });

  // =================================================================
  // QUERY — Mongo-ish DSL (§5.3)
  // =================================================================

  app.post('/collections/:name/query', { preHandler: app.requireScope('records:read') }, async (req, reply) => {
    const coll = await app.db.records.collections.get(req.user.tenant, req.params.name);
    if (!coll) return reply.code(404).send({ error: 'collection_not_found' });
    const { filter, projection, sort, limit, cursor } = req.body ?? {};
    const { results, next } = await app.db.records.query({
      tenantId: req.user.tenant,
      collectionId: coll.id,
      filter: filter ?? {},
      projection,
      sort,
      limit: limit ?? 100,
      cursorVersion: cursor,
    });
    return { count: results.length, results, next };
  });

  // =================================================================
  // VIEWS — content-addressed saved queries (§5.4)
  // =================================================================

  app.post('/views', { preHandler: app.requireScope('views:write') }, async (req, reply) => {
    const { name, collection, filter, projection, sort, refresh } = req.body ?? {};
    if (!name || !collection) return reply.code(400).send({ error: 'name_and_collection_required' });
    const coll = await app.db.records.collections.get(req.user.tenant, collection);
    if (!coll) return reply.code(404).send({ error: 'collection_not_found' });

    const refreshMode = typeof refresh === 'string' && refresh.endsWith('s') ? 'interval'
                      : refresh === 'on_write' ? 'on_write'
                      : refresh === 'manual'   ? 'manual'
                      : 'on_write';
    const refreshSeconds = refreshMode === 'interval' ? parseInt(refresh, 10) : null;

    const view = await app.db.records.views.create(req.user.tenant, {
      name, collectionId: coll.id, filter, projection, sort, refreshMode, refreshSeconds,
    });
    await evaluateView(app, req.user.tenant, view, coll);
    const reloaded = await app.db.records.views.get(req.user.tenant, name);
    reply.code(201);
    return reloaded;
  });

  app.get('/views/:name', { preHandler: app.requireScope('views:read') }, async (req, reply) => {
    const view = await app.db.records.views.get(req.user.tenant, req.params.name);
    if (!view) return reply.code(404).send({ error: 'view_not_found' });
    if (!view.head_cid) return { view, snapshot: null };
    const snap = await app.db.records.views.getSnapshotByCid(view.head_cid);
    return { view, snapshot: snap?.envelope ?? null };
  });

  app.get('/views/by-cid/:cid', { preHandler: app.requireScope('views:read') }, async (req, reply) => {
    const snap = await app.db.records.views.getSnapshotByCid(req.params.cid);
    if (!snap || snap.tenant_id !== req.user.tenant) return reply.code(404).send({ error: 'not_found' });
    return snap.envelope;
  });

  // =================================================================
  // SCHEMAS — JSON Schema Draft 2020-12, content-addressed
  // =================================================================

  app.post('/schemas', { preHandler: app.requireScope('schemas:write') }, async (req, reply) => {
    const { name, schema, dialect } = req.body ?? {};
    if (!name || !schema) return reply.code(400).send({ error: 'name_and_schema_required' });
    const { envelope: env, cid } = await envelopeWithCid({
      kind: 'schema',
      tenantId: req.user.tenant,
      body: { name, schema, dialect: dialect ?? 'https://json-schema.org/draft/2020-12/schema' },
    });
    const row = await app.db.records.schemas.create(req.user.tenant, { cid, name, schema, dialect });
    reply.code(201);
    return { cid, name, created_at: row?.created_at ?? new Date().toISOString(), envelope: env };
  });

  app.get('/schemas/:cid', { preHandler: app.requireScope('schemas:read') }, async (req, reply) => {
    const s = await app.db.records.schemas.getByCid(req.params.cid);
    if (!s || s.tenant_id !== req.user.tenant) return reply.code(404).send({ error: 'not_found' });
    return s;
  });

  app.get('/schemas', { preHandler: app.requireScope('schemas:read') }, async (req) => {
    const results = await app.db.records.schemas.list(req.user.tenant);
    return { count: results.length, results };
  });
}

// -----------------------------------------------------------------
// Internal: evaluate a view → produce snapshot envelope + CID
// -----------------------------------------------------------------
async function evaluateView(app, tenantId, view, collection) {
  const { results } = await app.db.records.query({
    tenantId,
    collectionId: view.collection_id,
    filter: view.filter ?? {},
    projection: view.projection,
    sort: view.sort,
    limit: 1000,
  });
  const { envelope: env, cid } = await envelopeWithCid({
    kind: 'view-snapshot',
    tenantId,
    parentCid: view.head_cid ?? null,
    body: {
      view: view.name,
      collection: collection.name,
      filter: view.filter,
      projection: view.projection,
      sort: view.sort,
      evaluated_at: new Date().toISOString(),
      count: results.length,
      results: results.map((r) => ({ id: r.record_id, cid: r.cid })),
    },
  });
  await app.db.records.views.recordSnapshot({
    viewId: view.id, tenantId, cid, envelope: env, resultCount: results.length,
  });
}
