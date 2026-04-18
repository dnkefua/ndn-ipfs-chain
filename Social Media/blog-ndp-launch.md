---
title: "NDN Data Protocol v1.0: One Protocol for Blobs, Models, and Structured Records on IPFS"
subtitle: "Three data planes. One canonical envelope. A bid to standardize what Pinning Services v1.0 didn't cover."
author: Nkefua Desmond (@dnkefua)
date: April 18, 2026
reading_time: "8 min"
slug: ndn-data-protocol-v1-launch
tags: Protocol, IPFS, Decentralized Storage, AI/ML, Filecoin, Open Source
---

The IPFS blob-pinning problem is solved. The model-registry problem and the structured-data problem are not. Today we're publishing the NDN Data Protocol (NDP) v1.0 — a specification that extends the content-addressed model to all three data shapes under one protocol. Here's what we built and why.

---

## What breaks in the status quo

Every serious application needs three categories of data: files and raw bytes (blobs), queryable documents (structured data), and — increasingly — AI model weights. Today there is no protocol that handles all three with content addressing. That produces three concrete friction stories.

**Story 1: Blob pinning works, but only for blobs.**

The Pinning Services API v1.0 was a real success — a standardized interface that lets developers swap blob providers without rewriting their application. But it stops at bytes. No schema enforcement. No query. No model semantics. The moment a team needs user records *and* file uploads under one CID story, they're back to building glue.

A dApp developer who stores NFT metadata with Pinata and user profiles in Postgres has two separate identity models: CIDs and primary keys. No unified audit trail. No content-addressed proof that "this record existed in this state at this timestamp." The systems don't know each other exist.

**Story 2: Model weights have no CID story.**

A 70B-parameter model is not a blob. It's hundreds of weight shards, a shard map, a model card, framework metadata, eval results. HuggingFace Hub handles this well — but it's centralized. Storing weights in S3 gives no content address. Publishing weights as a raw IPFS directory works but produces no standard envelope, no versioning semantics, and no streaming interface that inference servers can depend on.

Today, an ML team that trains a new checkpoint, wants to pin it to IPFS, and expects another team to retrieve and verify identical bytes must write a bespoke script, manage shard ordering manually, and hope nothing in the pipeline mutates the files. There is no `import from HuggingFace → get a CID` primitive in any current IPFS tool.

**Story 3: Structured data has no standard content-addressed format.**

Tableland gives you SQL-flavored tables. Ceramic gives you mutable documents. OrbitDB gives you embedded CRDT stores. None of these produce a CID for a logical record that is reproducible by an independent implementation. A compliance team that needs to prove "this dataset was exactly these values at this timestamp" cannot do that with any existing IPFS-native structured-data tool. The hash of a Postgres row is not an IPFS CID.

The consequence is that the hardest production workloads — biomedical platforms, regulated AI systems, applications with real GDPR exposure — have no coherent decentralized data story. They glue together three providers and hope the seams don't fail in production.

---

## NDP in one page

NDP's central insight is that every persistent object a production application needs — blob, model version, structured record, schema, view snapshot — can be expressed as a canonical JSON envelope, hashed deterministically, and addressed by a CIDv1. From that foundation, three data planes emerge with their own API semantics, all sharing one auth surface and one billing meter.

**The envelope:**

```json
{
  "ndp":     "1",
  "kind":    "record",
  "tenant":  "9f2b7c3d-...",
  "created": "2026-04-18T12:00:00.000Z",
  "parent":  null,
  "body": {
    "collection": "users",
    "id": "u_7f3c1",
    "data": { "email": "kefua@example.com", "plan": "pro" }
  }
}
```

Before hashing, this envelope goes through **JCS (JSON Canonicalization Scheme, RFC 8785)**. JCS guarantees that semantically equivalent JSON — regardless of key ordering, whitespace, or number formatting — produces byte-identical canonical form. That canonical form is SHA-256 hashed and expressed as a CIDv1 with raw codec (`0x55`). Two independent implementations producing the same logical record MUST produce the same CID.

That determinism is what makes cross-provider portability a protocol guarantee rather than a marketing claim.

The three planes share one discovery endpoint:

```
GET /v1/_discovery
```

which returns which planes a deployment exposes, which query extensions it supports, and which auth methods it accepts. A partial implementation (blobs-only, or blobs + records) is valid NDP.

---

## What NDP-blobs adds

The Blobs plane is the IPFS Pinning Services API v1.0 — plus the things the Pinning Services spec deliberately left out.

Every NDP implementation MUST expose the full Pinning Services v1.0 surface at `/v1/pins`. An existing tool that speaks Pinning Services v1.0 works against an NDP provider without modification. NDP-blobs is a strict superset.

What's added on top:

- **Tiered storage with lifecycle policies.** Tag a pin `tier=filecoin` and it goes to cold archival automatically. Policies like `hot-7d-then-cold` run without operator intervention.
- **Metadata envelope.** Every blob has a `kind = "blob-meta"` envelope — name, size, media type, lifecycle — that is itself CID-addressed and versioned.
- **Resumable upload.** `POST /v1/upload` is a Tus endpoint. Large files survive network interruptions; the final blob CID is returned on completion.
- **Client-side encryption.** SDK encrypts the payload (AES-256-GCM) before upload. The stored CID is the CID of ciphertext. Crypto-shredding (delete the KMS key) renders every affected CID permanently unreadable — GDPR erasure without repinning.

