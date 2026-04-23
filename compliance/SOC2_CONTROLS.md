# SOC 2 Type II Controls Matrix

**Organization:** NDN Analytics Inc.  
**System:** NDN IPFS Chain  
**Document Version:** 1.0  
**Last Updated:** 2026-04-23  

---

## Trust Service Criteria (TSC) Mapping

### CC1: Control Environment

| Control ID | Control Description | Implementation | Evidence Location |
|------------|---------------------|----------------|-------------------|
| CC1.1 | COSO Principle 1: Board oversight | Board charter, quarterly reviews | `governance/board-charter.md` |
| CC1.2 | COSO Principle 2: Accountability | Role definitions, org chart | `governance/org-chart.md` |
| CC1.3 | COSO Principle 3: Structure | Reporting lines, RACI matrix | `governance/raci-matrix.md` |
| CC1.4 | COSO Principle 4: Competence | Hiring standards, training records | `hr/training-requirements.md` |
| CC1.5 | COSO Principle 5: Accountability | Performance reviews, disciplinary | `hr/performance-review-template.md` |

### CC2: Communication and Information

| Control ID | Control Description | Implementation | Evidence Location |
|------------|---------------------|----------------|-------------------|
| CC2.1 | Internal communication | Slack, team meetings, docs | `governance/communication-policy.md` |
| CC2.2 | External communication | Support channels, status page | `governance/external-comms.md` |
| CC2.3 | Information quality | Data validation, reconciliation | `engineering/data-validation.md` |

### CC3: Risk Assessment

| Control ID | Control Description | Implementation | Evidence Location |
|------------|---------------------|----------------|-------------------|
| CC3.1 | Objective setting | OKRs, strategic planning | `governance/okrs.md` |
| CC3.2 | Risk identification | Risk register, threat modeling | `security/risk-register.md` |
| CC3.3 | Risk analysis | Impact/likelihood assessment | `security/risk-register.md` |
| CC3.4 | Risk response | Mitigation, acceptance, transfer | `security/risk-register.md` |
| CC3.5 | Change management | RFC process, change log | `governance/change-management.md` |

### CC4: Monitoring Activities

| Control ID | Control Description | Implementation | Evidence Location |
|------------|---------------------|----------------|-------------------|
| CC4.1 | Ongoing monitoring | Metrics dashboards, alerts | `monitoring/dashboards/` |
| CC4.2 | Separate evaluations | Internal audits, pen tests | `security/audit-reports/` |
| CC4.3 | Deficiency reporting | Incident tracking, remediation | `security/incident-log.md` |

### CC5: Control Activities

| Control ID | Control Description | Implementation | Evidence Location |
|------------|---------------------|----------------|-------------------|
| CC5.1 | Selection of controls | Risk-based control framework | `security/controls-framework.md` |
| CC5.2 | Policies and procedures | Documented policies | `policies/` |
| CC5.3 | Technology controls | Access control, encryption | `security/technical-controls.md` |
| CC5.4 | Deployment controls | CI/CD, change approval | `engineering/deployment-process.md` |

### CC6: Logical and Physical Access

| Control ID | Control Description | Implementation | Evidence Location |
|------------|---------------------|----------------|-------------------|
| CC6.1 | Logical access security | MFA, SSO, RBAC | `security/access-control.md` |
| CC6.2 | Prior to registration | Background checks | `hr/background-check-policy.md` |
| CC6.3 | Authorization | Least privilege, need-to-know | `security/access-control.md` |
| CC6.4 | Internal/external users | Contractor agreements | `hr/contractor-security.md` |
| CC6.5 | Unauthorized access | WAF, rate limiting, IDS | `security/network-security.md` |
| CC6.6 | Prior to access | Security training | `hr/security-training.md` |
| CC6.7 | Access removal | Offboarding checklist | `hr/offboarding-checklist.md` |
| CC6.8 | Physical access | Data center controls (AWS/GCP) | `vendor-aws-soc2.pdf` |

### CC7: System Operations

| Control ID | Control Description | Implementation | Evidence Location |
|------------|---------------------|----------------|-------------------|
| CC7.1 | Detect and respond | Incident response plan | `security/incident-response.md` |
| CC7.2 | Recovery | DR plan, backups | `security/disaster-recovery.md` |
| CC7.3 | Change management | RFC, approval workflow | `governance/change-management.md` |
| CC7.4 | Vendor management | Vendor risk assessments | `vendor-management.md` |
| CC7.5 | Monitoring | Log aggregation, alerting | `monitoring/architecture.md` |

### CC8: Change Management

| Control ID | Control Description | Implementation | Evidence Location |
|------------|---------------------|----------------|-------------------|
| CC8.1 | Change authorization | PR review, approval | `engineering/code-review.md` |
| CC8.2 | Change documentation | Commit messages, changelog | `CHANGELOG.md` |
| CC8.3 | Change testing | Automated tests, staging | `engineering/testing-strategy.md` |

