# NDN IPFS Chain — Grant Budget

**Total request:** $50,000 USD
**Duration:** 12 months (April 2026 – March 2027)
**Disbursement:** 4 milestone payments (see [MILESTONES.md](MILESTONES.md))

---

## 1. Budget overview

| Category | Amount | % of grant | Rationale |
|---|---:|---:|---|
| Founder engineering stipend | $20,000 | 40% | ~20 hrs/wk × 50 wks on grant-scope deliverables at $20/hr (well below market) |
| Public gateway infrastructure | $12,000 | 24% | Cloudflare Workers, anycast DNS, egress, 3 regional PoPs |
| Security audit (SDKs + API) | $7,000 | 14% | One third-party review at M2, fix-and-reverify |
| Filecoin deals (pilot storage) | $3,000 | 6% | 500 GB × 6 months via FIL+ with 3 SP partners |
| Developer education + docs hosting | $3,000 | 6% | Mintlify, domain, tutorial production, sample-app hosting |
| Domain + SSL + operational tooling | $1,500 | 3% | `ndnipfs.com` registration, wildcard cert, monitoring |
| Conference travel (1 trip, talks) | $2,000 | 4% | IPFS Thing or Devcon (SDK demo + feedback) |
| Contingency | $1,500 | 3% | Unallocated buffer; unused portion returned to Foundation |
| **TOTAL** | **$50,000** | **100%** | |

---

## 2. Detailed line items

### 2.1 Founder engineering stipend — $20,000

| Sub-item | Detail |
|---|---|
| Hours dedicated to grant scope | ~20 hrs/week × 50 weeks ≈ 1,000 hrs |
| Effective rate | $20/hr on grant scope — well below market |
| Scope boundary | Stipend compensates time spent on **public-good deliverables only** (SDKs, gateway, docs, conformance suite, AI-assistant open-sourcing). Time spent on commercial-tier features (enterprise pinning plans, private AI model hosting, etc.) is **not** charged against the grant. |
| Documentation | Timesheet + PR links submitted with each milestone report |

The stipend is deliberately set below market rate. NDN Analytics LLC is pre-revenue (entity registered April 2026), so the Foundation is not paying a fraction of an existing founder salary — the grant stipend is the founder's full compensation for grant-scope work over 12 months. Personal runway outside grant-scope hours is the founder's responsibility and is not part of this ask. If the commercial side of the platform reaches first revenue during the grant period, any commercial-tier work happens on the founder's own time and does not draw on grant funds.

### 2.2 Public gateway infrastructure — $12,000

| Item | Monthly | 12-month | Notes |
|---|---:|---:|---|
| Cloudflare Workers + R2 egress (primary CDN) | $400 | $4,800 | Near-zero egress via Workers + aggressive CID caching |
| Cloud Run gateway origin (3 regions: us-west, eu-west, ap-southeast) | $300 | $3,600 | Scale-to-zero, pay-per-request |
| Cloud SQL for gateway analytics + rate-limit state | $100 | $1,200 | Shared with main NDN stack (pro-rated) |
| Anycast DNS (Cloudflare) + wildcard SSL | $50 | $600 | `*.ipfs.ndnipfs.com` |
| Prometheus + Grafana Cloud (status page data) | $100 | $1,200 | Free tier insufficient at target traffic |
| Reserve for egress overage | $50 | $600 | Activated if unique clients/mo > target |
| **Subtotal** | **$1,000** | **$12,000** | |

Cost-per-request target at Y1 end: **< $0.00015** — within a 3× margin of Cloudflare's public gateway cost structure.

### 2.3 Security audit — $7,000

| Item | Cost | Timing |
|---|---:|---|
| Third-party code review of JS + Python SDKs | $3,500 | Month 6 |
| API pentest (OWASP top 10 + auth surface) | $2,500 | Month 6 |
| Fix-and-reverify round | $1,000 | Month 7 |
| **Subtotal** | **$7,000** | |

Findings + remediation summary published publicly at `github.com/dnkefua/ndn-ipfs-chain/security`.

