# NDN IPFS Chain Grant Budget Breakdown

**Total Grant Amount:** $150,000 USD  
**Project Duration:** 12 months  
**Budget Period:** April 2026 – March 2027

---

## 1. Personnel (80,000 USD / 53.3%)

| Role | FTE | Monthly Cost | 12-Month Cost | Notes |
|------|-----|--------------|---------------|-------|
| CTO / Lead Architect | 1.0 | $8,000 | $96,000 | Full-time, 10+ yrs experience, part ownership equity offset |
| Senior Backend Engineer | 1.0 | $6,500 | $78,000 | Filecoin integration lead |
| Full-Stack Engineer | 1.0 | $5,500 | $66,000 | Dashboard, SDKs |
| DevOps / Infrastructure | 1.0 | $5,000 | $60,000 | Kubernetes, monitoring |
| **Personnel Subtotal** | **4.0** | **$25,000** | **$300,000** | *Without equity offsets* |
| **Equity Offset** | — | — | ($220,000) | *CTO 30% + 2 engineers 10% each* |
| **Personnel Grant Allocation** | — | — | **$80,000** | *Cash contribution to cover salary gaps* |

### Notes
- Core team committed part-time with equity incentives to achieve 4 FTE output on $80K budget
- Remaining salary gaps covered by founder & early-stage investment
- Budget funds hiring contractor roles (QA, security) as-needed

---

## 2. Infrastructure & Cloud (30,000 USD / 20%)

| Item | Unit Cost | Monthly | 12-Month Cost | Purpose |
|------|-----------|---------|---------------|---------|
| **Cloud Compute (AWS/GCP)** | | | |
| API Servers (3 regions) | $1,000/mo | $1,500 | $18,000 | Fastify + PostgreSQL |
| IPFS Cluster Nodes (3) | $800/mo | $1,000 | $12,000 | Kubo peers + cluster coordinator |
| Filecoin Deal Broker | $300/mo | $300 | $3,600 | Boost client + orchestrator |
| **Cloud Subtotal** | | $2,800 | $33,600 | |
| **Filecoin Deals** | | | |
| Planned storage (100 TB/mo × 6 months) | $50/TB | $5,000 | $30,000 | Proofs dashboard pilot program |
| **Filecoin Subtotal** | | $5,000 | $30,000 | *Separate allocation expected* |
| **Other Infrastructure** | | | |
| Monitoring & Logging (Datadog) | $200/mo | $200 | $2,400 | Observability |
| DNS & CDN (Cloudflare) | $100/mo | $100 | $1,200 | Anycasting, DDoS protection |
| Database Backups (backups.io) | $50/mo | $50 | $600 | PostgreSQL snapshots |
| **Other Subtotal** | | $350 | $4,200 | |
| **Infrastructure Grant Total** | | **$3,150** | **$30,000** | |

### Notes
- **Filecoin storage:** Assumed $50/TB/month at pilot scale; may negotiate lower rates with SPs
- **Cloud compute:** Right-sized for 500K pins at project end
- Cost per pin: $0.001 at scale

---

## 3. Security & Compliance (15,000 USD / 10%)

| Item | Cost | Frequency | Notes |
|------|------|-----------|-------|
| Third-Party Security Audit | $8,000 | 1x (Month 6) | Code review + penetration test |
| Smart Contract Audit (ERC-721 trigger) | $4,000 | 1x (Month 8) | Formal verification |
| GDPR Compliance Consultation | $2,000 | 1x (Month 3) | Legal review + privacy policy |
| SSL/TLS Certificates | $500 | 1x renewal (Month 10) | Let's Encrypt + wildcard |
| Penetration Testing (annual retainer) | $1,000 | 1x (Month 12) | Ongoing vulnerability scan |
| **Security Subtotal** | **$15,500** | | |
| **Grant Allocation** | **$15,000** | | *Rounded down* |

### Notes
- Security-first approach to build trust with enterprise users
- Annual audit + retainer establishes responsible disclosure program

---

## 4. Operations & DevOps (15,000 USD / 10%)

| Category | Monthly | 12-Month | Notes |
|----------|---------|----------|-------|
| **Incident Response & Support** | $500 | $6,000 | On-call rotation + SLA breaches |
| **Operational Tooling** | | |  |
| – GitHub Enterprise | $50/mo | $600 | Private repos, branch protection |
| – Slack workspace (pro) | $80/mo | $960 | Team communication |
| – Linear (project tracking) | $100/mo | $1,200 | Issue management |
| **CI/CD & Testing** | | |  |
| – GitHub Actions (self-hosted) | $200/mo | $2,400 | Build + deploy automation |
| – Testing infrastructure | $300/mo | $3,600 | Integration test VMs |
| **Documentation** | | |  |
| – ReadTheDocs hosting | $50/mo | $600 | API docs + tutorials |
| **Contingency** | $200/mo | $2,400 | Unexpected operational costs |
| **Operations Subtotal** | **$1,480** | **$17,860** | |
| **Grant Allocation** | | **$15,000** | *Prioritize incident response* |

---

## 5. Marketing & Developer Relations (10,000 USD / 6.7%)

