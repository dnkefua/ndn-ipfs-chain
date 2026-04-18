# Team

## Ndibe Kefua — Founder & Sole Developer

**Role:** Every role. Solo developer on NDN IPFS Chain.

**Background:** Founder of NDN Analytics, operating commercial infrastructure since 2023. Primary lines of business:
- **TraceChain** — pharmaceutical provenance (serialization + chain-of-custody, running in production).
- **Healthcare-data pipelines** — ingestion, normalization, and analytics for healthcare providers.

Those commercial products run on the same foundational engineering practices that NDN IPFS Chain is built on (Node.js, Postgres, Kubernetes, Cloud Run, event-driven workers, strong auth + tenancy isolation). The commercial revenue directly subsidizes ~80% of NDN IPFS Chain's operating cost, which is why the grant ask is scoped to **public-good deliverables only** rather than to total project cost.

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
- Email: nkefua@ndnanalytics.com
- Website: https://www.ndnanalytics.com
- GitHub: https://github.com/dnkefua

---

## Silent Partner

One silent partner holds equity in NDN Analytics and is aware of this grant submission. No day-to-day operational involvement; no role in grant-funded work. Named to the Foundation privately on request for compliance but not published here.

---

## What's deliberately open — not-yet-hired roles

The grant does not fund hiring. These roles are acknowledged as gaps that the commercial business will fill as revenue grows, not as positions this grant is expected to cover:

| Role | Gap | Y2 plan |
|---|---|---|
| DevRel / technical writer | Tutorials and docs will be founder-written in Y1; a DevRel contractor is on the Y2 wishlist | Commercial revenue or follow-on grant |
| Security researcher | One-time third-party audit is budgeted (see BUDGET §2.3); no in-house security hire | Y2 retainer if scale warrants |
| Gateway SRE | Solo founder on-call for gateway in Y1; autoscaling + alerting sized so one person can sustain 99.95% | Hire when gateway clients > 250K/mo |

If any grant reviewer believes this is under-resourced for the stated deliverables, I'd rather have that conversation before the award than after. The whole point of the $50K / solo-dev framing is to match the ask to what can honestly be delivered.

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
*Contact: nkefua@ndnanalytics.com*
