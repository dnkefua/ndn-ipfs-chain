# NDN IPFS Chain — Grant Milestones

**Duration:** 12 months (April 2026 – March 2027)
**Gates:** 4 milestones, each payment contingent on the gate below.

---

## Milestone 1 — SDK Foundation + Pinning Services API Conformance (Months 1–3)

**Payment on gate:** $15,000

### Deliverables

1. **`@ndnanalytics/ipfs` JS/TS SDK v1.0** published to npm
   - ESM + CJS + browser bundles
   - Full coverage of pins, analytics, API keys endpoints
   - WebCrypto AES-256-GCM client-side encryption opt-in
   - Streaming + tus resumable upload support
   - CI: unit tests, integration tests against live API, semver release
2. **`ndn-ipfs` Python SDK v1.0** published to PyPI
   - Sync + async clients (httpx)
   - Pydantic v2 models for every response type
   - Matches JS SDK feature-for-feature
3. **`ndn` CLI** released as single static binary on GitHub Releases
   - Core commands: `pin add`, `pin list`, `get`, `keys rotate`
   - Works against any Pinning Services v1.0–compatible backend
4. **Pinning Services API v1.0 conformance ≥ 80%**
   - Open-source conformance test suite published at `github.com/dnkefua/pinning-services-conformance`
   - NDN's own implementation passes 80% of the suite; remaining 20% tracked as GitHub issues with ETAs

### Gate criteria (must all hold)

- [ ] JS SDK downloadable from npm; `npm install @ndnanalytics/ipfs && node -e "require('@ndnanalytics/ipfs')"` exits 0
- [ ] Python SDK installable from PyPI; equivalent smoke import works
- [ ] CLI binary executes `ndn --version` on Linux, macOS, Windows
- [ ] Conformance suite is public; NDN passes 80%+ of the test cases
- [ ] Milestone report filed with links to npm, PyPI, GitHub Releases, conformance CI

### Targets hit by end of M1

- 500 combined npm + PyPI monthly downloads
- 50,000 CIDs pinned via NDN (beta users + dogfood)
- 50 GitHub stars across the three repos

---

## Milestone 2 — Public Gateway Live in 3 Regions (Months 4–6)

**Payment on gate:** $15,000

### Deliverables

1. **`gateway.ndnipfs.com`** serving traffic in us-west, eu-west, ap-southeast
   - Anycast DNS routes clients to nearest PoP
   - Cloudflare Workers + R2 fronting Cloud Run origins
   - Rate limits: 500 req/min/IP, 50 GB/mo/anonymous account
2. **Subdomain gateway** at `<cid>.ipfs.ndnipfs.com` conforming to the IPFS subdomain gateway specification (origin isolation for XSS safety)
3. **Trustless retrieval** — `?verify=true` flag that re-hashes content at the edge and returns `X-Ipfs-Verified: true|false` header
4. **Public status page** at `status.ndnipfs.com` with per-region uptime, p95 TTFB, error rate
5. **Listed on the IPFS public gateway checker** — PR to `ipfs/public-gateway-checker` repo merged
6. **Security audit complete** — third-party review of SDKs + API, findings remediated, report published publicly

### Gate criteria

- [ ] `curl -I https://gateway.ndnipfs.com/ipfs/bafkreibm...` returns 200 from 3 continents
- [ ] Subdomain gateway returns content at `bafkrei...ipfs.ndnipfs.com` with correct `Content-Type`
- [ ] `?verify=true` re-hashes and sets header correctly in >99% of requests
- [ ] Status page reports ≥ 99.5% uptime over the preceding 30-day window
- [ ] Gateway-checker PR merged
- [ ] Security audit findings: zero critical, all high severities remediated, report published

### Targets hit by end of M2

- 3,000 combined SDK monthly downloads
- 500,000 CIDs pinned
- 10,000 unique gateway clients/month
- 99.9% gateway uptime (rolling 30d)
- Gateway p95 TTFB < 400 ms (regional)

---

## Milestone 3 — Filecoin Integration + Proofs Dashboard (Months 7–9)

**Payment on gate:** $10,000

### Deliverables

