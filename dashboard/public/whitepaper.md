# NDN IPFS Chain — White Paper
## Enterprise IPFS for the AI Era
### Version 1.2 — April 2026

---

## Executive Summary

The IPFS ecosystem has solved blob pinning. Pinata, Web3.Storage, and Filebase all pin bytes reliably. What they do not solve — and what production teams consistently need — is the full data stack: blob pinning *plus* a content-addressed model registry *plus* queryable structured records, all under one authentication surface, one billing meter, and one audit trail.

Today a team building a biomedical platform routes patient records through a relational database, DICOM images through a blob pinner, and trained classifiers through HuggingFace. Three providers. Three auth tokens. Three billing surfaces. No unified CID story. When GDPR demands erasure, they face the impossibility of "delete from immutable storage" with no cryptographic primitive to fall back on.

The **NDN Data Protocol (NDP) v1.0** is a specification that collapses this stack. One protocol envelope — JCS (RFC 8785) → SHA-256 → CIDv1 raw — spans three database workloads: **Blobs** (Pinning Services v1.0 superset), **Models** (chunked weight shards + range-addressable streaming), and **Structured Records** (immutable version chains, Mongo-ish query DSL, content-addressed views). A single `/v1/_discovery` endpoint advertises which data planes a given deployment exposes; any conforming implementation is a valid NDP provider.

**NDN IPFS Chain** is the reference implementation of NDP v1.0 (Apache-2.0). As of April 2026 the API is live on Google Cloud Run, the Structured DB migration is deployed, and the full three-plane API surface (`/v1/pins`, `/v1/models`, `/v1/records`) is accepting traffic. The spec and implementation are the primary deliverable in NDN Analytics' active application for an IPFS Foundation grant.

This white paper describes the problem, the protocol design, the three data planes, security posture, competitive landscape, and roadmap through the four grant milestones.

---

## 1. The Problem

### 1.1 Three unrelated protocol stacks today

Production IPFS applications today assemble a patchwork from three separate tool families, none of which interoperate at the protocol level.

**Blob pinning (Pinata, Web3.Storage, Filebase, Fleek).**
The IPFS Pinning Services API v1.0 standardized blob pinning across providers — a genuine success. But it stops at bytes. No query. No schema enforcement. No model semantics. A team that needs structured data or model weights on top of blob storage is on their own.

Concrete friction: a dApp developer who pins their NFT metadata blobs with Pinata and their user records with Postgres has no single content-addressed audit trail. The CID world and the relational world are two separate universes. Switching blob providers requires re-pinning and updating every app reference manually.

**AI/ML model weights (HuggingFace Hub, custom S3 buckets).**
Model weights are not blobs in any useful sense. A 70B-parameter model consists of hundreds of weight shards, a shard map, a model card, framework metadata, and eval results. Today there is no standard content-addressed format for this. HuggingFace Hub is centralized. Storing model weights in S3 gives no CID. The consequence: ML teams cannot pin a specific version of a model to IPFS and guarantee that an inference server in another region retrieves byte-identical weights. Reproducibility fails at the storage layer.

Concrete friction: a team that trains a new model version, publishes it to HuggingFace, and wants to mirror it to IPFS must write a bespoke download-and-pin script, manage shard ordering, and construct a shard map by hand. Nothing in the current IPFS tooling stack handles this.

**Structured and queryable content-addressed data (Tableland, Ceramic, OrbitDB).**
Structured data platforms on IPFS exist but are fragmented and narrow. Tableland offers SQL-flavored structured data with no blob or model handling. Ceramic gives mutable documents with heavy client complexity. OrbitDB is embedded-only. None expose a standard content-addressed envelope that produces the same CID for the same logical record across two independent implementations.

Concrete friction: a compliance team that needs to prove "this exact dataset was in this exact state at this timestamp" has no content-addressed primitive for structured records. A hash of a Postgres row is not an IPFS CID. Tableland's row hashes are not reproducible by an independent party. The audit trail is implementation-specific.

### 1.2 The consequence

Teams either abandon IPFS for the hard cases or build one-off glue layers that lock them into a specific implementation. Neither outcome serves the ecosystem.

