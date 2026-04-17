-- NDN IPFS Chain — model registry
-- Adds the `models` table referenced by api/server/src/db/models.js and
-- workers/hf-importer/src/index.js. Tenant-scoped, like every other table.

CREATE TABLE IF NOT EXISTS models (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,             -- e.g. "meta-llama/Llama-3-8B-Instruct"
  version       TEXT NOT NULL DEFAULT 'latest',
  root_cid      TEXT NOT NULL,             -- top-level CID for the model bundle
  shard_map     JSONB NOT NULL DEFAULT '{}',  -- { "model-00001-of-00003.safetensors": "bafy…", … }
  model_card    JSONB NOT NULL DEFAULT '{}',  -- { source, repo, license, tags, … }
  status        TEXT NOT NULL DEFAULT 'ready'
                CHECK (status IN ('importing','ready','failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS models_tenant_name_version_idx
  ON models(tenant_id, name, version);
CREATE INDEX IF NOT EXISTS models_tenant_created_idx
  ON models(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS models_root_cid_idx
  ON models(root_cid);