### CC9: Risk Mitigation

| Control ID | Control Description | Implementation | Evidence Location |
|------------|---------------------|----------------|-------------------|
| CC9.1 | Business continuity | BCP documentation | `security/business-continuity.md` |
| CC9.2 | Disaster recovery | DR testing, RTO/RPO | `security/disaster-recovery.md` |
| CC9.3 | Incident management | Runbooks, escalation | `security/incident-runbooks/` |

---

## Security Domain Controls

### SEC1: Identity and Access Management

| Control ID | Control Description | Frequency | Owner |
|------------|---------------------|-----------|-------|
| SEC1.1 | MFA required for all systems | Continuous | Security |
| SEC1.2 | Access reviews | Quarterly | Security |
| SEC1.3 | Privileged access management | Continuous | Security |
| SEC1.4 | Service account management | Continuous | Platform |
| SEC1.5 | API key rotation | 90 days | Platform |

### SEC2: Data Protection

| Control ID | Control Description | Frequency | Owner |
|------------|---------------------|-----------|-------|
| SEC2.1 | Encryption at rest (AES-256) | Continuous | Platform |
| SEC2.2 | Encryption in transit (TLS 1.3) | Continuous | Platform |
| SEC2.3 | Key management (envelope) | Continuous | Security |
| SEC2.4 | Data classification | Annual | Security |
| SEC2.5 | DLP controls | Continuous | Security |
| SEC2.6 | Crypto-shredding for GDPR | On-demand | Platform |

### SEC3: Network Security

| Control ID | Control Description | Frequency | Owner |
|------------|---------------------|-----------|-------|
| SEC3.1 | Network segmentation | Continuous | Platform |
| SEC3.2 | Firewall rules | Continuous | Platform |
| SEC3.3 | IDS/IPS | Continuous | Security |
| SEC3.4 | DDoS protection | Continuous | Platform |
| SEC3.5 | WAF rules | Continuous | Security |

### SEC4: Vulnerability Management

| Control ID | Control Description | Frequency | Owner |
|------------|---------------------|-----------|-------|
| SEC4.1 | Vulnerability scanning | Weekly | Security |
| SEC4.2 | Penetration testing | Annual | Security |
| SEC4.3 | Patch management | Monthly | Platform |
| SEC4.4 | Dependency scanning | Continuous | Engineering |
| SEC4.5 | Bug bounty program | Continuous | Security |

### SEC5: Security Monitoring

| Control ID | Control Description | Frequency | Owner |
|------------|---------------------|-----------|-------|
| SEC5.1 | SIEM aggregation | Continuous | Security |
| SEC5.2 | Alerting thresholds | Continuous | Security |
| SEC5.3 | Log retention (1 year) | Continuous | Platform |
| SEC5.4 | Audit trail integrity | Continuous | Platform |
| SEC5.5 | Merkle root anchoring | Daily | Platform |

---

## Availability Domain Controls

### AVA1: Infrastructure

| Control ID | Control Description | Target | Current |
|------------|---------------------|-------|---------|
| AVA1.1 | Uptime SLA | 99.99% | 99.95% |
| AVA1.2 | Multi-region deployment | 3 regions | 1 region |
| AVA1.3 | Auto-scaling | Enabled | Enabled |
| AVA1.4 | Load balancing | Enabled | Enabled |
| AVA1.5 | CDN caching | Enabled | Enabled |

### AVA2: Capacity Management

| Control ID | Control Description | Frequency | Owner |
|------------|---------------------|-----------|-------|
| AVA2.1 | Capacity planning | Quarterly | Platform |
| AVA2.2 | Performance testing | Per-release | Engineering |
| AVA2.3 | Resource monitoring | Continuous | Platform |
| AVA2.4 | Throttling/rate limiting | Continuous | Platform |

### AVA3: Disaster Recovery

| Control ID | Control Description | Target | Test Frequency |
|------------|---------------------|-------|----------------|
| AVA3.1 | RTO (Recovery Time) | 4 hours | Quarterly |
| AVA3.2 | RPO (Recovery Point) | 1 hour | Quarterly |
| AVA3.3 | Backup verification | Daily | Daily |
| AVA3.4 | DR testing | Annual | Annual |

---

## Processing Integrity Controls

### PI1: Data Validation

| Control ID | Control Description | Implementation |
|------------|---------------------|----------------|
| PI1.1 | Input validation (zod schemas) | All API endpoints |
| PI1.2 | CID validation | All pin operations |
| PI1.3 | Schema enforcement | Database constraints |
| PI1.4 | Data quality monitoring | Dashboard alerts |

