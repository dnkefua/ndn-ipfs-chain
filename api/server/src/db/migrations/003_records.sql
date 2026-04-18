-- NDN IPFS Chain — Structured DB (NDP §5)
-- Adds collections, records (immutable envelopes), schemas, and views.
-- All objects are content-addressed; CIDs are the stable identity.
-- Mutable pointers (collection.head_cid, view.head_cid) track the "current" state.

-- ---------------------------------------------------------------
-- collections — named, tenant-scoped containers for records
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL
               CHECK (name ~ '^[a-z][a-z0-9_]{2,62}$'
                      OR name IN ('_schemas', '_views', '_audit', '_meta')),
  schema_cid   TEXT,                                  -- optional: JSON Schema CID
  head_cid     TEXT,                                  -- current collection-head envelope CID
  record_count BIGINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS collections_tenant_name_idx
  ON collections(tenant_id, name);

-- ---------------------------------------------------------------
-- records — immutable envelopes. Each write creates a new row
-- whose parent_cid points at the prior version (version chain).
-- The (tenant_id, collection_id, record_id) triple identifies
-- the logical record; cid identifies the specific version.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS records (
  cid           TEXT PRIMARY KEY,                      -- CIDv1 of the canonical envelope
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  record_id     TEXT NOT NULL,                         -- logical ID, stable across versions
  parent_cid    TEXT,                                  -- prior version CID (null for v1)
  body          JSONB NOT NULL,                        -- the envelope.body (full JSON doc)
  envelope      JSONB NOT NULL,                        -- the full canonical envelope
  version       INTEGER NOT NULL DEFAULT 1,            -- monotonic per record_id
  is_head       BOOLEAN NOT NULL DEFAULT TRUE,         -- true only for the latest version
  size_bytes    INTEGER NOT NULL,                      -- canonical envelope size
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS records_tenant_collection_idx
  ON records(tenant_id, collection_id);
CREATE INDEX IF NOT EXISTS records_collection_record_idx
  ON records(collection_id, record_id, version DESC);
CREATE UNIQUE INDEX IF NOT EXISTS records_head_idx
  ON records(collection_id, record_id)
  WHERE is_head = TRUE;
CREATE INDEX IF NOT EXISTS records_parent_idx
  ON records(parent_cid) WHERE parent_cid IS NOT NULL;
-- GIN index lets us run the Mongo-ish query DSL against `body` at Postgres speed.
CREATE INDEX IF NOT EXISTS records_body_gin_idx
  ON records USING GIN (body jsonb_path_ops);
CREATE INDEX IF NOT EXISTS records_created_idx
  ON records(tenant_id, created_at DESC);

-- ---------------------------------------------------------------
-- schemas — JSON Schema documents, stored as records in a virtual
-- _schemas collection per tenant, but surfaced here for query ease.
-- The `schema_cid` column on `collections` points into this table.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schemas (
  cid         TEXT PRIMARY KEY,                        -- CIDv1 of the schema envelope
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                           -- human-readable label
  schema      JSONB NOT NULL,                          -- the JSON Schema document itself
  dialect     TEXT NOT NULL DEFAULT 'https://json-schema.org/draft/2020-12/schema',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schemas_tenant_name_idx
  ON schemas(tenant_id, name);

-- ---------------------------------------------------------------
-- views — named, saved queries over a collection. Each evaluation
-- produces a view-snapshot envelope (content-addressed); head_cid
-- tracks the most recent evaluation.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS views (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL
                  CHECK (name ~ '^[a-z][a-z0-9_]{2,62}$'),
  collection_id   UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  filter          JSONB NOT NULL DEFAULT '{}'::jsonb,
  projection      TEXT[] NOT NULL DEFAULT '{}',
  sort            JSONB,                               -- { "field": 1|-1 }
  refresh_mode    TEXT NOT NULL DEFAULT 'on_write'
                  CHECK (refresh_mode IN ('on_write', 'interval', 'manual')),
  refresh_seconds INTEGER,                             -- required when refresh_mode='interval'
  head_cid        TEXT,                                -- CID of the most recent snapshot
  last_evaluated  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS views_tenant_name_idx
  ON views(tenant_id, name);

-- ---------------------------------------------------------------
-- view_snapshots — every evaluation of a view is archived here by
-- its CID so `GET /v1/views/:cid` can serve historical snapshots.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS view_snapshots (
  cid          TEXT PRIMARY KEY,
  view_id      UUID NOT NULL REFERENCES views(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  envelope     JSONB NOT NULL,                         -- full view-snapshot envelope
  result_count INTEGER NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS view_snapshots_view_idx
  ON view_snapshots(view_id, evaluated_at DESC);

-- ---------------------------------------------------------------
-- Touch `updated_at` on collections whenever rows change.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS collections_touch_updated_at ON collections;
CREATE TRIGGER collections_touch_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