---

## 2. The NDP Thesis

### 2.1 One envelope, three data planes, single control plane

The **NDN Data Protocol** makes one claim: every persistent object that a production application needs — blob, model version, structured record, schema, view snapshot — can be expressed as a canonical JSON envelope, hashed deterministically, and addressed by a CIDv1. From that foundation, three data planes emerge naturally, each with its own API surface and semantics, all sharing one authentication model, one tenant isolation boundary, one billing meter, and one audit trail.

The three data planes are:

| Data plane | Namespace | Primary payload |
|---|---|---|
| Blobs | `/v1/blobs` | raw bytes |
| Models | `/v1/models` | UnixFS DAG of weight shards + shard map + model card |
| Structured Records | `/v1/records` | canonical JSON documents |

A deployment MAY implement all three or declare partial support via `GET /v1/_discovery`.

### 2.2 Architecture

```
Clients
  │
  ├── POST /v1/auth  ─────────────────────────────────────────── API keys / JWT / SIWE
  │
  ▼
API Gateway (Fastify, Cloud Run us-west1)
  │
  ├── /v1/blobs ──────────────────────────────────────────────── Blob storage
  │     └── /v1/pins  (Pinning Services v1.0 alias)             │
  │                                                              ▼
  ├── /v1/models ─────────────────────────────────────────── IPFS Cluster
  │     └── /v1/models/import/huggingface                       │
  │                                                              ├── Hot tier (NVMe)
  ├── /v1/records ────────────────────────────────────────────── │
  │     ├── /v1/collections                                      ├── Filecoin cold archival
  │     ├── /v1/views                                            │
  │     └── /v1/schemas                                          └── Postgres 16 (Cloud SQL)
  │                                                                    (records, schemas,
  └── /v1/_discovery ──────── capability advertisement                  views, audit log)
```

All three data planes share:
- Tenant-scoped authentication with fine-grained scopes
- Row-level tenant isolation enforced at the SQL layer
- A unified audit log stored as NDP records in the reserved `_audit` collection
- AES-256-GCM envelope encryption with KMS-managed keys
- Crypto-shredding: delete the envelope key → affected CIDs become permanently unreadable

---

## 3. Canonicalization and Identity

### 3.1 Why canonicalization matters

Two implementations that produce different CIDs for the same logical record are not interoperable. Cross-provider portability requires deterministic hashing, which requires deterministic serialization. JSON as normally written is not deterministic: key ordering is undefined, whitespace is optional, numbers may be represented differently.

NDP resolves this by mandating **JCS (JSON Canonicalization Scheme, RFC 8785)** as the serialization step before hashing. JCS guarantees that semantically equivalent JSON objects produce byte-identical canonical forms, regardless of the originating language, library, or key insertion order. Any two NDP implementations applying JCS to the same logical content MUST produce the same CIDv1.

### 3.2 Canonicalization rules (normative)

| Object type | Canonical path |
|---|---|
| Blob content | raw bytes → SHA-256 → CIDv1 raw (codec `0x55`) |
| All envelopes (records, blob-meta, schema, view-snapshot, model-version, collection-head) | JSON → JCS (RFC 8785) → SHA-256 → CIDv1 raw |
| Model bundles | UnixFS directory DAG (dag-pb codec `0x70`) over version envelope + shard map + card + individual shard blobs |

Implementations MUST emit CIDv1 in all responses. CIDv0 inputs MAY be accepted for backward compatibility.

### 3.3 The canonical envelope

Every addressable NDP object is wrapped in a common envelope before canonicalization:

```json
{
  "ndp":     "1",
  "kind":    "record | blob-meta | model-version | schema | view-snapshot | collection-head",
  "tenant":  "<uuid>",
  "created": "<RFC-3339 timestamp>",
  "parent":  "<CID | null>",
  "body":    { }
}
```

The `parent` field links each object to its predecessor, forming a content-addressed version chain. The `tenant` field is part of the canonical form: two tenants storing identical content produce different CIDs, which is the correct behavior for multi-tenant isolation.

A full worked example (request → envelope → response) is in Appendix A of `specs/ndp_protocol.md`.

