# IPFS Foundation Grant Application — NDN IPFS Chain

> **Program:** Implementations & Integrations
> **Applicant:** NDN Analytics (sole proprietor)
> **Contact:** Ndibe Kefua — nkefua@ndnanalytics.com — https://www.ndnanalytics.com
> **Repo:** https://github.com/dnkefua/ndn-ipfs-chain
> **Request:** $50,000 over 12 months
> **Submission date:** April 2026 (revision 2 — prototype upgrade)

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
| AI onboarding assistant (drafts schemas, queries, pin snippets in-console) | Live, Anthropic-backed, server-side proxy | Floating widget on every `/dashboard/*` route |
| Schema-template picker (7 curated JSON Schema Draft 2020-12 presets) | Live in the console's New-Collection flow | `/dashboard/records` |
| Web3 sign-in (Sign-In with Ethereum, EIP-4361) + email auth | Live, dual-mode | `/auth` |
| In-app docs (whitepaper + NDP spec rendered in the console) | Live, linked from marketing homepage | `/dashboard/docs` |

Reviewers are invited to hit the health and dashboard URLs directly; they return in under 500 ms from us-west1. Every item above corresponds to a concrete commit on the public `main` branch (latest: `a38cc2e4` — "Ship prototype: AI Assistant, SIWE auth, schema presets, in-app docs").

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
- **In-console AI onboarding assistant** (already live at grant submission; see §3). Grant work hardens it into an open-source component any IPFS provider can embed:
  - System prompt + tool definitions published under Apache-2.0 so any PSA v1.0 / NDP provider can drop it into their console without being locked to NDN's Anthropic relationship.
  - BYO-LLM: pluggable backend (Anthropic, OpenAI, local Ollama) behind one interface; the grant funds the abstraction layer, not the inference credits.
  - Evaluation set: 50 curated "developer asks an IPFS question" prompts with expected-output JSON fixtures, so competing LLM backends can be compared on protocol-correctness rather than vibes.
  - The assistant is explicitly a **floor-raising** tool — it turns the IPFS Pinning Services API and NDP from "read the 80-page spec" into "describe what you want and paste the result."

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

**Ndibe Kefua** — founder & sole developer, NDN Analytics LLC (Oklahoma, formed April 2026).

I'm going to be straightforward about what this application is and isn't, because the Foundation will find these facts anyway and I'd rather surface them than have them found.

**What I am:** a solo developer who, over roughly three months, shipped a production-deployed IPFS platform — multi-tenant Fastify API with a Pinning Services v1.0–compatible surface, Next.js 14 console, HuggingFace model importer, Postgres 16 schema on Cloud SQL, the NDP v1.0 specification document, a live reference implementation across three data planes, a working in-console AI onboarding assistant, SIWE wallet auth, and full GCP deployment pipeline. Every URL in §3 resolves. Every feature in the dashboard is traceable to a single public commit history. The repository and all derived artifacts are Apache-2.0.

**What I am not:** an operator with existing commercial revenue. NDN Analytics LLC was registered in Oklahoma this month; it has no current customers and no revenue subsidizing this work. The grant is not a top-up on an existing budget — it is the seed that funds the public-good deliverables (SDKs, public gateway, conformance suite, docs, AI-assistant open-sourcing) during a 12-month window while the commercial side of the platform (enterprise pinning, lifecycle, Filecoin, AI model registry) is brought to first revenue.

I have one silent partner — equity holder, no operational involvement, aware of and signed off on this application.

**What I'm backed by:** execution velocity and a shipped stack, not claims I can't substantiate. The commit graph is the résumé. If that isn't sufficient signal on its own, this grant isn't the right fit and I'd rather the Foundation fund someone who clears the bar on both dimensions. If it is sufficient signal, the $50K / 12-month / milestone-gated structure turns that velocity into public-good infrastructure the whole ecosystem uses.

See `grants/TEAM.md` for the full bio, the roles deliberately left open, and an honest account of what this entity can and can't do today.

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

