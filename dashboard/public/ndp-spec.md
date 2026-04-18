# NDN Data Protocol (NDP) v1.0 — Specification

**Status:** Draft for public review
**Editor:** Ndibe Kefua — nkefua@ndnanalytics.com
**Repository:** `github.com/dnkefua/ndn-ipfs-chain`
**License:** CC-BY 4.0 (spec) / Apache-2.0 (reference implementation)
**Last updated:** April 2026

---

## Abstract

The **NDN Data Protocol (NDP)** is a unified, content-addressed data-access protocol for three distinct database workloads built on top of IPFS + Filecoin:

1. **Blobs DB** — arbitrary-byte pinning (files, media, raw payloads). Pinning Services v1.0 compatible.
2. **Models DB** — AI/ML model registry (weights + model cards + shard maps + direct-to-GPU streaming).
3. **Structured DB** — queryable JSON documents with schemas, collections, immutable versions, and content-addressed views.

NDP gives application developers a single authentication, tenancy, billing, and audit surface across all three, while each database type keeps its own data-shape semantics. Every addressable object in NDP — blob, model, record, schema, view — has a canonical Content Identifier (CID), making audit, verification, and cross-provider portability trivial.

The conformance terms **MUST**, **SHOULD**, and **MAY** are used per [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

---

## 1. Introduction

### 1.1 Motivation

Existing IPFS-adjacent data platforms occupy narrow slices:

- **Pinata, Web3.Storage, Filebase** — blobs only. No query. No schemas. No model semantics.
- **Tableland** — SQL-flavored structured data only. No blob or model handling.
- **HuggingFace Hub** — model registry only. Centralized. Not IPFS-native.
- **OrbitDB, Ceramic** — structured documents with heavy client complexity; no unified blob or model path.

Real applications need all three data shapes at once. A social app needs user records (structured) + avatars (blobs) + maybe an embedded LLM (model). A biomedical platform needs patient records (structured + encrypted) + DICOM images (blobs) + trained classifiers (models). Today, developers glue together 3+ providers; NDP collapses that into one protocol.

NDP is deliberately **storage-layer agnostic above the CID line**. A conforming implementation MUST use IPFS-compatible content addressing for every stored object; it MAY use Filecoin, Arweave, S3, or any hybrid as the persistence backend.

### 1.2 Design principles

1. **Content addressing is the identity model.** Every persistent object has a CID. CIDs are stable across providers and across time.
2. **Immutable by default, mutable by exception.** Records, model versions, schemas, and blobs are immutable. Collections, views, and model names are mutable pointers that resolve to a current CID.
3. **Canonicalization before hashing.** Two implementations producing the same logical content MUST produce the same CID. All JSON goes through [JCS (RFC 8785)](https://www.rfc-editor.org/rfc/rfc8785) prior to hashing.
4. **One auth, one tenant, one billing meter across three DBs.** Applications SHOULD NOT need separate credentials for each data shape.
5. **No open-core lock-in.** The reference implementation is Apache-2.0. Any conforming implementation is a legitimate NDP provider.
6. **Dog-fooded.** Schemas, views, and API keys themselves are stored as NDP records; the protocol eats its own output.

### 1.3 Terminology

| Term | Definition |
|---|---|
| **CID** | Content Identifier as specified by the [IPFS CID spec](https://github.com/multiformats/cid). v1 form with SHA-256 multihash unless otherwise noted. |
| **Envelope** | The canonical outer JSON object that wraps every addressable NDP item before hashing. See §2.2. |
| **Blob** | An arbitrary-byte payload with a CID. No schema. No query. |
| **Model** | A bundle of weight-file CIDs plus a model card plus a shard map. Addressed by a root CID. |
| **Record** | An immutable JSON document with a logical `id`, belonging to exactly one collection. |
| **Collection** | A named, mutable pointer that resolves to the current set of records in a namespace. |
| **View** | A content-addressed materialization of a query against a collection. |
| **Schema** | A JSON Schema document that records in a collection MUST validate against. |
| **Tenant** | The billing + isolation boundary. A single customer organization. |

---

## 2. Protocol overview

### 2.1 Three database types

| DB | Namespace | Primary payload | Primary access | Mutability |
|---|---|---|---|---|
| Blobs | `/v1/blobs` | raw bytes | by CID | immutable |
| Models | `/v1/models` | bundle DAG | by name+version OR CID | model names mutable; versions immutable |
| Structured | `/v1/records` | canonical JSON | by CID OR collection+id OR query | records immutable; collections + views mutable pointers |

A single NDP deployment MUST expose all three namespaces or declare which are absent via `GET /v1/_discovery`.

### 2.2 Common envelope

Every addressable NDP object — record, schema, view snapshot, model version, blob metadata — MUST be serialized as a canonical envelope:

```json
{
  "ndp":      "1",
  "kind":     "record | blob-meta | model-version | schema | view-snapshot | collection-head",
  "tenant":   "<uuid>",
  "created":  "<RFC-3339 timestamp>",
  "parent":   "<CID | null>",
  "body":     { ... kind-specific payload ... }
}
```

The envelope is canonicalized by [JCS (RFC 8785)](https://www.rfc-editor.org/rfc/rfc8785) and hashed with SHA-256. The resulting multihash becomes the object's CIDv1 with codec `0x55` (raw). Two implementations MUST produce byte-identical canonical forms for semantically equivalent inputs.

For blobs, the `body` payload is not the bytes themselves (which are stored raw and CID'd directly) but metadata about the blob: `{ "content_cid": "...", "size": 12345, "media_type": "image/png", "name": "...", "lifecycle": {...} }`.

### 2.3 CID canonicalization rules (normative)

- **Blob content**: raw bytes → SHA-256 → CIDv1 raw (codec `0x55`).
- **All envelopes** (records, blob-meta, schema, view-snapshot, model-version, collection-head): JSON → JCS → SHA-256 → CIDv1 raw.
- **Model bundles**: UnixFS directory DAG whose entries are `model_card.json` CID, `shard_map.json` CID, and individual weight-shard blob CIDs. Root CID follows UnixFS dag-pb codec (`0x70`).

Implementations MAY accept CIDv0 inputs for backward compatibility but MUST emit CIDv1 in responses.

### 2.4 Versioning model

| Object | Mutable? | How new versions are created |
|---|---|---|
| Blob content | No | New bytes → new CID. |
| Record | No | Each `PUT /records` with same `(collection, id)` creates a new envelope whose `parent` is the prior CID. |
| Model version | No | `POST /models/:name/versions` creates a new immutable version envelope. |
| Schema | No | Schemas are records in the reserved `_schemas` collection. New schema → new CID. Compatibility checking is the application's responsibility. |
| Collection head | Yes | A collection head is an envelope whose `body.record_index` maps logical IDs to their latest CIDs. The head is re-written on every record write; the tenant-scoped pointer `collection.head_cid` updates atomically. |
| View | Yes | Views maintain both a stable logical name and a `view.head_cid` that advances on query re-evaluation. Each historical snapshot remains retrievable by its CID. |
| Model name (`name/version` → CID) | Yes | The `(tenant, name, version) → root_cid` row in the registry is the mutable pointer; the root CID itself is immutable. |

Implementations MUST NOT garbage-collect historical CIDs for at least 90 days after they are superseded, unless the tenant explicitly requests deletion via the crypto-shredding API (§6.3).

---

## 3. The Blobs DB

### 3.1 Data model

A **blob** is an arbitrary-byte payload. It has exactly two on-the-wire representations:

- The **content** — the raw bytes, stored as a CIDv1 raw object.
- The **metadata envelope** — a canonical envelope with `kind = "blob-meta"` describing the blob's name, size, media type, lifecycle policy, and optional encryption wrapping.

The metadata envelope itself has a CID separate from the content CID. The two are correlated: `meta.body.content_cid` points at the content CID.

### 3.2 API surface

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/blobs` | Upload raw bytes. Returns `{ cid, size, meta_cid }`. |
| `GET` | `/v1/blobs/:cid` | Retrieve raw bytes. Supports `Range` headers. |
| `GET` | `/v1/blobs/:cid/meta` | Retrieve the metadata envelope. |
| `DELETE` | `/v1/blobs/:cid` | Unpin + crypto-shred if encrypted. |
| `GET` | `/v1/blobs` | List tenant blobs with pagination. |
| `POST` | `/v1/upload` | Tus resumable upload endpoint (returns final blob CID on completion). |

### 3.3 Pinning Services v1.0 compatibility

Every NDP implementation MUST also expose the [IPFS Pinning Services API v1.0](https://ipfs.github.io/pinning-services-api-spec/) under `/v1/pins` as an alias surface over the Blobs DB. Any existing IPFS tool that speaks Pinning Services v1.0 works against an NDP provider without modification.

---

## 4. The Models DB

### 4.1 Data model

A **model** consists of:

- **Weight shards** — one or more blobs (each a content CID), usually derived from safetensors, GGUF, or ONNX files.
- **Shard map** — a JSON object mapping logical shard names (e.g. `"model-00001-of-00003.safetensors"`) to their content CIDs and byte ranges. Serialized as an envelope with `kind = "shard-map"`.
- **Model card** — a JSON document describing the model (author, license, framework, architecture, training data lineage, evals, intended use). Serialized as an envelope with `kind = "model-card"`. SHOULD follow the [HuggingFace model-card schema](https://huggingface.co/docs/hub/model-card-appendix) where applicable.
- **Version envelope** — `kind = "model-version"` — ties together `model_card_cid`, `shard_map_cid`, and metadata. The version's CID is the addressable identity of this particular model version.
- **Root CID** — for DAG-walkable bundles, the UnixFS root over the version envelope + shard map + card + individual shards.

`(tenant, name, version) → root_cid` is the mutable pointer in the registry; the root_cid itself is immutable.

### 4.2 API surface

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/models` | Create a new model, referencing already-pinned weight CIDs. |
| `GET` | `/v1/models/:name` | List all versions of a model. |
| `GET` | `/v1/models/:name/:version` | Retrieve version envelope + shard map + card. |
| `POST` | `/v1/models/:name/versions` | Create a new version. |
| `GET` | `/v1/models/:name/:version/shards/:shard` | Retrieve a single shard by its logical name. |
| `GET` | `/v1/models/:name/:version/stream` | Direct weight streaming (§4.3). |
| `POST` | `/v1/models/import/huggingface` | Import a model from HuggingFace by repo ID. |
| `DELETE` | `/v1/models/:name/:version` | Remove the pointer; content remains CID-addressable until lifecycle policy expires. |

### 4.3 Direct-to-GPU streaming

The `GET /v1/models/:name/:version/stream` endpoint MUST support:

- HTTP `Range` requests for random access to any byte offset in any shard.
- Query parameter `?format=dmabuf` (experimental) for zero-copy delivery over a shared memory segment on localhost-only deployments.
- Query parameter `?shard=<name>` to stream a specific shard.
- Query parameter `?tensor=<path>` (experimental) to stream a single tensor by its dotted path (e.g. `model.layers.0.self_attn.q_proj.weight`).

A conforming client (e.g. PyTorch loader plugin) SHOULD fetch shards concurrently with bounded parallelism to saturate available bandwidth.

### 4.4 HuggingFace import

The `POST /v1/models/import/huggingface` endpoint accepts `{ repo_id, revision?, token? }` and:

1. Resolves the HuggingFace repo file list.
2. Downloads each file, pins it as a blob, computes its CID.
3. Builds a shard map from the file list.
4. Extracts or generates a model card.
5. Constructs the model-version envelope.
6. Returns `{ name, version, root_cid, status: "importing" | "ready" }`.

Large imports MUST run asynchronously; the endpoint returns `202 Accepted` with a job ID for polling.

---

## 5. The Structured DB

### 5.1 Data model

Four object types, in increasing scope:

- **Record** — an immutable JSON document. Envelope `kind = "record"`. Belongs to exactly one collection. Has a stable logical `id` (string, tenant-scoped unique within its collection).
- **Collection** — a named container for records. Has a current `head_cid` pointing at the latest collection-head envelope.
- **Schema** — a JSON Schema document that records in a collection MUST validate against (if the collection has a schema configured). Stored as a record in the reserved `_schemas` collection.
- **View** — a named, saved query + projection against a collection. Has a current `head_cid` pointing at the latest view-snapshot envelope.

Collection names and view names are tenant-scoped and MUST match `^[a-z][a-z0-9_]{2,62}$`. Names starting with `_` are reserved (`_schemas`, `_views`, `_meta`).

### 5.2 Immutability + versioning rules

- A record with `id = X` in collection `C` can be written repeatedly. Each write creates a new envelope whose `parent` field points at the CID of the prior version, forming a linked version chain.
- A `GET /v1/records/:collection/:id` without a version qualifier returns the latest envelope.
- A `GET /v1/records/:collection/:id?at=<cid>` returns the specific historical version.
- A `GET /v1/records/:collection/:id/history` returns the full version chain (most recent first).
- Deletion removes the collection-head pointer (record becomes unqueriable by id) but the CIDs remain retrievable until lifecycle-expired or crypto-shredded.

### 5.3 Query DSL

The query DSL is deliberately **Mongo-ish and small**. Implementations MUST support:

- Equality: `{ "field": value }`
- Comparison: `{ "field": { "$gt": n } }`, `$gte`, `$lt`, `$lte`, `$ne`
- Set: `{ "field": { "$in": [a, b, c] } }`, `$nin`
- Existence: `{ "field": { "$exists": true } }`
- Logical: `{ "$and": [ ... ] }`, `{ "$or": [ ... ] }`, `{ "$not": ... }`
- Nested paths via dot notation: `{ "address.city": "Seattle" }`

Implementations MAY support `$regex`, `$text`, `$near` (geo), and `$elemMatch` as extensions. Extensions MUST be declared in `GET /v1/_discovery`.

Example:

```http
POST /v1/collections/users/query
Content-Type: application/json

{
  "filter": { "email": "a@b.com", "age": { "$gte": 18 } },
  "projection": ["id", "email", "created_at"],
  "sort": { "created_at": -1 },
  "limit": 50,
  "cursor": "<opaque>"
}
```

Response:

```json
{
  "count": 3,
  "results": [ { "id": "...", "cid": "bafy...", "body": { } }, ... ],
  "next": "<opaque cursor | null>"
}
```

### 5.4 Content-addressed views

A **view** is a named, saved query. At any moment, a view's current result set is canonicalized and CID'd as a view-snapshot envelope. The tenant-scoped pointer `view.head_cid` updates on every re-evaluation.

This gives structured data a native IPFS-style retrieval mode alongside the familiar filter DSL:

- `GET /v1/views/:name` — current view state + head CID.
- `GET /v1/views/:cid` — historical view state by CID, even if the view has been re-evaluated many times since.
- `GET /v1/views/:name/stream` — Server-Sent Events stream of CID changes as the view is re-evaluated.

Views are cached by default; the cache key is the view's CID, and it is invalidated when the view re-evaluates.

A view is created via `POST /v1/views` with:

```json
{
  "name": "active_users_last_7d",
  "collection": "users",
  "filter": { "last_seen": { "$gte": "<iso-8601>" } },
  "projection": ["id", "email", "last_seen"],
  "refresh": "60s | on_write | manual"
}
```

### 5.5 Structured DB API surface

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/records` | Put a record into a collection. Body: `{ collection, id?, body, schema_cid? }`. |
| `GET` | `/v1/records/:cid` | Retrieve an envelope by its CID. |
| `GET` | `/v1/records/:collection/:id` | Retrieve the latest version of a record by logical id. |
| `GET` | `/v1/records/:collection/:id/history` | Full version chain. |
| `DELETE` | `/v1/records/:collection/:id` | Remove the collection-head entry. |
| `POST` | `/v1/collections` | Create a collection (optionally with `schema_cid`). |
| `GET` | `/v1/collections` | List collections. |
| `GET` | `/v1/collections/:name` | Collection metadata + current `head_cid`. |
| `POST` | `/v1/collections/:name/query` | Mongo-ish filter query. |
| `POST` | `/v1/views` | Create a view. |
| `GET` | `/v1/views/:name` | Current view state. |
| `GET` | `/v1/views/:cid` | Historical view state by CID. |
| `POST` | `/v1/schemas` | Register a schema (creates a record in `_schemas`). |
| `GET` | `/v1/schemas/:cid` | Retrieve a schema by CID. |

### 5.6 Schemas

Collections MAY declare a `schema_cid`. When set:

- Every `POST /v1/records` into that collection MUST validate against the schema (JSON Schema Draft 2020-12).
- Schema upgrades are done by creating a new schema record (new CID) and atomically re-pointing the collection to it. Existing records are not retroactively re-validated.
- Migrations between incompatible schemas are an application concern; NDP provides the primitives (historical CIDs, full version chain) but no automatic migration.

---

## 6. Cross-cutting concerns

### 6.1 Authentication & scopes

NDP implementations MUST support at least one of:

- **API keys** — opaque tokens with scoped permissions.
- **JWT (RS256)** — for longer-lived browser-side sessions.
- **SIWE** — Sign-In With Ethereum for dApp developers.

Scopes are fine-grained per DB and action:

- `blobs:read`, `blobs:write`, `blobs:admin`
- `models:read`, `models:write`, `models:admin`
- `records:read`, `records:write`, `records:admin`
- `views:read`, `views:write`
- `schemas:read`, `schemas:write`

A key or JWT MAY carry any subset of scopes.

### 6.2 Tenant isolation

Every persistent row and every cache key MUST include the tenant UUID. Cross-tenant reads MUST be impossible via the API; implementations SHOULD enforce this at the SQL layer (row-level security or query-builder enforcement) in addition to at the application layer.

### 6.3 Encryption + crypto-shredding

NDP supports client-side AES-256-GCM encryption with per-tenant envelope keys (KMS-managed):

- Blobs: SDK encrypts the payload before hashing. The stored CID is the CID of ciphertext. The envelope's metadata records the wrapping envelope-key ID.
- Records: individual field-level encryption via a `$encrypt: true` marker; the rest of the envelope remains queryable.
- Models: weight shards MAY be encrypted; the shard map records per-shard key IDs.

**Crypto-shredding**: deleting the envelope key renders all ciphertext addressed by the affected CIDs permanently unreadable, satisfying GDPR right-to-erasure requirements on immutable storage.

### 6.4 Audit log

Every mutating API call MUST produce an audit-log entry with `(tenant, user, action, target_cid, timestamp, request_digest)`. Audit-log entries SHOULD be themselves stored as NDP records in the reserved `_audit` collection and their daily root CID anchored to an L2 blockchain for tamper-evidence.

### 6.5 Billing

NDP-conforming implementations MUST expose metering granularity per DB:

- Blobs: bytes stored, bytes egressed, pin-count.
- Models: total weight GB pinned, inference-retrieval GB.
- Structured: record count, query count, view evaluations.

Tenants SHOULD receive one unified invoice across all three DBs.

---

## 7. Conformance

A conforming NDP implementation MUST:

1. Expose all three DB namespaces (Blobs, Models, Structured) under `/v1/blobs`, `/v1/models`, `/v1/records`, OR expose `/v1/_discovery` declaring which are absent.
2. Produce CIDs via the canonicalization rules in §2.3. Cross-implementation CID equivalence for identical inputs MUST hold.
3. Pass the [Pinning Services API v1.0 conformance suite](https://github.com/dnkefua/pinning-services-conformance) for the Blobs DB.
4. Support the full query DSL in §5.3. Extensions MUST be declared in `/v1/_discovery`.
5. Support content-addressed views per §5.4.
6. Enforce tenant isolation at the row-store level.
7. Provide at least one of the authentication methods in §6.1.

An NDP implementation SHOULD:

- Support client-side encryption and crypto-shredding per §6.3.
- Anchor audit-log roots to a public blockchain.
- Offer direct-to-GPU model streaming.

---

## 8. Security considerations

- **CID collision resistance** — SHA-256 provides 128-bit collision resistance. Deployments storing > 2^64 objects per tenant SHOULD migrate to SHA-512.
- **Canonicalization attacks** — JCS is deterministic; any deviation from RFC 8785 WILL cause CID divergence. Implementations MUST use a conformant JCS library.
- **Reserved collection names** — `_schemas`, `_views`, `_audit`, `_meta` are privileged. Mutations MUST go through privileged endpoints, not `POST /v1/records`.
- **Untrusted schema URIs** — schemas referenced by `$ref` to external URIs are a network-dependency attack surface. Implementations SHOULD resolve external `$ref` against a cached, CID-addressed copy only.
- **Abuse content on free gateways** — see the reference implementation's abuse policy and CID blocklist integration.

---

## 9. Open questions / future work

- **Cross-tenant shared schemas** — a read-only public schema registry is appealing but requires a trust model not yet specified.
- **GraphQL surface** — a second query surface alongside the Mongo-ish DSL is planned for v2.
- **Geographic residency locks** at the record level (collection-level is straightforward; per-record is not).
- **Live views over large collections** — current design re-evaluates views on a schedule or on-write; true streaming materialized-view semantics are an open research question.
- **Inter-provider record portability** — tenant-scoped `export` endpoint returning a CAR file of all envelopes is in scope for v1.1.

---

## Appendix A — Example envelopes

### A.1 A record

Request:
```http
POST /v1/records
Content-Type: application/json
Authorization: Bearer ndk_...

{
  "collection": "users",
  "id": "u_7f3c1",
  "body": { "email": "kefua@example.com", "plan": "pro", "created_at": "2026-04-18T12:00:00Z" }
}
```

Canonical envelope (after server adds tenant + timestamps):
```json
{
  "ndp": "1",
  "kind": "record",
  "tenant": "9f2b7...",
  "created": "2026-04-18T12:00:00.000Z",
  "parent": null,
  "body": {
    "collection": "users",
    "id": "u_7f3c1",
    "data": { "email": "kefua@example.com", "plan": "pro", "created_at": "2026-04-18T12:00:00Z" }
  }
}
```

Response:
```json
{ "cid": "bafkreib3...", "collection": "users", "id": "u_7f3c1", "version": 1 }
```

### A.2 A view snapshot

```json
{
  "ndp": "1",
  "kind": "view-snapshot",
  "tenant": "9f2b7...",
  "created": "2026-04-18T12:01:00.000Z",
  "parent": "bafkreih...",
  "body": {
    "view": "active_users_last_7d",
    "collection": "users",
    "filter": { "last_seen": { "$gte": "2026-04-11T00:00:00Z" } },
    "evaluated_at": "2026-04-18T12:01:00.000Z",
    "results": [
      { "id": "u_7f3c1", "cid": "bafkreib3..." },
      { "id": "u_9a2d5", "cid": "bafkreic2..." }
    ],
    "count": 2
  }
}
```

### A.3 A model version

```json
{
  "ndp": "1",
  "kind": "model-version",
  "tenant": "9f2b7...",
  "created": "2026-04-18T12:02:00.000Z",
  "parent": null,
  "body": {
    "name": "meta-llama/Llama-3-8B-Instruct",
    "version": "v1.0",
    "model_card_cid": "bafkreiab...",
    "shard_map_cid": "bafkreicd...",
    "total_size": 16072318976,
    "framework": "pytorch",
    "license": "llama3"
  }
}
```

---

## Appendix B — Reference SQL schema (Postgres 15+)

See [`api/server/src/db/migrations/003_records.sql`](../api/server/src/db/migrations/003_records.sql) in the reference implementation for the full schema for the Structured DB. Blobs and Models migrations are `001_init.sql` and `002_models.sql` respectively.

---

## Appendix C — Discovery document

```http
GET /v1/_discovery
```

```json
{
  "ndp_version": "1.0",
  "provider": "ndn-ipfs-chain",
  "provider_version": "0.4.0",
  "databases": {
    "blobs":      { "enabled": true, "pinning_services_api": "v1.0" },
    "models":     { "enabled": true, "streaming": ["chunked", "range"] },
    "structured": { "enabled": true, "query_extensions": ["$regex"], "views": true }
  },
  "auth_methods": ["api_key", "jwt", "siwe"],
  "cid_codecs": ["raw", "dag-pb"],
  "hash_functions": ["sha-256"]
}
```

---

*End of specification.*