---

## 4. The Three Data Planes

### 4.1 Blobs

**What it is.** The Blobs data plane handles arbitrary-byte payloads. It is a strict superset of the IPFS Pinning Services API v1.0: every existing tool that speaks Pinning Services v1.0 works against an NDP provider at `/v1/pins` without modification.

**What NDP adds over raw pinning:**

- **Tiered storage with lifecycle policies.** Pins can be tagged `tier=hot`, `tier=cold`, or `tier=filecoin`. Lifecycle rules like `hot-7d-then-cold` or `filecoin-after-cold-90d` execute automatically.
- **Replication control.** Per-pin replication factor (default 3, enterprise 5–9 across regions) declared at pin time. IPFS Cluster enforces CRDT-synchronized pinset consensus.
- **Envelope encryption.** SDK encrypts the payload (AES-256-GCM) before upload. The stored CID is the CID of ciphertext. The metadata envelope records the KMS key ID used for wrapping.
- **Resumable upload.** `POST /v1/upload` is a Tus endpoint. Large files survive network interruptions; the final blob CID is returned on completion.
- **Metadata envelope.** Every blob has a `kind = "blob-meta"` envelope with name, size, media type, and lifecycle policy — also CID-addressed, versioned, and auditable.

**API surface:**

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/blobs` | Upload raw bytes. Returns `{ cid, size, meta_cid }`. |
| `GET` | `/v1/blobs/:cid` | Retrieve raw bytes. Supports `Range` headers. |
| `GET` | `/v1/blobs/:cid/meta` | Retrieve metadata envelope. |
| `DELETE` | `/v1/blobs/:cid` | Unpin and crypto-shred if encrypted. |
| `POST` | `/v1/upload` | Tus resumable upload. |
| `GET` | `/v1/pins` | Pinning Services API v1.0 alias. |

### 4.2 Models

**What it is.** The Models data plane is a content-addressed AI/ML model registry. A model is not a blob — it is a structured bundle: weight shards (one or more CID-addressed raw blobs), a shard map (logical names → CIDs + byte ranges), a model card (author, license, framework, eval results, training data lineage), and a version envelope that ties the bundle together. The version's CID is the addressable identity of that specific model version. The `(tenant, name, version) → root_cid` row is the mutable pointer; the root CID itself is immutable.

**What NDP adds over HuggingFace Hub or raw S3:**

- **Content addressing for every shard.** Each weight shard is pinned as a CIDv1 raw blob. The shard map, model card, and version envelope are canonical NDP envelopes. Every component of the model is independently verifiable.
- **UnixFS DAG-walkable bundles.** The root CID is a UnixFS directory DAG — compatible with standard IPFS tools, DAG walkers, and gateway retrieval.
- **Versioning via CID tags.** `(name, version)` is a mutable pointer to an immutable root CID. Incrementing the version never mutates historical CIDs.
- **Range-addressable streaming.** The `stream` endpoint supports HTTP `Range` requests for random access to any byte offset in any shard. A PyTorch loader can fetch shards concurrently with bounded parallelism to saturate available bandwidth.
- **Tensor-level retrieval (experimental).** `?tensor=<path>` streams a single tensor by its dotted path (e.g. `model.layers.0.self_attn.q_proj.weight`) without downloading the entire model.
- **HuggingFace import.** `POST /v1/models/import/huggingface` accepts `{ repo_id, revision?, token? }`, resolves the file list, pins each shard, builds the shard map, extracts or generates the model card, and constructs the version envelope. Large imports run asynchronously (`202 Accepted`, job ID for polling).

**API surface:**

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/models` | Create a model referencing already-pinned shard CIDs. |
| `GET` | `/v1/models/:name` | List all versions. |
| `GET` | `/v1/models/:name/:version` | Retrieve version envelope + shard map + model card. |
| `POST` | `/v1/models/:name/versions` | Create a new version. |
| `GET` | `/v1/models/:name/:version/shards/:shard` | Retrieve a shard by logical name. |
| `GET` | `/v1/models/:name/:version/stream` | Range-addressable weight streaming. |
| `POST` | `/v1/models/import/huggingface` | Import from HuggingFace by repo ID. |
| `DELETE` | `/v1/models/:name/:version` | Remove the registry pointer (CID remains). |