NDN Analytics LLC has no current commercial revenue — the entity was formed this month. The grant is therefore being treated as the **seed funding** for the public-good workstream, not as a top-up to an existing budget. Post-grant sustainability depends on the commercial side of the platform — enterprise pinning tiers, managed Filecoin, AI model registry, and lifecycle tooling — reaching first paying customers during the 12-month grant window. The path to that is concrete:

1. **Months 1–6 — ship the public-good primitives** funded by this grant (SDKs, free gateway, conformance suite, tutorials, AI assistant open-sourcing). These are reviewed openly and are the primary grant deliverables.
2. **Months 3–12 — convert downstream demand into commercial pilots.** The SDKs and gateway create a funnel; enterprise pricing is live on the dashboard from day 1. A realistic target is 2–5 paying pilot accounts by M12 at $2K–$10K/mo each.
3. **Year 2+ — self-fund the public-good line items** (gateway infrastructure, docs hosting, SDK maintenance) from commercial ARR. These are low-cost-per-user workloads; a small number of paying accounts is enough to sustain them.

**Honest failure mode:** if the commercial side does not reach first revenue by M12, the public-good primitives delivered under this grant remain intact and Apache-2.0 — they would simply need a follow-on maintainer or a Y2 grant. The code, specs, and conformance suite outlive the entity that produced them. This is why the open-source + spec-contribution framing of the grant matters: the Foundation's investment creates durable public goods even in the downside case.

**If the Foundation prefers risk-reducing structure,** I am open to:
- A smaller Tranche 1 (e.g. $10K–$15K at M1 instead of $15K) to validate execution before larger tranches vest.
- A hard pause-and-review clause at M6 if milestone metrics are behind plan.
- Returning any unspent portion at grant end (contingency in particular) rather than treating it as indirect overhead.

Year 2 scope — more regions, deeper Filecoin proofs, AI-model-registry standardization — would be submitted as a separate follow-on proposal backed by Y1 delivery numbers and, ideally, commercial ARR evidence.

## 11. Appendix

- System spec v2.0: [specs/system_spec.md](../specs/system_spec.md)
- NDN Data Protocol (NDP) v1.0 spec: [specs/ndp_protocol.md](../specs/ndp_protocol.md)
- Cover letter: [grants/COVER_LETTER.md](COVER_LETTER.md)
- Full budget: [grants/BUDGET.md](BUDGET.md)
- Milestone detail: [grants/MILESTONES.md](MILESTONES.md)
- Team: [grants/TEAM.md](TEAM.md)
- Live API health: https://ndn-api-1037328355027.us-west1.run.app/_health
- Live dashboard: https://ndn-dashboard-1037328355027.us-west1.run.app
- Live in-console docs (whitepaper + NDP spec): https://ndn-dashboard-1037328355027.us-west1.run.app/dashboard/docs

## 12. What changed since revision 1

Revision 1 (commit `4c55d987`) introduced the NDP v1.0 spec and its reference implementation. Revision 2 (commit `a38cc2e4`) hardens the developer-facing surface that the grant explicitly funds:

- **AI onboarding assistant** — live in the console. Drafts JSON schemas, NDP query DSL filters, and pin snippets on request. Turns the "read the spec first" first-hour into a conversation.
- **Schema preset picker** — seven curated JSON Schema Draft 2020-12 templates (user-profile, product, order, event-log, article, telemetry, ipfs-pin) selectable at collection-creation time with inline editing.
- **SIWE (EIP-4361) sign-in** — the console now supports wallet auth as a first-class citizen, not just email. Critical for the web3-native developer audience the grant is written for.
- **In-app docs** — the whitepaper and NDP protocol spec are rendered inside the console at `/dashboard/docs`, so reviewers never leave the product to evaluate the spec. Downloadable as raw markdown.
- **Homepage → whitepaper link** — the marketing site now surfaces the whitepaper on the top nav and the primary CTA section.

These are **not** pivots; they are direct executions of §4.1–§4.4 of the grant plan, shipped early to prove the execution velocity claim in §6. The grant budget is unchanged.