### 2.4 Filecoin deals (pilot) — $3,000

| Item | Detail |
|---|---|
| Target storage | 500 GB × 6 months pinned via FIL+ |
| Partner SPs | Minimum 3, geographically distributed |
| Deal cost assumption | ~$1/GB-year at FIL+ rates (conservative) |
| Retrieval tests | Weekly, results pushed to proofs dashboard |

### 2.5 Developer education — $3,000

| Item | Cost |
|---|---:|
| Mintlify docs hosting (12 mo × $120) | $1,440 |
| Tutorial production (screen recording, editing, 5 tutorials) | $900 |
| Sample-app hosting + sponsored CodeSandbox templates | $360 |
| Stock assets + illustrations | $300 |
| **Subtotal** | **$3,000** |

### 2.6 Domain + operational tooling — $1,500

| Item | Cost |
|---|---:|
| `ndnipfs.com` domain registration (10-year) | $180 |
| Google Workspace (nkefua@ndnanalytics.com is existing; grant admin mailbox) | $120 |
| Monitoring (Sentry + Uptime Robot) — pro-rated grant share | $600 |
| GitHub Actions minutes (public repos) | $300 |
| Misc tooling | $300 |
| **Subtotal** | **$1,500** |

### 2.7 Conference travel — $2,000

One trip to IPFS Thing or Devcon (flight + hotel + registration) to deliver a 20-minute SDK demo and collect community feedback. Recording published publicly within 30 days of the talk.

### 2.8 Contingency — $1,500

3% buffer. Activation requires written disclosure to the Foundation. Any portion unused at M4 is returned to the Foundation.

---

## 3. What this budget explicitly does NOT include

To be upfront about scope boundaries:

- **Founder's non-grant-scope time** — personal runway during the grant period is the founder's responsibility and outside this ask.
- **Existing NDN Analytics infrastructure** — the Cloud Run / Cloud SQL / Secret Manager spend for the commercial-tier side of the platform (enterprise pinning, AI model registry, etc.) is modest at pre-revenue scale and is the founder's personal cost, not a grant line item.
- **Marketing beyond docs + one conference** — no paid ads, no PR firm, no sponsored content.
- **Legal incorporation** — NDN Analytics LLC was registered in Oklahoma in April 2026; formation fees were paid pre-application and are not part of this ask.
- **Hiring** — no FTE hires funded by this grant. If Year-2 scales, hiring is a Year-2 proposal contingent on commercial revenue or a follow-on grant.

If any of these items need coverage during the grant period, they will be deferred or covered out-of-pocket — not rolled into the grant ask.

---

## 4. Reporting

| Cadence | Artifact |
|---|---|
| Monthly | Short written update: milestone progress, spend-to-date, blockers. Submitted via email to assigned program officer. |
| Per milestone | Milestone report: deliverables shipped (links to repos, URLs, PRs), KPI snapshot against §5 of the application, timesheet summary, receipts for line items > $500. |
| Annually | Year-end summary: all KPIs against targets, lessons learned, sustainability plan for Year 2+, final accounting reconciliation. |

All reports will be published publicly at `github.com/dnkefua/ndn-ipfs-chain/grants` within 14 days of submission to the Foundation, so the broader community can see what the money bought.

---

## 5. Disbursement schedule

| Milestone | Month | Amount |
|---|---:|---:|
| M1 — SDKs v1.0 + Pinning Services API conformance ≥ 80% | 3 | $15,000 |
| M2 — Public gateway live in 3 regions | 6 | $15,000 |
| M3 — Filecoin integration + proofs dashboard | 9 | $10,000 |
| M4 — Y1 metrics hit (SDK / gateway / CID / conformance) | 12 | $10,000 |
| **Total** | | **$50,000** |

Missed milestones → 60-day cure period → if not cured, subsequent payments paused and unspent funds returned.

---

*Prepared by: Ndibe Kefua, NDN Analytics*
*Contact: nkefua@ndnanalytics.com*