### 4.3 Structured Records

**What it is.** The Structured Records data plane handles queryable JSON documents with schemas, immutable version chains, collections, and content-addressed views. Records are immutable: each write with the same `(collection, id)` pair creates a new envelope whose `parent` points at the prior CID, forming a linked version chain. Historical versions are always retrievable by CID.

**Data model:**

| Object | Mutability | Description |
|---|---|---|
| Record | Immutable | One JSON document per write. Envelope `kind = "record"`. Stable logical `id` within a collection. |
| Collection | Mutable pointer | Named container. `head_cid` points at the latest collection-head envelope and updates atomically on each write. |
| Schema | Immutable (records in `_schemas`) | JSON Schema Draft 2020-12. Collections MAY declare a `schema_cid`; records MUST validate on write. |
| View | Mutable pointer | Named saved query. `head_cid` advances on each re-evaluation. Every historical snapshot is CID-addressable. |

**What NDP adds over Tableland, Ceramic, or a raw Postgres instance:**

- **Immutable version chain.** Every record write is a new CID. Historical versions are never garbage-collected without explicit tenant request. The full history is retrievable via `GET /v1/records/:collection/:id/history`.
- **Mongo-ish query DSL.** Implementations MUST support: equality, comparison (`$gt`, `$gte`, `$lt`, `$lte`, `$ne`), set membership (`$in`, `$nin`), existence (`$exists`), logical operators (`$and`, `$or`, `$not`), and dot-path notation for nested fields. Extensions (`$regex`, `$text`, `$near`) MUST be declared in `GET /v1/_discovery`.
- **JSON Schema Draft 2020-12 enforcement.** When a collection has a `schema_cid` set, every `POST /v1/records` validates against the schema before persisting. Schema upgrades are done by creating a new schema record (new CID) and atomically re-pointing the collection.
- **Content-addressed views.** A view is a named saved query whose current result set is canonicalized and CID'd as a `view-snapshot` envelope. `view.head_cid` advances on every re-evaluation. Three refresh modes: `on_write` (re-evaluate on every matching record write), `interval` (e.g. `"60s"`), and `manual`. Every historical snapshot remains retrievable by its CID; `GET /v1/views/:name/stream` delivers CID changes via Server-Sent Events.

**Example query (Mongo-ish DSL):**

```http
POST /v1/collections/users/query
Content-Type: application/json
Authorization: Bearer ndk_...

{
  "filter": {
    "$and": [
      { "age": { "$gte": 18 } },
      { "plan": { "$in": ["pro", "enterprise"] } },
      { "address.city": "Lagos" }
    ]
  },
  "projection": ["id", "email", "plan"],
  "sort": { "created_at": -1 },
  "limit": 50
}
```

