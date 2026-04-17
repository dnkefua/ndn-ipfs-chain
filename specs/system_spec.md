# NDN IPFS Chain — Enterprise Infrastructure Specification (v2.0)

> **The easiest way to build on IPFS.** Add immutable, content-addressed storage to any app, dApp, or AI pipeline in three lines of code.

---

## 1. Vision & Positioning

NDN IPFS Chain is a **developer-first, enterprise-grade** pinning, retrieval, and lifecycle platform for IPFS + Filecoin. It removes every barrier to building on decentralized storage:

- **For developers:** one-line SDK install, free tier, sandbox, templates.
- **For enterprises:** SOC 2 / HIPAA / GDPR controls, regional data residency, SLAs.
- **For the IPFS ecosystem:** an on-ramp that measurably grows adoption of CIDs, Filecoin deals, and public gateways.

### 1.1 Differentiation (vs. Pinata, Web3.Storage, Fleek, NFT.Storage, Filebase)

| Capability | NDN IPFS Chain | Pinata | Web3.Storage | Filebase |
|---|---|---|---|---|
| Free tier | 5 GB + 50 GB egress | 1 GB | 5 GB (retired) | 5 GB |
| Client-side E2E encryption | **Native (AES-256-GCM)** | Add-on | ❌ | ❌ |
| Smart-contract pin triggers | **Native (EVM + Solana)** | ❌ | ❌ | ❌ |
| Hot↔Cold auto-tiering | **Policy engine** | ❌ | ❌ | Partial |
| Filecoin deal verification | **Built-in proofs dashboard** | ❌ | ✅ | ✅ |
| Regional data residency | **7 regions, pin-locked** | ❌ | ❌ | Partial |
| Resumable uploads (tus) | **Yes** | ❌ | ❌ | ❌ |
| GDPR crypto-shredding | **Yes** | ❌ | ❌ | ❌ |
| Pay-per-use pricing | **$0.008/GB-mo** | $20/mo min | Metered | $5.99/TB |
| Public status page + SLA | **99.99% + credits** | 99.9% | Best-effort | 99.9% |

---

## 2. Core Architecture Modules

### A. Orchestration Layer (Control Plane)
- **Technology:** IPFS Cluster v1.x over Kubo (go-ipfs) 0.28+.
- **Consensus:** CRDT pinset sync (eventual consistency, no leader election bottleneck).
- **Replication:** Configurable per-pin (default 3; enterprise 5–9 across regions).
- **Deployment:** Kubernetes (EKS/GKE/self-hosted) with EFS/Longhorn persistence.
- **Scheduler:** Custom placement policy that spreads replicas across AZs and Tier-1 carriers.

### B. Tiered Storage Strategy
| Tier | Media | Latency (p95) | Cost | Use case |
|---|---|---|---|---|
| **Hot** | NVMe SSD, 10 Gbps | < 50 ms TTFB | $$$ | Active dApps, NFT assets, AI inference |
| **Warm** | SATA SSD, 1 Gbps | < 300 ms TTFB | $$ | Audit logs < 90 days |
| **Cold** | Filecoin + Arweave | minutes | $ | Long-term archives, compliance |
| **Glacier** | Filecoin PoSt sealed | hours | ¢ | 10-year retention, legal hold |

- **Deduplication:** Native CID-based; identical content billed once per tenant.
- **Lifecycle engine:** Policies like `hot-7d-then-cold`, `pin-if-accessed-in-30d`, `filecoin-after-cold-90d`.
- **Retrieval:** Automatic promotion from cold → hot on first GET; configurable pre-warm.

### C. Delivery & Gateway Network
- **Architecture:** Decoupled Gateway PoPs (Points of Presence) on anycast IPs.
- **Regions (launch):** us-east-1, us-west-2, eu-west-1, eu-central-1, ap-southeast-1, ap-northeast-1, sa-east-1.
- **CDN:** Cloudflare (primary) + CloudFront (failover) with signed-URL support.
- **DNSLink:** `*.ndnipfs.link` subdomain per tenant + custom domain BYO.
- **Subdomain isolation:** `<cid>.ipfs.ndnipfs.link` (origin isolation against XSS).
- **Trustless retrieval:** Optional `?verify=true` re-hashes payload at edge (proof-of-integrity header).

