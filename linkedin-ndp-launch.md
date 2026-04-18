---
# LinkedIn Post — NDP v1.0 Launch
# Date: April 18, 2026
---

We shipped NDP v1.0 today — the first open protocol that gives blobs, AI model weights, and structured records a single content-addressed surface on IPFS. Here is why that matters and what is live right now.

---

The problem is simple to state: production applications need three data shapes — files, model weights, and queryable records. Today those map to three providers, three auth tokens, three billing meters, and no unified audit trail. Pinata handles blobs. HuggingFace handles model weights. Postgres handles the records. None of them share a CID story.

That patchwork is a liability for any team in a regulated industry. And it is a ceiling on what IPFS can be.

---

The NDN Data Protocol (NDP) v1.0 collapses that stack into one protocol envelope. Every object — blob, model version, structured record, schema, view snapshot — is serialized via JCS (RFC 8785), SHA-256 hashed, and expressed as a CIDv1. Two independent implementations producing the same logical content produce the same CID. Cross-provider portability is not a feature; it is a consequence of the design.

Three data planes, one control surface:
- Blobs: IPFS Pinning Services API v1.0 superset (existing tools work without modification)
- Models: content-addressed weight shards, shard maps, model cards, HuggingFace import, range-addressable streaming
- Structured Records: immutable version chains, Mongo-ish query DSL, JSON Schema Draft 2020-12, content-addressed views

---

The reference implementation (Apache-2.0) is live on Google Cloud Run right now. All three data planes are accepting traffic at the production URL. The spec is public (CC-BY 4.0) in the repository.

If you are building something that needs the full data stack on IPFS — or if you build storage infrastructure and want to implement NDP — read the spec at github.com/dnkefua/ndn-ipfs-chain and reach out.

What does your team reach for when you need structured data alongside blob storage on IPFS? Genuinely curious what the community is using today.

#IPFS #DecentralizedStorage #OpenProtocol