### PI2: Processing Accuracy

| Control ID | Control Description | Implementation |
|------------|---------------------|----------------|
| PI2.1 | Checksum verification | All uploads |
| PI2.2 | Replication verification | Cluster sync |
| PI2.3 | Merkle proof verification | Gateway retrieval |
| PI2.4 | Audit logging | All mutations |

---

## Confidentiality Controls

### CONF1: Data Classification

| Classification | Description | Handling Requirements |
|---------------|-------------|----------------------|
| Public | Marketing, docs | No restrictions |
| Internal | Business ops | Employee access only |
| Confidential | Customer data | Need-to-know, encrypted |
| Restricted | Keys, secrets | HSM/Vault, audited access |

### CONF2: Data Residency

| Control ID | Control Description | Implementation |
|------------|---------------------|----------------|
| CONF2.1 | Regional pinning | 7 regions supported |
| CONF2.2 | GDPR residency lock | EU region enforcement |
| CONF2.3 | Data sovereignty | Customer-configurable |

---

## Privacy Domain Controls

### P1: Notice

| Control ID | Control Description | Implementation |
|------------|---------------------|----------------|
| P1.1 | Privacy policy | Published on website |
| P1.2 | Data collection notice | Signup flow |
| P1.3 | Cookie consent | Cookie banner |

### P2: Choice and Consent

| Control ID | Control Description | Implementation |
|------------|---------------------|----------------|
| P2.1 | Opt-in consent | Marketing communications |
| P2.2 | Opt-out mechanism | Unsubscribe links |
| P2.3 | Consent management | Preferences dashboard |

### P3: Collection Limitation

| Control ID | Control Description | Implementation |
|------------|---------------------|----------------|
| P3.1 | Data minimization | Only necessary fields |
| P3.2 | Purpose specification | Privacy policy |
| P3.3 | Consent for new uses | Re-consent workflow |

### P4: Data Quality

| Control ID | Control Description | Implementation |
|------------|---------------------|----------------|
| P4.1 | Accuracy | User-editable profiles |
| P4.2 | Completeness | Validation rules |
| P4.3 | Timeliness | Real-time updates |

### P5: Use, Retention, Disposal

| Control ID | Control Description | Implementation |
|------------|---------------------|----------------|
| P5.1 | Use limitation | Purpose enforcement |
| P5.2 | Retention schedule | 7 years default |
| P5.3 | Secure disposal | Crypto-shredding |

### P6: Access

| Control ID | Control Description | Implementation |
|------------|---------------------|----------------|
| P6.1 | Data subject access | Export functionality |
| P6.2 | Correction | Self-service edit |
| P6.3 | Portability | JSON/CSV export |

### P7: Disclosure

| Control ID | Control Description | Implementation |
|------------|---------------------|----------------|
| P7.1 | Third-party vetting | Vendor assessments |
| P7.2 | DPAs | Standard clauses |
| P7.3 | Breach notification | 72-hour process |

### P8: Monitoring and Enforcement

| Control ID | Control Description | Implementation |
|------------|---------------------|----------------|
| P8.1 | Privacy training | Annual requirement |
| P8.2 | Complaint handling | Support workflow |
| P8.3 | Auditing | Annual privacy audit |

---

## Compliance Evidence Collection

### Automated Evidence

The following evidence is collected automatically:

1. **Access Logs**: All authentication events stored in `audit_logs` table
2. **Change Logs**: Git commit history, deployment records
3. **Metrics**: Prometheus/Grafana dashboards
4. **Alerts**: PagerDuty incident history
5. **Merkle Anchors**: On-chain proof in `crypto_shred_anchors` table

### Manual Evidence

The following evidence requires manual collection:

1. **Training Records**: HR system exports
2. **Meeting Minutes**: Governance documentation
3. **Vendor Assessments**: Security questionnaires
4. **Penetration Test Reports**: Third-party assessments
5. **Customer Complaints**: Support ticket analysis

---

## Audit Trail Schema

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  metadata JSONB,
  user_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX audit_logs_tenant ON audit_logs(tenant_id, created_at);
CREATE INDEX audit_logs_action ON audit_logs(action);
CREATE INDEX audit_logs_resource ON audit_logs(resource_type, resource_id);
```

---

## Merkle Root Anchoring

Daily Merkle roots are anchored to L2 blockchains for tamper-evident audit trails:

| Chain | Contract Address | Anchoring Frequency |
|-------|-----------------|---------------------|
| Base | `0x...` | Daily 2 AM UTC |
| Arbitrum | `0x...` | Daily 2 AM UTC |
| Optimism | `0x...` | Daily 2 AM UTC |

Verification: Query `crypto_shred_anchors` table and verify on-chain.

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-23 | Security Team | Initial SOC 2 controls matrix |