| Activity | Cost | Frequency | Impact |
|----------|------|-----------|--------|
| **Content Creation** | | |  |
| Technical blog posts | $500 | 4x (quarterly) | $2,000 | Community education |
| Video tutorials (JS/Python/Go SDKs) | $2,000 | 1x (Month 4) | SDK onboarding |
| Whitepaper (Filecoin integration) | $1,500 | 1x (Month 5) | Technical credibility |
| **Conference & Events** | | |  |
| NFT.NYC booth + sponsorship | $3,000 | 1x (June) | Web3 audience |
| IPFS Camp attendance | $2,000 | 1x (October) | Community visibility |
| Filecoin Liftoff event | $1,000 | 1x (September) | Sp partnerships |
| **Community Programs** | | |  |
| GitHub Sponsors matching | $500 | Monthly | $6,000 | Support open development |
| Community grants (integration partners) | $1,000 | Quarterly | $4,000 | Ecosystem building |
| **Marketing Subtotal** | | | **$20,000** | |
| **Grant Allocation** | | | **$10,000** | *Focus on content & partnerships* |

### Notes
- Bootstrapped founder contributes sweat equity for events
- Strategy: Build credibility through technical content, not paid ads

---

## 6. Legal & Compliance (5,000 USD / 3.3%)

| Item | Cost | Frequency | Purpose |
|------|------|-----------|---------|
| Business Registration (C-Corp) | $500 | 1x (Month 1) | Delaware incorporation |
| Terms of Service & Privacy Policy | $1,500 | 1x (Month 2) | Legal templates + review |
| Blockchain Compliance Review | $2,000 | 1x (Month 6) | Crypto payment regulations |
| Insurance (E&O + D&O) | $500 | 1x annual (Month 8) | Professional liability |
| **Legal Subtotal** | **$5,000** | | |
| **Grant Allocation** | **$5,000** | | |

---

## 7. Contingency (5,000 USD / 3.3%)

| Risk | Reserve | Notes |
|------|---------|-------|
| Unexpected infrastructure costs | $2,000 | Scaling beyond projections |
| Emergency staff augmentation | $2,000 | Contractor to cover gaps |
| Regulatory changes | $1,000 | Compliance adjustments |
| **Contingency Total** | **$5,000** | **3.3% of budget** |

### Notes
- Held in reserve; only allocated if approved by grant monitor
- Any remaining contingency returned to IPFS Foundation

---

## Grant Budget Summary

```
┌─────────────────────────────────┬─────────┬──────────┐
│ Category                        │ Amount  │ % Total  │
├─────────────────────────────────┼─────────┼──────────┤
│ Personnel (4 FTE salary support)│ $80,000 │  53.3%   │
│ Infrastructure & Cloud          │ $30,000 │  20.0%   │
│ Security & Compliance           │ $15,000 │  10.0%   │
│ Operations & DevOps             │ $15,000 │  10.0%   │
│ Marketing & DevRel              │ $10,000 │   6.7%   │
│ Legal & Compliance              │  $5,000 │   3.3%   │
│ Contingency                     │  $5,000 │   3.3%   │
├─────────────────────────────────┼─────────┼──────────┤
│ **TOTAL GRANT REQUEST**         │**$150K**│ **100%** │
└─────────────────────────────────┴─────────┴──────────┘
```

---

## Unmet Funding Gaps (Team Equity & Sweat)

To achieve 4 FTE output, the team is providing:

| Item | Value | Source |
|------|-------|--------|
| CTO salary gap | $96,000 | 30% equity stake (founder) |
| Sr. Backend Engineer | $66,000 | 10% equity stake (co-founder) |
| Full-Stack Engineer | $60,000 | 10% equity stake (early hire) |
| Prior development work (pre-grant) | $40,000 | Founder investment (3 months) |
| **In-Kind Contribution** | **$262,000** | |
| **Total Project Value** | **$412,000** | Grant + equity |

### Sustainability
Post-grant (Month 12+), the company will be self-sustaining via:
- SaaS subscription revenue ($50K/month target by end of M4)
- Filecoin revenue share (network incentives)
- Enterprise support contracts
- Storage cost arbitrage (buy wholesale, resell at margin)

---

## Monthly Cash Flow Projection

| Month | Salary | Infrastructure | Other | Total Spend | Runway |
|-------|--------|-----------------|-------|------------|--------|
| M1 | $25,000 | $3,500 | $2,000 | $30,500 | $119,500 |
| M2 | $25,000 | $3,500 | $2,000 | $30,500 | $89,000 |
| M3 | $25,000 | $3,500 | $2,500 | $31,000 | $58,000 |
| M4–M12 | $25,000/mo | $3,500/mo | $1,500–3,000/mo | ~$30K/mo | Recharged by revenue |

**Burn Rate:** $30.5K/month  
**Runway:** 4.9 months (conservative)  
**Revenue Inflection:** Month 4 (target $5K MRR) allows extending runway

---

## Reporting & Accountability

- **Monthly reports** to IPFS Foundation with milestone progress, spend, and KPI tracking
- **Quarterly reviews** with video demo of working features
- **Annual audit** of grant spend with receipts and invoices
- **Open-source commitment:** Code published under Apache 2.0 + community feedback incorporated

---

*Prepared by: NDN Analytics Foundation*  
*Date: April 17, 2026*  
*Contact: hello@ndnanalytics.com*
