# IPFS Foundation Grant Application — NDN IPFS Chain

> **Program:** Implementations & Integrations
> **Applicant:** NDN Analytics (sole proprietor)
> **Contact:** Ndibe Kefua — nkefua@ndnanalytics.com — https://www.ndnanalytics.com
> **Repo:** https://github.com/dnkefua/ndn-ipfs-chain
> **Request:** $50,000 over 12 months
> **Submission date:** April 2026

---

## 1. One-line summary

NDN IPFS Chain is an open-source, developer-first pinning, SDK, and gateway stack that makes onboarding to IPFS as frictionless as onboarding to AWS S3 — so more builders ship on IPFS instead of falling back to centralized storage.

## 2. Why this aligns with the IPFS Foundation's mission

IPFS will win when **builders** ship on it by default. Today, the first-run experience for a new developer is rougher than Pinata or Filebase: scattered docs, inconsistent SDKs, no easy public gateway story, no one-command CLI. That friction is the single largest drag on IPFS adoption in the web-native developer base.

This grant funds the **public-good parts** of NDN IPFS Chain — the open SDKs, the free public gateway, the Pinning Services API v1.0 conformance suite, and the developer education content — that cannot be directly monetized but that measurably lower the barrier to entry for every IPFS user, not just NDN customers.

The commercial side of NDN (enterprise pinning, lifecycle, Filecoin, AI model registry) subsidizes the public-good work; this grant accelerates the public-good work to a 12-month timeline instead of 24.

## 3. Current state — what already exists

Unlike most applications at this stage, the infrastructure is **already live** as of submission:

| Component | Status | URL |
|---|---|---|
| Fastify REST API (Pinning Services v1.0 partial) | Live on Cloud Run us-west1 | `https://ndn-api-1037328355027.us-west1.run.app/_health` |
| Next.js dashboard (enterprise UI, 14 routes) | Live on Cloud Run us-west1 | `https://ndn-dashboard-1037328355027.us-west1.run.app` |
| Postgres 16 on Cloud SQL | Migrated, multi-tenant schema | private |
| HuggingFace model importer worker | Coded, deployed | private |
| Git repository (Apache-2.0) | Public, committed | `github.com/dnkefua/ndn-ipfs-chain` |
| System spec (v2.0) | Published in repo | `specs/system_spec.md` |
| NDN Data Protocol (NDP v1.0) spec | Drafted, published in repo | `specs/ndp_protocol.md` |
| NDP reference implementation (blobs + models + records legs) | Live on the API above | `/v1/pins`, `/v1/models`, `/v1/records`, `/v1/_discovery` |

Reviewers are invited to hit the health and dashboard URLs directly; they return in under 500 ms from us-west1.

## 4. Grant deliverables (12-month plan)

### 4.1 Open SDKs and CLI — $15,000

- **`@ndnanalytics/ipfs`** (JS/TypeScript, Apache-2.0)
  - ESM + CJS + browser bundles
  - WebCrypto AES-256-GCM client-side encryption
  - Streaming + tus resumable upload support
  - Published to npm; CI + semver
- **`ndn-ipfs`** (Python 3.10+, Apache-2.0)
  - Sync + async clients (httpx)
  - Pydantic models for all response types
  - Published to PyPI
- **`ndn` CLI** (single static binary, Apache-2.0)
  - `ndn pin <path>`, `ndn get <cid>`, `ndn keys rotate`
  - Works against any IPFS Pinning Services v1.0–compatible backend, not just NDN
- **Hardhat plugin** for smart-contract deploy pipelines

### 4.2 Free public gateway — $15,000

