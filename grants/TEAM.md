# Team

## Nkefua Desmond — Founder & Sole Developer

**Role:** Every role. Solo developer on NDN IPFS Chain.

**Background:** Founder of NDN Analytics LLC, an Oklahoma entity registered in April 2026. The company is early-stage and pre-revenue. NDN IPFS Chain is its first shipping product; the commercial tiers (enterprise pinning, managed Filecoin, AI model registry, lifecycle) are live on the dashboard but do not yet have paying customers.

The engineering practices the stack is built on — Node.js/Fastify, Postgres 16, Cloud Run, event-driven workers, multi-tenant auth + tenancy isolation, envelope encryption, tus resumable uploads — are areas the founder has worked in prior to forming NDN Analytics. The grant is not being used to learn these primitives; it is being used to turn already-shipped primitives into the **public-good layer** (SDKs, free gateway, conformance suite, tutorials, AI-assistant open-sourcing) that a commercial customer alone would not fund.

> *Note to reviewers: a fuller prior-work bio (employment, prior projects, open-source contributions) is available on request — it is deliberately kept out of this public document to avoid the appearance of inflating the solo-dev framing with credentials that are not directly relevant to the grant scope. Private résumé / LinkedIn / reference introductions available on request via `nkefuan@yahoo.com`.*

**What I built for this project, solo, in the last 3 months:**
- Multi-tenant Fastify REST API with JWT + API-key auth, tus resumable uploads, rate limiting, and Pinning Services v1.0–compatible surface. Live: `https://ndn-api-1037328355027.us-west1.run.app/_health`
- Next.js 14 App Router dashboard with 14 routes, dark/light theme, Tailwind design system, lucide icons. Live: `https://ndn-dashboard-1037328355027.us-west1.run.app`
- Postgres 16 schema with migrations (tenants, pins, API keys, triggers, models), deployed to Cloud SQL.
- HuggingFace model importer worker (model-registry pattern for IPFS-hosted AI weights).
- GCP deployment pipeline: Cloud Build + Artifact Registry + Cloud Run + Secret Manager (HF_API_KEY secret rotation, `/_health` alias for GFE interception workaround).
- System spec v2.0 in `specs/system_spec.md` (published in the public repo).
- Security hardening commits (envelope encryption pattern, tenant-spoofing fix in tus).

Commit history is public at `github.com/dnkefua/ndn-ipfs-chain`.

**Contact:**
- Primary email: nkefuan@yahoo.com
- Secondary email: nkefua@ndnanalytics.com *(website at `ndnanalytics.com` is deliberately not published until the grant is awarded — see note below)*
- Twitter / X: [@dnkefua](https://twitter.com/dnkefua) — "Blockchainer"
- GitHub: [@dnkefua](https://github.com/dnkefua) — repo: [ndn-ipfs-chain](https://github.com/dnkefua/ndn-ipfs-chain)

*A marketing site at `ndnanalytics.com` will be registered after grant award; before revenue, a vanity domain is not a responsible spend. All factual verification of the project today goes through the live Cloud Run URLs in §3 of the application, the public GitHub repository, and the Twitter handle above.*

---

## Silent Partner

One silent partner holds equity in NDN Analytics and is aware of this grant submission. No day-to-day operational involvement; no role in grant-funded work. Named to the Foundation privately on request for compliance but not published here.

---

## What's deliberately open — not-yet-hired roles

The grant does not fund hiring. These roles are acknowledged as gaps that would be filled post-grant, contingent on commercial revenue or a follow-on grant — not positions this grant is expected to cover:

| Role | Gap | Y2 plan |
|---|---|---|
| DevRel / technical writer | Tutorials and docs are founder-written in Y1; a DevRel contractor is on the Y2 wishlist | Commercial revenue or follow-on grant |
| Security researcher | One-time third-party audit is budgeted (see BUDGET §2.3); no in-house security hire | Y2 retainer if scale warrants |
| Gateway SRE | Solo founder on-call for the gateway in Y1; autoscaling + alerting sized so one person can sustain 99.95% | Hire when gateway clients exceed 250K/mo |

If any grant reviewer believes this is under-resourced for the stated deliverables, I would rather have that conversation before the award than after. The whole point of the $50K / solo-dev framing is to match the ask to what can honestly be delivered by one engineer over 12 months, with no padding for a team that does not yet exist.

---

## Advisors

**Open for recruitment during the grant period.** Ideal profile: one advisor with direct Pinning Services API / Kubo contributor experience, one with Filecoin SP operations experience. If any IPFS Foundation reviewers have referrals, introductions are welcome.

---

## Working practices

- **Source of truth:** GitHub. All grant-funded code is Apache-2.0 in public repos from day 1.
- **Commits:** Small, frequent, signed. PR history is the timesheet.
- **Releases:** Semver. npm/PyPI/GitHub Releases tagged identically.
- **Incidents:** Status page at `status.ndnipfs.com` with public post-mortems for any event > 30 minutes.
- **Reports:** Monthly to the Foundation program officer + public milestone summaries in `grants/` directory of the main repo.

---

*Last updated: April 2026*
*Contact: nkefuan@yahoo.com · Twitter/X @dnkefua*
