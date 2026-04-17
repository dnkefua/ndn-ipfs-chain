# Pricing

Simple, transparent, and aggressively priced. No credit card to start.

## Plans

| | **Free** | **Pro** | **Team** | **Enterprise** |
|---|---|---|---|---|
| Price | $0 | $19/mo | $199/mo | Custom |
| Storage included | 5 GB | 500 GB | 5 TB | Negotiated |
| Storage overage | — | $0.008/GB-mo | $0.006/GB-mo | $0.004/GB-mo |
| Bandwidth included | 50 GB | 2 TB | 20 TB | Negotiated |
| Bandwidth overage | $0.04/GB | $0.02/GB | $0.01/GB | $0.005/GB |
| Replication (default) | 3 | 3 | 5 | 5–9 |
| Regions | 1 | 3 | 7 | 7 + BYO |
| Client-side encryption | ✅ | ✅ | ✅ | ✅ |
| Lifecycle policies | 1 | 10 | 100 | Unlimited |
| Smart-contract triggers | 1 | 10 | 100 | Unlimited |
| SLA | best-effort | 99.9% | 99.95% | 99.99% + credits |
| Filecoin cold storage | — | ✅ | ✅ | ✅ |
| Private swarm | — | — | — | ✅ |
| SOC 2 / HIPAA BAA | — | — | — | ✅ |
| SSO (SAML/OIDC) | — | — | ✅ | ✅ |
| Support | community | email | priority | dedicated Slack + CSM |

## Usage-based pricing (metered)

All plans meter:
- **Hot storage**: GB-month
- **Warm storage**: GB-month (tiered, cheaper)
- **Cold storage (Filecoin)**: GB-month (cheapest)
- **Bandwidth**: GB egress
- **Requests**: reads + writes (free up to 1M/mo)

## Pricing examples

### Indie dev, small NFT project
- 20 GB hot storage, 200 GB/mo bandwidth
- Free tier covers storage, $6 bandwidth → **~$6/mo**

### Mid-size dApp, 500k MAU
- 2 TB hot, 20 TB/mo bandwidth, 5 regions
- Team plan + 0 overage → **$199/mo**

### Pharma enterprise, 7-year retention
- 50 TB hot, 500 TB cold (Filecoin), HIPAA, EU residency
- Enterprise custom → **~$4–8k/mo** (vs. S3 + custom ~$25k/mo)

## Free tier philosophy

We want IPFS to win. The free tier is generous on purpose:
- 5 GB / 50 GB egress is enough for hackathons, teaching, and prototypes.
- No credit card. No trial expiration.
- Rate-limited, not feature-limited.

Students and researchers: email `students@ndnanalytics.com` for an auto-upgraded 50 GB / 500 GB plan, no cost.

## Compared to alternatives

| Service | 1 TB hot + 5 TB egress/mo | Notes |
|---|---:|---|
| AWS S3 Standard + CloudFront | ~$450 | No IPFS, no Filecoin |
| Pinata Pro | ~$250 + caps | $20/mo floor, limited regions |
| Web3.Storage | N/A | Sunset Sept 2024 |
| Filebase | ~$140 | Limited regions, no encryption |
| **NDN Team** | **$199 flat** | Everything included |

## Payment
- Credit card (Stripe): monthly or annual.
- Wire transfer / PO: annual only, $10k+.
- **Crypto:** USDC on Base / Arbitrum / Polygon — 2% discount.
- Filecoin FIL: at spot, Enterprise only.

## Enterprise contracts include
- Dedicated CSM + Slack channel.
- Quarterly architecture reviews.
- DPA + BAA + SCCs.
- Source-code escrow.
- Custom regions / on-prem / air-gapped options.
