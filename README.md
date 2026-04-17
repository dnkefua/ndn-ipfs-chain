# NDN IPFS Chain

> **The easiest way to build on IPFS.** Add immutable, content-addressed storage to any app, dApp, or AI pipeline in three lines of code.

```bash
npm install @ndnanalytics/ipfs
```

```ts
import { NDNClient } from '@ndnanalytics/ipfs';
const ipfs = new NDNClient({ apiKey: process.env.NDN_API_KEY });
const { cid } = await ipfs.pin(file, { encryption: true });
```

---

## Why NDN IPFS Chain?

| | Pinata | Web3.Storage | Filebase | **NDN** |
|---|:---:|:---:|:---:|:---:|
| Free tier | 1 GB | deprecated | 5 GB | **5 GB + 50 GB egress** |
| Client-side E2E encryption | ❌ | ❌ | ❌ | **✅ native AES-256-GCM** |
| Smart-contract pin triggers | ❌ | ❌ | ❌ | **✅ EVM + Solana** |
| Hot↔Cold auto-tiering | ❌ | ❌ | partial | **✅ declarative policies** |
| Filecoin proofs dashboard | ❌ | ✅ | ✅ | **✅ + retrieval testing** |
| Regional residency lock | ❌ | ❌ | partial | **✅ 7 regions, GDPR** |
| Resumable uploads (tus) | ❌ | ❌ | ❌ | **✅** |
| Crypto-shredding | ❌ | ❌ | ❌ | **✅ GDPR-compliant** |
| SLA | 99.9% | best-effort | 99.9% | **99.99% + credits** |

Full comparison: [competition/COMPARISON.md](competition/COMPARISON.md)

---

## Repo layout

```
NDN IPFS Chain/
├── specs/              System spec (v2)
├── architecture/       Services, data flow, scaling targets
├── api/
│   ├── openapi.yaml    OpenAPI 3.1 contract (Pinning Services v1-compatible)
│   └── server/         Fastify REST API server
├── gateway/            PoP design + Kubernetes manifests
├── storage/            Tiered storage, Filecoin, GDPR shredding
├── sdks/
│   ├── js/             @ndnanalytics/ipfs (TypeScript)
│   ├── python/         ndn-ipfs + `ndn` CLI
│   └── cli/            @ndnanalytics/cli (Node)
├── samples/            Next.js dApp, Hardhat, LangChain agent
├── implementations/    Reference integrations (NFT, DAO, AI, pharma…)
├── docs/               Getting started + reference
├── pricing/            Model + calculator
├── grants/             IPFS Foundation grant application
└── competition/        Feature-by-feature comparison
```

---

## Quick start

**1. Sign up** at https://app.ndnipfs.com — get an API key in 30 s.
**2. Install** an SDK.
**3. Pin** your first file.

### JavaScript / TypeScript
```ts
import { NDNClient } from '@ndnanalytics/ipfs';
const ipfs = new NDNClient({ apiKey: process.env.NDN_API_KEY });
const pin = await ipfs.pin('Hello, IPFS', { name: 'hello.txt' });
```

### Python
```python
from ndn_ipfs import NDNClient, PinOptions
ipfs = NDNClient(api_key="ndn_live_...")
pin  = ipfs.pin(b"Hello, IPFS", PinOptions(name="hello.txt"))
```

### CLI
```bash
ndn auth login --api-key ndn_live_...
ndn pin file.mp4 --region eu-central-1 --encrypt
```

### cURL (for ops folks and grant reviewers)
```bash
curl -X POST https://api.ndnipfs.com/v1/pins \
  -H "X-API-Key: $NDN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cid":"bafybeigdyrzt...","replication":3,"region":"us-east-1"}'
```

---

## Feature highlights

- **Trustless retrieval** — `?verify=true` re-hashes at the edge and sets `X-Ipfs-Verified`.
- **Subdomain gateways** — `<cid>.ipfs.ndnipfs.link` for XSS-safe content origin isolation.
- **Smart-contract triggers** — auto-pin when an EVM or Solana event fires.
- **Client-side encryption** — keys stay with you; CID addresses ciphertext.
- **Declarative lifecycle** — JSON rules for hot→cold→Filecoin transitions.
- **GDPR crypto-shredding** — Merkle-anchored proof of erasure.
- **Filecoin Plus deals** — verified storage, free on-chain, better SP incentives.
- **Token-gated retrieval** — ERC-721/1155/20 ownership checks at the edge.
- **SOC 2 / HIPAA BAA** — enterprise-ready controls.

---

## Running locally (dev)

```bash
docker compose -f dev/docker-compose.yaml up    # kubo + cluster + postgres + redis + api
cd api/server && npm install && npm run dev     # REST API at :3000/docs (Swagger UI)
cd sdks/js     && npm install && npm run build  # ESM + CJS bundles
cd sdks/python && pip install -e '.[cli]'       # editable install + `ndn` CLI
```

---

## Documentation

- [Getting started](docs/getting-started.md) — 5 minutes, pin your first file
- [API reference](docs/api-reference.md) — every endpoint with curl + SDK examples
- [Migrating from Pinata](docs/migrate-from-pinata.md) — 10 min
- [Migrating from Web3.Storage](docs/migrate-from-web3-storage.md)
- [Architecture](architecture/ARCHITECTURE.md)
- [Gateway design](gateway/GATEWAY.md)
- [Tiered storage + Filecoin](storage/STORAGE.md)
- [Pricing model](pricing/PRICING.md)
- [IPFS grant application](grants/IPFS_GRANT_APPLICATION.md)

---

## Contributing

We accept PRs for SDKs, docs, integrations, and tutorials. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0