### D. API & Management Layer
- **Protocol:** RESTful API conforming to [IPFS Pinning Services Specification v1.0](https://ipfs.github.io/pinning-services-api-spec/).
- **Extended endpoints:** lifecycle, encryption, triggers, analytics, teams.
- **Uploads:** tus (resumable), S3-compatible multipart, native IPFS `/api/v0/add`.
- **Auth:** JWT (RS256) + API keys + SIWE (Sign-In With Ethereum) + OIDC SSO.
- **RBAC:** Org → Team → Project → Key scopes (`pins:read`, `pins:write`, `keys:rotate`, `billing:*`).
- **Rate limiting:** Token-bucket per key, per IP, per tenant.

### E. Blockchain & Web3 Integration
- **Smart-contract event triggers:** Subscribe to EVM logs (Ethereum, Polygon, Arbitrum, Base, Optimism, Avalanche) and Solana program events → auto-pin referenced CIDs.
- **On-chain anchoring:** Daily Merkle root of new pins committed to Ethereum L2 for notarization.
- **SIWE authentication:** No passwords required for dApp developers.
- **Wallet-gated retrieval:** Gate content behind token ownership (ERC-721/1155/20).

### F. Security & Compliance
- **Client-side encryption:** AES-256-GCM with envelope keys; SDK does encrypt-then-hash so the CID represents ciphertext.
- **Key management:** Per-tenant KMS (AWS KMS / HashiCorp Vault); customer-managed keys available.
- **Crypto-shredding:** Destroy envelope key → content becomes permanently unreadable (GDPR right-to-erasure on immutable storage).
- **Compliance roadmap:** SOC 2 Type II (Q3), HIPAA BAA (Q4), ISO 27001 (2027), FedRAMP Moderate (2027).
- **Audit log:** Every API call signed and pinned; tamper-evident.

### G. Observability
- **Public status page:** `status.ndnipfs.com` — per-region uptime, error rate, TTFB.
- **Per-tenant dashboard:** pins, bandwidth, replication health, Filecoin deals, alerts.
- **Prometheus / OpenTelemetry export:** ship metrics to customer's own stack.

---

## 3. The "NDN Edge" — Features No Competitor Offers

1. **Blockchain Event Triggers** — pin when a smart contract emits an event.
2. **Native Client-Side Encryption** — the SDK encrypts before hashing; you keep the keys.
3. **Lifecycle Policies** — declarative JSON/YAML rules like S3 lifecycle but for IPFS.
4. **Crypto-Shredding** — key erasure = GDPR-compliant deletion on immutable storage.
5. **Direct-to-GPU Streaming** — model-weight loading that bypasses local disk.
6. **Wallet-Gated Gateways** — token-gated retrieval without a separate access layer.
7. **Regional Pinning Locks** — guarantee data never leaves a region (EU sovereignty).
8. **Merkle-anchored Audit Trails** — every admin action committed on-chain.

---

## 4. Deployment Roadmap

| Phase | Milestone | Target |
|---|---|---|
| **0 — MVP** | Single-region cluster, REST API, JS + Python SDK, CLI | Month 1–2 |
| **1 — Public Beta** | 3 regions, public status page, free tier, pricing calculator | Month 3 |
| **2 — Web3 Native** | SIWE, contract triggers (EVM), Hardhat plugin | Month 4 |
| **3 — Enterprise** | SSO, RBAC, SOC 2, regional residency locks | Month 6 |
| **4 — Cold Storage** | Filecoin Plus deals, Arweave mirror, proofs dashboard | Month 7 |
| **5 — AI Native** | Model registry, direct-to-GPU streaming, HuggingFace import | Month 9 |
| **6 — Public Infrastructure** | Community gateway, grants program, educational content | Month 10–12 |

---

## 5. Success Metrics (for grant reporting)

- **IPFS adoption:** CIDs pinned (target: 100M in year 1), unique tenants (target: 10k).
- **Filecoin deals:** GiB stored on Filecoin via NDN (target: 1 PiB).
- **Developer reach:** SDK downloads/mo, GitHub stars, StackOverflow tag activity.
- **Public goods:** % of free-tier usage, student/researcher accounts, community tutorials.
- **Reliability:** 99.99% uptime, p95 TTFB < 200 ms globally.