**API surface:**

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/records` | Write a record. Body: `{ collection, id?, body, schema_cid? }`. |
| `GET` | `/v1/records/:cid` | Retrieve any envelope by CID. |
| `GET` | `/v1/records/:collection/:id` | Latest version by logical id. |
| `GET` | `/v1/records/:collection/:id?at=<cid>` | Specific historical version. |
| `GET` | `/v1/records/:collection/:id/history` | Full version chain (most recent first). |
| `DELETE` | `/v1/records/:collection/:id` | Remove collection-head entry. CID remains retrievable. |
| `POST` | `/v1/collections` | Create a collection (optionally with `schema_cid`). |
| `GET` | `/v1/collections/:name` | Collection metadata + current `head_cid`. |
| `POST` | `/v1/collections/:name/query` | Mongo-ish filter query. |
| `POST` | `/v1/views` | Create a view. |
| `GET` | `/v1/views/:name` | Current view state + head CID. |
| `GET` | `/v1/views/:cid` | Historical snapshot by CID. |
| `GET` | `/v1/views/:name/stream` | SSE stream of head CID changes. |
| `POST` | `/v1/schemas` | Register a schema (creates record in `_schemas`). |
| `GET` | `/v1/schemas/:cid` | Retrieve a schema by CID. |

---

## 5. Why Now

IPFS is ready for an application-layer protocol stack. Three things that are now true that were not true three years ago:

**1. The Pinning Services API v1.0 solved the trivial case.** Blob pinning is standardized. The ecosystem has a common interface and multiple conforming providers. The battle for blob interoperability is mostly won. The next layer — models and structured data — has no equivalent standard.

**2. AI/ML teams are generating content-addressed data whether they know it or not.** Model weights are deterministic byte sequences. The same model checkpoint, trained identically, produces the same bytes. The missing piece is a standard that makes content addressing first-class at the model-registry layer. Without that standard, teams will keep storing weights in centralized silos.

**3. GDPR has created demand for cryptographic deletion on immutable storage.** IPFS's immutability is a feature, not a bug — but it creates a real compliance problem for any data that may need to be erased. Crypto-shredding (delete the encryption key → all affected CIDs become permanently unreadable) is the correct solution. NDP's envelope encryption makes this a first-class primitive rather than an afterthought.

The window for a protocol-level standard is open. The ecosystem has not yet fragmented around incompatible structured-data and model-registry approaches. NDP v1.0 is a bid to define the standard before that fragmentation happens.

---

## 6. Competitive Landscape

The table below reflects what each provider actually offers as of April 2026. Only checked entries reflect documented or publicly announced features.

| Capability | NDN | Pinata | Web3.Storage | Filebase | Fleek |
|---|:---:|:---:|:---:|:---:|:---:|
| Blob pinning (Pinning Services v1.0) | Yes | Yes | Yes | Yes | Yes |
| AI/ML model registry | Yes | No | No | No | No |
| Structured records + query | Yes | No | No | No | No |
| AES-256-GCM encryption (default) | Yes | No | No | No | No |
| Filecoin cold archival | Yes | No | Yes | No | No |
| Crypto-shredding (GDPR erasure) | Yes | No | No | No | No |
| Resumable upload (tus) | Yes | No | No | No | No |
| Open conformance test suite | Yes (planned M1) | No | No | No | No |
| Apache-2.0 reference implementation | Yes | No | No | No | No |
| Pinning Services v1.0 conformance suite | Yes (planned M1) | No | No | No | No |

Notes:
- Web3.Storage's current W3UP product uses UCAN auth and car-based uploads; Filecoin integration is via their own aggregator pipeline, not via the open Boost client.
- Filebase provides S3-compatible object storage backed by IPFS; Filecoin integration status is partial.
- This table does not include features announced but not yet publicly available from any provider.

---

## 7. Implementation Status

As of April 2026, the following are live and accessible:

| Component | Status | URL / Location |
|---|---|---|
| Fastify REST API (NDP reference implementation) | Live, Cloud Run us-west1 | `https://ndn-api-1037328355027.us-west1.run.app/_health` |
| Next.js dashboard (14 routes) | Live, Cloud Run us-west1 | `https://ndn-dashboard-1037328355027.us-west1.run.app` |
| Postgres 16 on Cloud SQL | Migrated, multi-tenant schema | private |
| `/v1/pins` (Pinning Services v1.0 alias) | Live | on API above |
| `/v1/models` + HuggingFace importer | Live | on API above |
| `/v1/records` + collections + views + schemas | Live | on API above |
| `/v1/_discovery` | Live | on API above |
| NDP v1.0 spec | Published | `specs/ndp_protocol.md` |
| Reference implementation (Apache-2.0) | Public | `github.com/dnkefua/ndn-ipfs-chain` |

The SDKs (`@ndnanalytics/ipfs` JS/TS, `ndn-ipfs` Python, `ndn` CLI) are in development and are the primary deliverable of grant milestone M1.

Health check and dashboard URLs are publicly reachable and return in under 500 ms from us-west1.

---

## 8. Roadmap

Roadmap is tied to the four IPFS Foundation grant milestones. All targets below are taken directly from `grants/MILESTONES.md`.

### Milestone 1 — SDK Foundation + Pinning Services Conformance (Month 3)
**Gate payment: $15,000**

