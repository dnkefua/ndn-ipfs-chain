# NDN Tiered Storage & Filecoin Integration

## The four tiers

| Tier | Media | p95 TTFB | Cost (customer) | Retention | Use case |
|---|---|---|---|---|---|
| **Hot** | NVMe SSD + 10 Gbps | < 50 ms | $0.023/GB-mo | Indefinite | Live dApps, NFT media, AI inference |
| **Warm** | SATA SSD + 1 Gbps | < 300 ms | $0.008/GB-mo | 90–365 days | Audit logs, backups |
| **Cold** | Filecoin verified deals | minutes | $0.002/GB-mo | ≥ 540 days | Compliance archives |
| **Glacier** | Filecoin PoSt sealed + Arweave | hours | $0.0004/GB-mo | ≥ 10 years | Legal hold, datasets |

## Data Flow: Ingest → Replicate → Tier → Archive

```
     upload
        │
        ▼
 ┌──────────────┐  chunk & hash (sha-256 → CIDv1, raw-leaves)
 │ Ingest Pod   │──────────────────┐
 └──────┬───────┘                  │
        │ add block to Kubo       ▼
        ▼                  dedupe table
 ┌──────────────┐        (CID → tenants[])
 │ Kubo node    │────────────────────┐
 └──────┬───────┘                    │
        │ pinset update              │
        ▼                            │
 ┌──────────────┐   replicate to     │
 │ Cluster CRDT │   N peers per      │
 └──────┬───────┘   placement rule   │
        │                            │
        ▼                            │
   [Hot NVMe across AZ1,AZ2,AZ3]     │
        │                            │
     lifecycle engine (nightly)      │
        │                            │
        ├── if not-accessed-30d ───► Warm (SATA, replicas 3→2)
        │
        ├── if cold-policy ────────► Cold (Filecoin deal, 540d min)
        │
        └── if glacier-policy ─────► Glacier (PoSt sealed + Arweave mirror)
```

## Placement Policy

When a pin is created, the scheduler picks N peers that satisfy:

1. `region == pin.region` (hard constraint if residency lock set).
2. AZ diversity (prefer different AZs up to N).
3. Carrier diversity (different Tier-1 transit where possible).
4. Health score (peer disk free, last heartbeat, error rate).
5. Re-balance if any replica falls below 40% disk free.

Implemented as a custom Cluster allocator (Go).

## Filecoin Integration

### Outgoing (Cold storage)
1. Daily CAR-packing job assembles a dataset of cold-eligible CIDs.
2. Submit `StorageMarket` proposals via Boost or [Motion](https://github.com/filecoin-project/motion) to 5 vetted Storage Providers.
3. Prefer Filecoin Plus (verified) clients — free on-chain storage, better SP incentives.
4. Monitor deal state; alert if renewal needed < 30 days before expiry.

### Proofs Dashboard
For each pin backed by Filecoin, the tenant sees:
- Deal ID(s), SP IDs, expiry dates.
- Latest PoSt (Proof of Spacetime) window verified by a chain read.
- Retrieval-test results (weekly random sampling).

This is the **key feature for the IPFS Foundation grant**: transparent, provable persistence.

### Retrieval
- Primary: Boost retrieval v2 (HTTP).
- Secondary: Saturn L1 / Lassie.
- Tertiary: re-upload from Arweave mirror if available.
- All retrievals auto-promote the CID back to Hot tier (configurable).

## Arweave Mirror (Optional)

For customers who want permanent (pay-once) storage on top of Filecoin:
- Bundlr/Turbo SDK upload.
- Tx ID stored alongside the pin record.
- Useful for regulatory archives that must be *provably* never deleted.

## Chunking & Dedup

- **Chunker:** Rabin-2 (size-content-defined) — better dedup across similar files.
- **Leaves:** `raw` (not dag-pb) — smaller blocks, faster retrieval.
- **CID version:** 1 (required for subdomain gateway).
- **UnixFS:** when directory uploads are needed.
- Dedup table tracks `(CID → tenants[])`; content counted in billing per tenant but stored once per cluster.

## GDPR Crypto-Shredding

Immutable content can't be deleted, but envelope-key erasure achieves the same effect:

1. Content was encrypted client-side with an envelope key; the CID addresses ciphertext.
2. Envelope key is held in per-tenant KMS.
3. Shred API destroys the key wrapping → ciphertext becomes unrecoverable.
4. Merkle proof of erasure is anchored on-chain daily.

Legal interpretation: the data is "effectively erased" per EDPB Guidelines 9/2022 (pseudonymization + key deletion as erasure).

## Disaster Recovery

- **Pinset backup:** daily snapshot of CRDT state to S3 + Glacier.
- **Block-level backup:** Kubo blocks rsynced to a cross-region bucket nightly.
- **RTO:** 4 hours.
- **RPO:** 24 hours (block), real-time (pinset CRDT).
- **Annual DR drill**, results published on status page.