1. **Filecoin broker service** integrated into the main API
   - Pins tagged `tier=filecoin` trigger CAR packing + Boost deal submission
   - Deal status polling + retry logic
   - SP selection across ≥ 3 partners, weighted by retrieval success history
2. **Proofs dashboard** at `dashboard.ndnipfs.com/proofs`
   - Per-CID deal list (proposed, active, expired)
   - PoSt verification status badges
   - Weekly retrieval test results surfaced as a public scorecard
3. **Automated deal renewal** — deals within 30 days of expiry auto-propose renewal to the highest-scoring available SP
4. **SP scorecard** published monthly at `ndnipfs.com/sp-scorecard`

### Gate criteria

- [ ] At least 250 active Filecoin deals created via NDN
- [ ] Proofs dashboard reachable publicly; sample user can view deal state
- [ ] Weekly retrieval test pass rate ≥ 98% across all partner SPs
- [ ] Renewal logic demonstrated on at least 10 deals
- [ ] SP scorecard published for ≥ 3 consecutive months

### Targets hit by end of M3

- 8,000 combined SDK monthly downloads
- 2,000,000 CIDs pinned
- 40,000 unique gateway clients/month
- 250 GB on Filecoin via NDN

---

## Milestone 4 — Year-1 Metrics + Full Conformance (Months 10–12)

**Payment on gate:** $10,000

### Deliverables

1. **Full Pinning Services API v1.0 conformance** — 100% of the public test suite passes
2. **5 published tutorials** at `docs.ndnipfs.com`:
   1. "Pin your first CID in 3 lines of JS"
   2. "Build a dApp with content-addressed storage"
   3. "Stream an AI model from IPFS directly into PyTorch"
   4. "Mirror any GitHub repo to IPFS via GitHub Actions"
   5. "Migrate off Pinata / Web3.Storage in 30 minutes"
3. **One conference talk delivered** and recording published (IPFS Thing or Devcon)
4. **Year-1 public report** at `github.com/dnkefua/ndn-ipfs-chain/grants/REPORT_Y1.md`
   - Every KPI in the application with actual vs. target
   - Lessons learned, what didn't work
   - Sustainability plan for Year 2+

### Gate criteria (end-of-year targets)

- [ ] 15,000 combined SDK monthly downloads (npm + PyPI)
- [ ] 5,000,000 CIDs pinned via NDN
- [ ] 100,000 unique public-gateway clients/month
- [ ] Gateway uptime ≥ 99.95% (rolling 90d)
- [ ] Gateway p95 TTFB < 250 ms
- [ ] 500 GB on Filecoin, 2,500 verified deals
- [ ] Pinning Services conformance suite: 100%
- [ ] 10,000 tracked tutorial completions
- [ ] Y1 public report filed

---

## Milestone summary

| # | Focus | Month | Payment | Gate headline |
|---|---|---:|---:|---|
| M1 | SDKs + conformance suite | 3 | $15,000 | 3 SDKs on npm/PyPI/GitHub + 80% spec conformance |
| M2 | Public gateway + security audit | 6 | $15,000 | 3-region gateway live, listed on IPFS checker, audit passed |
| M3 | Filecoin + proofs | 9 | $10,000 | 250+ verified deals, public SP scorecard |
| M4 | Y1 scale + docs | 12 | $10,000 | Full conformance, 15K SDK DL/mo, 5M CIDs, tutorials live |
| | | | **$50,000** | |

---

## Missed-milestone policy

If a milestone gate is not met by its scheduled month:

1. **60-day cure period** — the founder submits a revised plan within 14 days; Foundation either accepts, rejects, or amends.
2. **If cured** — payment proceeds against the revised gate.
3. **If not cured** — remaining unpaid milestones are forfeited; any unspent portion of disbursed funds is returned to the Foundation within 30 days.
4. **Public disclosure** — the public Y1 report includes every missed / cured / forfeited milestone with honest explanation. The goal is a clean track record that earns the right to a Year-2 proposal, not to hide failures.

---

*Prepared by: Nkefua Desmond, Founder — NDN Analytics Inc. (Tulsa, Oklahoma; based in Dubai)*
*Contact: nkefuan@yahoo.com · Twitter/X @dnkefua*
