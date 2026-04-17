# IPFS Foundation Grant Application — NDN IPFS Chain

> **Track:** Implementations & Integrations / Public Goods Infrastructure
> **Org:** NDN Analytics
> **Contact:** support@ndnanalytics.com  |  https://www.ndnanalytics.com
> **Request:** $150,000 over 12 months

---

## 1. One-line summary
NDN IPFS Chain is an enterprise-grade, developer-first IPFS + Filecoin platform that makes decentralized storage as easy to use as AWS S3 — and ships verifiable public-good infrastructure (free public gateway, open SDKs, open specs, curated public datasets) alongside a commercial product.

## 2. Why this aligns with the IPFS Foundation's mission
IPFS will win only if **builders** use it. Today, onboarding to IPFS is harder than onboarding to S3, which funnels developers back to centralized storage. NDN's thesis: *remove every barrier to using IPFS* — pricing, docs, encryption, compliance, reliability — and adoption follows.

This grant funds the **public-good** parts of NDN (free gateway, SDKs, specs, education) that we can't monetize directly but that materially grow the protocol's user base.

## 3. Deliverables (12-month plan)

### 3.1 Public infrastructure ($45k)
- **Free public gateway** at `gateway.ndnipfs.link`
  - 500 req/min/IP, 50 GB/mo/account, no signup required.
  - Subdomain gateway at `<cid>.ipfs.ndnipfs.link` (XSS-safe).
  - Trustless retrieval (`?verify=true`) re-hashes at the edge.
  - Added to the IPFS public gateway checker list.
- **Open status page** at `status.ndnipfs.com` — per-region uptime, p95 TTFB, Filecoin deal success rate.
- **Open metrics**: we publish quarterly anonymized metrics of CIDs pinned, Filecoin deals created, geographic spread.

### 3.2 Open-source SDKs and CLI ($40k)
- `@ndnanalytics/ipfs` — JS/TypeScript SDK (Apache-2.0). ESM + CJS + browser.
- `ndn-ipfs` — Python SDK + `ndn` CLI.
- `hardhat-ndn-ipfs` — Hardhat plugin for smart-contract deploy pipelines.
- **Pinning Services API v1.0-compatible** — any IPFS tool works out of the box.

### 3.3 Developer education ($25k)
- Interactive tutorials at `learn.ndnipfs.com` (5 in year 1).
- Sample apps: Next.js dApp, Hardhat plugin, LangChain agent memory, dataset pipeline.
- Conference talks + workshops (IPFS Thing, Devcon, ETHGlobal).
- Student program: free 50 GB / 500 GB egress for `.edu` emails.

### 3.4 Filecoin integration ($30k)
- Boost/Motion integration with 5+ vetted Storage Providers.
- Proofs dashboard exposing PoSt verification per pin.
- Automated deal renewal, SP scoring, and retrieval testing.
- All code open-sourced.

### 3.5 Specification contributions ($10k)
- Propose extensions to the Pinning Services API for:
  - Lifecycle policies
  - Regional residency locks
  - Smart-contract triggers
- Contribute to the CAR v2 spec and subdomain gateway spec.

## 4. Success metrics

Reported quarterly, publicly:

| Metric | Baseline | Y1 target |
|---|---:|---:|
| Unique CIDs pinned via NDN | 0 | 100,000,000 |
| GiB on Filecoin via NDN | 0 | 1,024 TiB |
| Verified Filecoin deals | 0 | 50,000 |
| SDK monthly downloads (npm + PyPI) | 0 | 25,000 |
| Public-gateway unique clients/mo | 0 | 200,000 |
| Student / researcher accounts | 0 | 2,000 |
| Countries with gateway PoP | 0 | 7 |
| p95 public gateway TTFB | — | < 200 ms |
| Public gateway uptime | — | ≥ 99.95% |

## 5. Why us

- **NDN Analytics** has a commercial line of business (pharma provenance — TraceChain; healthcare data) that funds 80% of the platform.
- Existing customers on Day 0 → the infrastructure will *already be loaded* when we open the public gateway.
- Founding team has prior enterprise infrastructure experience (see `grants/TEAM.md`).

## 6. Budget breakdown

| Line item | Amount |
|---|---:|
| Public gateway infra (CDN, PoPs, egress) | $45,000 |
| SDK/CLI engineering | $40,000 |
| Filecoin integration + SP onboarding | $30,000 |
| Developer education, tutorials, talks | $25,000 |
| Specification & standards contributions | $10,000 |
| **Total** | **$150,000** |

## 7. Disbursement
Milestone-based (matches IPFS Foundation standard):
- **M1 (month 2):** Public gateway live in 3 regions — $40k
- **M2 (month 4):** JS + Python SDK at v1.0 on npm / PyPI — $30k
- **M3 (month 7):** 1 PiB on Filecoin, proofs dashboard shipped — $40k
- **M4 (month 12):** 100M CIDs pinned, 25k SDK downloads — $40k

## 8. Open-source commitment
All code funded under this grant is Apache-2.0 on GitHub at `github.com/ndn-analytics/ipfs-chain`. The commercial product builds on top of the same open primitives; there is no "open-core" / "closed-enterprise" license split.

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Cost of free gateway outpaces revenue | Rate limits + cacheable CIDs + Cloudflare Workers (cheap egress) |
| Filecoin deal reliability | Diversify across 5+ SPs, weekly retrieval tests, alert on drift |
| IPFS client performance regression | Pin Kubo version, maintain our own lightweight gateway |
| Abuse (illegal content) | DMCA process + CID blocklist integration + abuse@ndnipfs.com |

## 10. Appendix
- System spec: [specs/system_spec.md](../specs/system_spec.md)
- Architecture: [architecture/ARCHITECTURE.md](../architecture/ARCHITECTURE.md)
- Gateway design: [gateway/GATEWAY.md](../gateway/GATEWAY.md)
- Storage + Filecoin: [storage/STORAGE.md](../storage/STORAGE.md)
- OpenAPI: [api/openapi.yaml](../api/openapi.yaml)
- SDKs: [sdks/js/](../sdks/js/), [sdks/python/](../sdks/python/)
- Reference integrations: [implementations/](../implementations/)
