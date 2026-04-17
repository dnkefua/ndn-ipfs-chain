-- NDN IPFS Chain — initial schema
-- Every query in the data-access layer scopes by tenant_id; never drop this.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ────────────────────────────────────────────────────────────────────────
-- Tenants, users, teams, API keys
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'free'
                CHECK (plan IN ('free','pro','team','enterprise')),
  stripe_id     TEXT,
  wallet_addr   TEXT,
  region_lock   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  wallet_addr   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX users_tenant_idx ON users(tenant_id);

CREATE TABLE teams (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE team_members (
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL
                CHECK (role IN ('owner','admin','developer','viewer','billing')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  hash          TEXT NOT NULL UNIQUE,     -- sha-256 hex
  prefix        TEXT NOT NULL,            -- 'ndn_live_abcd…' last-displayed prefix
  scopes        TEXT[] NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ
);
CREATE INDEX api_keys_tenant_idx ON api_keys(tenant_id);
CREATE INDEX api_keys_hash_idx   ON api_keys(hash) WHERE revoked_at IS NULL;

-- ────────────────────────────────────────────────────────────────────────
-- Pins + replicas + Filecoin deals
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE pins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cid           TEXT NOT NULL,
  name          TEXT,
  status        TEXT NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued','pinning','pinned','failed')),
  tier          TEXT NOT NULL DEFAULT 'hot'
                CHECK (tier IN ('hot','warm','cold','glacier')),
  region        TEXT,
  replication   SMALLINT NOT NULL DEFAULT 3,
  size_bytes    BIGINT,
  encryption    BOOLEAN NOT NULL DEFAULT FALSE,
  key_id        UUID,
  lifecycle     TEXT,
  meta          JSONB NOT NULL DEFAULT '{}',
  last_access   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX pins_tenant_cid_idx ON pins(tenant_id, cid);
CREATE INDEX pins_status_idx   ON pins(status);
CREATE INDEX pins_tier_idx     ON pins(tier);
CREATE INDEX pins_lifecycle_idx ON pins(lifecycle) WHERE lifecycle IS NOT NULL;
CREATE INDEX pins_created_idx  ON pins(tenant_id, created_at DESC);

CREATE TABLE pin_replicas (
  pin_id        UUID NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  peer_id       TEXT NOT NULL,
  region        TEXT NOT NULL,
  az            TEXT,
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pin_id, peer_id)
);

CREATE TABLE filecoin_deals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin_id        UUID NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  deal_id       BIGINT NOT NULL,
  provider      TEXT NOT NULL,
  piece_cid     TEXT NOT NULL,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at    TIMESTAMPTZ NOT NULL,
  last_post     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX filecoin_deals_pin_idx ON filecoin_deals(pin_id);
CREATE INDEX filecoin_deals_expiry  ON filecoin_deals(expires_at);

-- ────────────────────────────────────────────────────────────────────────
-- Encryption envelope keys (wrapping handled by Vault/KMS; we store the wrap)
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE envelope_keys (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  algorithm     TEXT NOT NULL DEFAULT 'AES-256-GCM',
  wrapped       BYTEA NOT NULL,  -- Vault-transit wrapped key material
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  shredded_at   TIMESTAMPTZ,
  shred_tx_hash TEXT,
  shred_chain   TEXT
);
CREATE INDEX envelope_keys_tenant_idx ON envelope_keys(tenant_id);

-- ────────────────────────────────────────────────────────────────────────
-- Lifecycle policies
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE lifecycle_policies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  rules         JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX lifecycle_tenant_idx ON lifecycle_policies(tenant_id);

-- ────────────────────────────────────────────────────────────────────────
-- Smart-contract triggers
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE triggers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  chain         TEXT NOT NULL
                CHECK (chain IN ('ethereum','polygon','arbitrum','base','optimism','avalanche','solana')),
  contract      TEXT NOT NULL,
  event         TEXT NOT NULL,
  cid_field     TEXT NOT NULL,
  filter        JSONB NOT NULL DEFAULT '{}',
  policy        JSONB NOT NULL DEFAULT '{}',
  last_block    BIGINT,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX triggers_tenant_idx ON triggers(tenant_id);
CREATE INDEX triggers_chain_idx  ON triggers(chain) WHERE enabled;

-- ────────────────────────────────────────────────────────────────────────
-- Usage metering — hourly aggregates, rolled up nightly into daily/monthly
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE usage_hourly (
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hour          TIMESTAMPTZ NOT NULL,
  storage_hot_gb_h      DOUBLE PRECISION NOT NULL DEFAULT 0,
  storage_warm_gb_h     DOUBLE PRECISION NOT NULL DEFAULT 0,
  storage_cold_gb_h     DOUBLE PRECISION NOT NULL DEFAULT 0,
  storage_glacier_gb_h  DOUBLE PRECISION NOT NULL DEFAULT 0,
  egress_gb             DOUBLE PRECISION NOT NULL DEFAULT 0,
  requests_read         BIGINT NOT NULL DEFAULT 0,
  requests_write        BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, hour)
);

-- ────────────────────────────────────────────────────────────────────────
-- Audit log — every admin action, Merkle-anchored daily
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID,
  action        TEXT NOT NULL,
  resource      TEXT NOT NULL,
  resource_id   TEXT,
  payload       JSONB NOT NULL DEFAULT '{}',
  ip            INET,
  at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_tenant_at_idx ON audit_log(tenant_id, at DESC);

-- ────────────────────────────────────────────────────────────────────────
-- Cluster peers (for placement policy)
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE cluster_peers (
  peer_id       TEXT PRIMARY KEY,
  region        TEXT NOT NULL,
  az            TEXT NOT NULL,
  carrier       TEXT,
  disk_free_gb  DOUBLE PRECISION,
  healthy       BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cluster_peers_region_idx ON cluster_peers(region) WHERE healthy;