- `@ndnanalytics/ipfs` (JS/TypeScript) v1.0 on npm: ESM + CJS + browser bundles, WebCrypto AES-256-GCM, tus streaming
- `ndn-ipfs` (Python) v1.0 on PyPI: sync + async (httpx), Pydantic v2 models
- `ndn` CLI: static binary, `pin add / pin list / get / keys rotate`, works against any Pinning Services v1.0 backend
- Open-source Pinning Services API v1.0 conformance suite (`@ndnanalytics/pinning-services-conformance`); NDN passes >= 80%
- NDP v1.0 spec posted for community review

Y1 targets hit by M1: 500 combined SDK monthly downloads, 50,000 CIDs pinned.

### Milestone 2 — Public Gateway Live in 3 Regions (Month 6)
**Gate payment: $15,000**

- `gateway.ndnipfs.com` in us-west, eu-west, ap-southeast; anycast DNS; Cloudflare Workers + R2 fronting Cloud Run
- Subdomain gateway at `<cid>.ipfs.ndnipfs.com` (IPFS subdomain gateway spec; origin isolation)
- `?verify=true` trustless retrieval: re-hashes content at edge, returns `X-Ipfs-Verified` header
- Listed on the IPFS public gateway checker
- Third-party security audit complete; findings remediated and published
- NDP conformance suite in beta

Y1 targets hit by M2: 3,000 SDK downloads/month, 500,000 CIDs pinned, 10,000 unique gateway clients/month.

### Milestone 3 — Filecoin Integration + Proofs Dashboard (Month 9)
**Gate payment: $10,000**

- Filecoin broker integrated: pins tagged `tier=filecoin` trigger CAR packing + Boost deal submission across >= 3 Storage Provider partners
- Proofs dashboard: per-CID deal list, PoSt verification status, weekly retrieval test results (public scorecard)
- Automated deal renewal for deals within 30 days of expiry
- SP scorecard published monthly

Y1 targets hit by M3: 8,000 SDK downloads/month, 2,000,000 CIDs pinned, 40,000 unique gateway clients/month, 250 GB on Filecoin.

### Milestone 4 — Year-1 Scale + Full Conformance (Month 12)
**Gate payment: $10,000**

- Full Pinning Services API v1.0 conformance (100% of public test suite)
- 5 published tutorials at `docs.ndnipfs.com`
- One conference talk delivered and recorded (IPFS Thing or Devcon)
- Public Year-1 report with every KPI: actual vs. target, lessons learned, sustainability plan

**Year-1 end-state targets (from `grants/MILESTONES.md`):**

| Metric | Y1 Target |
|---|---:|
| SDK monthly downloads (npm + PyPI combined) | 15,000 |
| Unique CIDs pinned via NDN | 5,000,000 |
| Public gateway unique clients/month | 100,000 |
| Gateway p95 TTFB | < 250 ms |
| Gateway uptime (rolling 90d) | >= 99.95% |
| GiB stored on Filecoin via NDN | 500 |
| Verified Filecoin deals | 2,500 |
| Tracked tutorial completions | 10,000 |

These targets are calibrated to first-year reality for a solo developer with a free tier. The grant application states this explicitly.

---

## 9. Security and Threat Model

### 9.1 Tenant isolation

Every persistent row and every cache key includes the tenant UUID. Cross-tenant reads are impossible via the API. Enforcement is layered: at the application layer (query builder enforces tenant clause) and at the SQL layer (Postgres row-level security policies). A bug in application code cannot leak data between tenants without also bypassing the SQL layer.

Tenant isolation has been tested as part of the security hardening committed to the repository (commit `b603edf9`).

### 9.2 Envelope encryption and crypto-shredding

Client-side AES-256-GCM encryption with per-tenant envelope keys managed by KMS:

- **Blobs:** SDK encrypts before hashing. Stored CID is the CID of ciphertext. Metadata envelope records the wrapping key ID.
- **Records:** Field-level encryption via `$encrypt: true` marker. Unencrypted fields remain queryable.
- **Models:** Weight shards MAY be encrypted per-shard; the shard map records per-shard key IDs.