- **`gateway.ndnipfs.com`** — anycast, 3 regions at launch (US-west, EU-west, AP-southeast)
- 500 req/min/IP, 50 GB/mo/account, no signup required for read-only retrieval
- **Subdomain gateway** at `<cid>.ipfs.ndnipfs.com` for XSS isolation per the IPFS subdomain gateway spec
- **Trustless retrieval** via `?verify=true` — re-hashes content at the edge and returns `X-Ipfs-Verified` header
- Submitted to the public [IPFS gateway checker](https://ipfs.github.io/public-gateway-checker/) list

### 4.3 Filecoin integration + proofs dashboard — $10,000

- Boost client integration with **≥3 vetted Storage Providers**
- Automated deal submission for pins tagged `tier=filecoin`
- **Proofs dashboard**: deal list, PoSt verification status, retrieval test results per CID
- Weekly retrieval test harness + SP scoring (published openly)

### 4.4 Developer education — $7,000

- **`docs.ndnipfs.com`** — Mintlify-style docs site with 5 tutorials:
  - "Pin your first CID in 3 lines of JS"
  - "Build a dApp with content-addressed storage (Next.js + Hardhat)"
  - "Stream an AI model from IPFS directly into PyTorch"
  - "Mirror any GitHub repo to IPFS via GitHub Actions"
  - "Migrate off Pinata / Web3.Storage in 30 minutes"
- Sample apps published to GitHub (MIT licensed so anyone can lift them)
- 1 recorded talk submitted to IPFS Thing / Devcon

### 4.5 Spec contributions — $3,000

This is the line item we expect to have the longest half-life beyond the grant period, because specs outlive implementations.

- **NDN Data Protocol (NDP) v1.0** — `specs/ndp_protocol.md` *(already published in the repo as of submission)*.
  NDP is a content-addressed protocol that unifies three classes of data behind one wire format: **blobs** (which subsumes the IPFS Pinning Services API v1.0 surface), **AI/ML models** (chunked + range-addressable streaming), and **structured records** (immutable version chains + Mongo-compatible query DSL + content-addressed saved views). Every addressable object in NDP shares a single canonical envelope — **JCS (RFC 8785) → SHA-256 → CIDv1 raw** — so two implementations producing the same logical content necessarily produce the same CID, regardless of language or storage backend. A `/v1/_discovery` endpoint declares which of the three data planes a given deployment exposes, giving the protocol graceful partial-implementation semantics.
  - Live reference implementation at `/v1/pins`, `/v1/models`, and `/v1/records` on the production API above.
  - Draft-quality spec document published at grant submission time; shepherded toward IPFS community review (working-group call, IPIP-style proposal) inside the grant period.
  - Conformance test suite (`@ndnanalytics/ndp-conformance`) so any storage provider — not just NDN — can claim NDP support against a standard fixture set.
- **IPFS Pinning Services API v1.0 conformance** — full conformance to the [existing IPFS Pinning Services API v1.0 specification](https://ipfs.github.io/pinning-services-api-spec/), with an open-source conformance suite (`@ndnanalytics/pinning-services-conformance`) usable by any provider. NDP's *blobs* leg is defined to be strictly a superset of Pinning Services v1.0, so passing the Pinning Services suite is a prerequisite for claiming NDP-blobs conformance.

**Total: $50,000**

## 5. Success metrics (reported quarterly, publicly)

| Metric | Baseline | M3 | M6 | M9 | Y1 target |
|---|---:|---:|---:|---:|---:|
| SDK monthly downloads (npm + PyPI combined) | 0 | 500 | 3,000 | 8,000 | **15,000** |
| Unique CIDs pinned via NDN | 0 | 50,000 | 500,000 | 2,000,000 | **5,000,000** |
| Public gateway unique clients/mo | 0 | 1,000 | 10,000 | 40,000 | **100,000** |
| Public gateway p95 TTFB | — | — | — | — | **< 250 ms** |
| Public gateway uptime | — | 99.5% | 99.9% | 99.95% | **≥ 99.95%** |
| GiB stored on Filecoin via NDN | 0 | 1 | 50 | 250 | **500** |
| Verified Filecoin deals | 0 | 10 | 250 | 1,000 | **2,500** |
| External tutorials completed (tracked) | 0 | 200 | 1,500 | 5,000 | **10,000** |
| GitHub stars (`ndn-ipfs-chain` + SDKs combined) | 0 | 50 | 300 | 800 | **1,500** |

These targets are deliberately calibrated to first-year reality for a solo dev with a free tier, not to investor-deck TAM arithmetic. If we over-perform, the Year-2 follow-on ask becomes correspondingly stronger evidence.

## 6. Why us

**Ndibe Kefua** — founder & sole developer, NDN Analytics.

- Running commercial infrastructure at NDN Analytics since 2023 (pharma provenance / TraceChain product, healthcare data pipelines). That revenue funds ~80% of NDN IPFS Chain today and will continue to after the grant period ends.
- Built the entire current NDN IPFS Chain stack (API, dashboard, migrations, HuggingFace importer, deployment pipeline) solo across ~3 months. Every URL in §3 is traceable to a single commit history.
- One silent partner (equity holder, non-operational) — no day-to-day involvement in grant work.

I'm not going to claim credentials I don't have. What I have is execution velocity and a live-shipped stack; that's what this application is backed by. See `grants/TEAM.md` for the full bio and a list of what's still open (advisory, DevRel contractor, etc.).

## 7. Disbursement schedule (milestone-gated)

| Milestone | Month | Gate | Payment |
|---|---|---|---|
| **M1** | 3 | JS + Python SDKs at v1.0 on npm / PyPI; Pinning Services API conformance ≥ 80%; NDP v1.0 spec posted for community review | $15,000 |
| **M2** | 6 | Public gateway live in 3 regions; IPFS gateway-checker listed; 99.5% uptime; NDP conformance suite in beta | $15,000 |
| **M3** | 9 | Filecoin integration live; 250+ verified deals; proofs dashboard shipped | $10,000 |
| **M4** | 12 | 15K SDK downloads, 100K gateway clients, 5M CIDs, full Pinning Services + NDP conformance suites published | $10,000 |

Missed milestones trigger a 60-day cure period; failure to cure → remaining funds returned to the Foundation.

## 8. Open-source commitment

**Everything funded by this grant is Apache-2.0** on GitHub under `github.com/dnkefua/`. There is no open-core / closed-enterprise split — the commercial product runs on the same open primitives, differentiated by operational features (SLA, support, compliance tooling, managed Filecoin), not by source-code locks.

## 9. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Free gateway egress cost outpaces subsidy | Medium | Rate limits + Cloudflare Workers (near-zero egress) + aggressive edge caching |
| Solo-dev bus factor | Medium | Silent partner has code access + grant stipulates all code public from day 1 — Foundation can re-grant to another maintainer if needed |
| Filecoin deal reliability at small scale | Medium | Partner with 3+ SPs for redundancy; weekly retrieval tests; public scorecard |
| Abuse (illegal content on free gateway) | High | DMCA process + public abuse@ndnipfs.com + CID blocklist integration (Cloudflare + Badbits feed) |
| Pinning Services spec drift | Low | Track IPFS spec repo; file conformance gaps as upstream issues; maintain a compatibility matrix in docs |

## 10. Sustainability after the grant

The grant is explicitly **not** a runway subsidy. NDN Analytics' commercial business covers operating costs today and will continue to after the grant period. Grant funds are earmarked specifically for public-good outputs (SDKs, gateway, docs, conformance suite) that accelerate IPFS adoption beyond what NDN's commercial customers would directly fund.

Post-grant (Year 2+), the public gateway and SDKs continue to be maintained as a permanent line item in NDN Analytics' operating budget. If the Foundation wishes to re-engage for Year-2 scope (more regions, deeper Filecoin proofs, AI-model-registry standardization), we'd be glad to submit a follow-on proposal backed by the Y1 numbers.

## 11. Appendix

- System spec v2.0: [specs/system_spec.md](../specs/system_spec.md)
- NDN Data Protocol (NDP) v1.0 spec: [specs/ndp_protocol.md](../specs/ndp_protocol.md)
- Cover letter: [grants/COVER_LETTER.md](COVER_LETTER.md)
- Full budget: [grants/BUDGET.md](BUDGET.md)
- Milestone detail: [grants/MILESTONES.md](MILESTONES.md)
- Team: [grants/TEAM.md](TEAM.md)
- Live API health: https://ndn-api-1037328355027.us-west1.run.app/_health
- Live dashboard: https://ndn-dashboard-1037328355027.us-west1.run.app