```bash
# Upload a file, get a CID
curl -X POST https://ndn-api-1037328355027.us-west1.run.app/v1/blobs \
  -H "Authorization: Bearer ndk_..." \
  -H "Content-Type: application/octet-stream" \
  --data-binary @model-card.json

# {"cid":"bafkreib3...","size":1842,"meta_cid":"bafkreic7..."}
```

---

## What NDP-models adds

The Models plane is the content-addressed model registry that doesn't exist anywhere else in the IPFS ecosystem.

A model in NDP is a structured bundle: weight shards (CID-addressed raw blobs), a shard map (logical names → CIDs + byte ranges), a model card (author, license, framework, eval results), and a version envelope that ties them together. The version's CID is the addressable identity of that specific model version. `(tenant, name, version) → root_cid` is the mutable pointer; the root CID never changes.

The import primitive:

```bash
# Mirror a HuggingFace model to IPFS in one call
curl -X POST https://ndn-api-1037328355027.us-west1.run.app/v1/models/import/huggingface \
  -H "Authorization: Bearer ndk_..." \
  -H "Content-Type: application/json" \
  -d '{"repo_id": "meta-llama/Llama-3-8B-Instruct", "revision": "main"}'

# {"name":"meta-llama/Llama-3-8B-Instruct","version":"v1.0","root_cid":"bafyrei...","status":"importing"}
```

Large imports run asynchronously (`202 Accepted`) with a job ID for polling. On completion, every shard is pinned as a CIDv1 blob, the shard map is a canonical envelope, and the version is browsable via standard IPFS gateway tools.

The streaming endpoint supports HTTP `Range` requests for random access to any byte offset in any shard. A conforming PyTorch loader can fetch shards concurrently with bounded parallelism to saturate available bandwidth. Tensor-level retrieval (`?tensor=model.layers.0.self_attn.q_proj.weight`) is experimental and in the spec.

---

## What NDP-records adds

The Structured Records plane gives JSON documents the same content-addressed treatment that IPFS gives files.

Each write with the same `(collection, id)` pair creates a new immutable envelope whose `parent` points at the prior CID, forming a linked version chain. `GET /v1/records/:collection/:id/history` returns the full chain, most recent first. Every historical version is retrievable by its CID, indefinitely (until tenant requests deletion via crypto-shredding).

The query DSL is Mongo-ish and deliberately small:

```bash
# Query with comparison operators and dot paths
curl -X POST https://ndn-api-1037328355027.us-west1.run.app/v1/collections/users/query \
  -H "Authorization: Bearer ndk_..." \
  -H "Content-Type: application/json" \
  -d '{
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
  }'

# {"count":3,"results":[{"id":"u_7f3c1","cid":"bafkreib3...","body":{...}}],"next":null}
```

Mandatory operators: equality, `$gt / $gte / $lt / $lte / $ne`, `$in / $nin`, `$exists`, `$and / $or / $not`, dot-path notation. Extensions (`$regex`, `$text`, `$near`) must be declared in `_discovery`.

Content-addressed views are the other piece. A view is a named saved query. At any moment, the view's current result set is canonicalized and CID'd as a `view-snapshot` envelope:

```json
{
  "name": "active_users_last_7d",
  "collection": "users",
  "filter": { "last_seen": { "$gte": "2026-04-11T00:00:00Z" } },
  "projection": ["id", "email", "last_seen"],
  "refresh": "on_write"
}
```

`view.head_cid` advances on every re-evaluation. Every historical snapshot remains retrievable by CID. A compliance team can pin a view's head CID on Monday and prove on Friday that the dataset hadn't changed.

---

## Try it now

The reference implementation is live:

```bash
# Health check
curl https://ndn-api-1037328355027.us-west1.run.app/_health

# Discovery document — see which planes are live
curl https://ndn-api-1037328355027.us-west1.run.app/v1/_discovery
```

The discovery endpoint returns the provider version, which data planes are enabled, which query extensions are supported, and which auth methods are accepted.

Dashboard: `https://ndn-dashboard-1037328355027.us-west1.run.app`

---

## What we want from the community

NDP v1.0 is in draft status and open for review at [`specs/ndp_protocol.md`](https://github.com/dnkefua/ndn-ipfs-chain/blob/master/specs/ndp_protocol.md).

Three specific asks:

**Implementations.** The spec is CC-BY 4.0. If you're building a storage provider and want to implement NDP, we want to work with you on the conformance suite. The more independent implementations exist, the more meaningful the interoperability guarantee becomes.

**Reviewers.** The spec has open questions (§9 of `specs/ndp_protocol.md`): cross-tenant shared schemas, GraphQL surface, geographic residency at the record level, live materialized views. If you have opinions on any of these, open an issue or email nkefua@ndnanalytics.com.

**Feedback on the query DSL.** The Mongo-ish DSL was chosen for familiarity. There are legitimate arguments for a different approach. If the DSL is wrong for the IPFS ecosystem, now is the time to say so — before the conformance suite is written and locked.

The conformance suite (`@ndnanalytics/ndp-conformance`) is one of the primary deliverables of the first grant milestone. We want it to be useful to providers beyond NDN.

---

*Nkefua Desmond ("Blockchainer") is the founder of NDN Analytics LLC (Oklahoma), building the data layer for the decentralized web. Reach out on Twitter/X [@dnkefua](https://twitter.com/dnkefua) or by email at nkefuan@yahoo.com.*
