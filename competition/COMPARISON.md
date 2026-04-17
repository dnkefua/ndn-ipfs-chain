# Competitive Comparison

Last updated: 2026-04-17. Sources: vendor public pricing/docs, independent testing. Corrections: competitive@ndnanalytics.com.

## Summary table

| Feature / Capability | **NDN IPFS Chain** | Pinata | Web3.Storage (w3up) | NFT.Storage | Filebase | Infura IPFS | Fleek |
|---|---|---|---|---|---|---|---|
| **Free tier** | 5 GB storage + 50 GB egress | 1 GB | 5 GB, being deprecated | NFT-only, being deprecated | 5 GB | 5 GB | 50 GB bandwidth |
| **Entry paid tier** | $19/mo (usage after) | $20/mo | Usage-based | N/A | $5.99 | $50/mo | $15/mo |
| **Pinning Services API v1.0** | ✅ | ✅ | partial | ❌ | ❌ | ❌ | ❌ |
| **Resumable uploads (tus)** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Client-side E2E encryption** | ✅ native AES-256-GCM | add-on | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Crypto-shredding (GDPR)** | ✅ Merkle-anchored proof | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Smart-contract pin triggers** | ✅ EVM + Solana | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Lifecycle policies (auto-tier)** | ✅ declarative | ❌ | ❌ | ❌ | partial | ❌ | ❌ |
| **Filecoin deals** | ✅ + proofs dashboard | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Arweave mirror option** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Regional data residency lock** | ✅ 7 regions | ❌ | ❌ | ❌ | partial | ❌ | partial |
| **Subdomain gateway** | ✅ `<cid>.ipfs.ndnipfs.link` | ✅ | partial | ✅ | ❌ | ❌ | partial |
| **Trustless retrieval (re-hash)** | ✅ `?verify=true` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CAR streaming** | ✅ | partial | ✅ | partial | ❌ | ❌ | ❌ |
| **Token-gated retrieval (ERC-721/1155)** | ✅ | add-on | ❌ | ❌ | ❌ | ❌ | ❌ |
| **SIWE authentication** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Custom domain + TLS** | ✅ | ✅ | ❌ | ❌ | partial | ❌ | ✅ |
| **SLA** | 99.99% + credits | 99.9% | best-effort | best-effort | 99.9% | 99.9% | 99.9% |
| **SOC 2 Type II** | roadmap Q3 | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **HIPAA BAA** | roadmap Q4 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **GDPR / EU residency** | ✅ EU-only API endpoint | unclear | unclear | unclear | partial | unclear | unclear |
| **Public status page** | ✅ per-region | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Open-source SDK (JS)** | ✅ Apache-2.0 | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Open-source SDK (Python)** | ✅ Apache-2.0 | community | community | community | community | ❌ | ❌ |
| **CLI** | ✅ `ndn` | ❌ | ✅ `w3` | ❌ | ❌ | ❌ | ❌ |
| **Hardhat plugin** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Ethereum L2 anchoring of audit log** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **AI workloads (direct-to-GPU streaming)** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Pay with crypto (USDC / FIL)** | ✅ 2% discount | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Pricing shoot-outs

### Indie dev, 20 GB hot, 200 GB/mo egress
- NDN Free → **$6/mo** (egress only)
- Pinata Picnic $20 → **$20/mo**
- Web3.Storage → **$3** (metered) — but no encryption / regions / triggers
- Filebase → **$5.99** — no encryption / triggers

### Mid-size dApp, 2 TB + 20 TB egress
- NDN Team → **$199/mo flat**
- Pinata Pro (caps, needs custom) → **$350–600/mo**
- Filebase → **$140/mo** — no encryption, limited regions
- AWS S3 + CloudFront → **~$900/mo** — not IPFS

### Pharma enterprise, 50 TB hot + 500 TB Filecoin + EU residency + HIPAA
- NDN Enterprise → **~$5,000/mo**
- Nobody else offers this bundle; custom AWS S3 + Glacier + Macie ≈ **$25,000+/mo**

## Feature rationale

These are the features we picked specifically because they move the needle for real workloads:

1. **Client-side encryption is table stakes for regulated industries** — no competitor makes this a one-flag opt-in.
2. **Smart-contract triggers** are the bridge between on-chain and off-chain data — critical for NFTs, DAOs, pharma batch passports, DePIN, and oracles.
3. **Lifecycle policies** save customers 60–90% on storage cost vs. keeping everything hot. Pinata doesn't offer this; Filebase offers only a crude "archive" toggle.
4. **Regional residency locks** are required for GDPR, Swiss FADP, Dubai PDPL, Brazil LGPD. Most IPFS services are unclear about where data physically sits.
5. **Trustless retrieval (`verify=true`)** is what makes IPFS actually trustworthy — and no competitor exposes it as an HTTP header.
6. **Filecoin proofs dashboard** is how you *prove* persistence to an auditor. Web3.Storage shows deals but not PoSt verification; we show both.

## When a competitor might be a better fit

- **You're pinning fewer than 100 MB forever and never need encryption or regions** → NFT.Storage (free, but being deprecated).
- **You already run your own IPFS node** and just need an external pin → any competitor works.
- **You need OpenStack Swift or S3-only semantics** → Filebase.
- **You need SOC 2 today** (we're mid-audit, shipping Q3) → Infura (if you can accept no Filecoin).

We're transparent about these gaps — we'd rather keep customers who fit than ones who don't.