**Crypto-shredding:** Deleting the envelope key renders all ciphertext addressed by the affected CIDs permanently unreadable. This satisfies GDPR Article 17 (right to erasure) on immutable storage without repinning or modifying CIDs. The key deletion event is recorded on-chain for tamper-evident proof of destruction.

### 9.3 CID integrity

SHA-256 provides 128-bit collision resistance. Implementations storing more than 2^64 objects per tenant SHOULD migrate to SHA-512.

JCS canonicalization is deterministic: any deviation from RFC 8785 causes CID divergence. Implementations MUST use a conformant JCS library. The conformance test suite (`@ndnanalytics/ndp-conformance`) includes canonical-form test vectors.

### 9.4 Reserved collections

`_schemas`, `_views`, `_audit`, and `_meta` are privileged collection names. Mutations MUST go through their respective privileged endpoints, not through `POST /v1/records`. Implementations MUST reject direct writes to reserved collections.

### 9.5 Abuse process

Free-tier gateway access is rate-limited at 500 req/min/IP and 50 GB/month per anonymous account. CID blocklist integration uses the Cloudflare and Badbits feeds. A public abuse contact (`abuse@ndnipfs.com`) and DMCA process are in place. The reference implementation's abuse policy is published in the repository.

---

## 10. Governance

**Specification license:** CC-BY 4.0 (`specs/ndp_protocol.md`). Any party may implement NDP v1.0 without royalties, restrictions, or attribution requirements beyond the license terms.

**Reference implementation license:** Apache-2.0 (`github.com/dnkefua/ndn-ipfs-chain`). There is no open-core split. The commercial product runs on the same open primitives, differentiated by operational features (SLA, support, compliance tooling, managed Filecoin), not by source-code locks.

**Open conformance suite:** `@ndnanalytics/ndp-conformance` and `@ndnanalytics/pinning-services-conformance` will be published in M1. Any provider can run the suite to claim conformance. Conformance is self-declared against published test vectors; there is no central certification body.

**IPIP-style proposal:** Within the grant period, NDP v1.0 will be submitted for IPFS community review via the working-group process, targeting a status equivalent to an IPFS Improvement Proposal. The spec is deliberately designed to be storage-backend agnostic — an NDP provider using Arweave instead of Filecoin is a conforming implementation.

**Governance of reserved names and extensions:** Reserved collection names (`_schemas`, `_views`, `_audit`, `_meta`) and query extensions (`$regex`, `$text`, `$near`, `$elemMatch`) are defined in the spec. Additions to either list require a spec revision under the CC-BY 4.0 process, not an implementation decision.

---

## 11. References

- NDP v1.0 specification: [`specs/ndp_protocol.md`](specs/ndp_protocol.md)
- System specification v2.0: [`specs/system_spec.md`](specs/system_spec.md)
- IPFS Foundation grant application: [`grants/IPFS_GRANT_APPLICATION.md`](grants/IPFS_GRANT_APPLICATION.md)
- Grant milestones: [`grants/MILESTONES.md`](grants/MILESTONES.md)
- IPFS Pinning Services API v1.0: https://ipfs.github.io/pinning-services-api-spec/
- JCS (JSON Canonicalization Scheme): https://www.rfc-editor.org/rfc/rfc8785
- CID specification: https://github.com/multiformats/cid
- JSON Schema Draft 2020-12: https://json-schema.org/specification
- Public repository: https://github.com/dnkefua/ndn-ipfs-chain
- Live API health: https://ndn-api-1037328355027.us-west1.run.app/_health
- Live dashboard: https://ndn-dashboard-1037328355027.us-west1.run.app

---

*Nkefua Desmond ("Blockchainer") — Founder, NDN Analytics LLC (Oklahoma, formed April 2026)*
*nkefuan@yahoo.com · Twitter/X [@dnkefua](https://twitter.com/dnkefua) · GitHub [@dnkefua](https://github.com/dnkefua)*
*NDN Analytics LLC is a founder-led, pre-revenue Oklahoma entity. One silent partner (equity, non-operational). This white paper accompanies the IPFS Foundation Grant Application.*
