# NDN Gateway Network

## Goals
1. **Low TTFB** (< 200 ms global p95).
2. **Trustless retrieval** — any client can verify content integrity.
3. **Regional residency** — opt-in data-never-leaves-region guarantees.
4. **Public goods** — free, rate-limited read access for the IPFS ecosystem.
5. **Token-gated retrieval** for premium content.

## Topology

```
                                Anycast IP (13.x / 2620::)
                                      │
                        ┌─────────────┼─────────────┐
                        │             │             │
                    Cloudflare    CloudFront     Fastly
                    (primary)     (failover)   (premium SLA)
                        │             │             │
                    ┌───┴───┐     ┌───┴───┐     ┌───┴───┐
                    │ PoP 1 │ ... │ PoP N │     │ PoP M │
                    └───┬───┘     └───┬───┘     └───┬───┘
                        │             │             │
                     ┌──┴──────────────┴─────────────┴──┐
                     │   Regional Cluster (Kubernetes)   │
                     │   - Kubo + Cluster peers           │
                     │   - Bitswap + DHT + Bitswap/1.2    │
                     │   - Local NVMe cache (hot tier)    │
                     └──┬─────────────────────────────────┘
                        │
                     Cold Tier (Filecoin / Arweave)
```

## PoP Stack

Each PoP runs:

| Layer | Tech | Purpose |
|---|---|---|
| TLS / TCP | Cloudflare/Fastly | Termination, anycast, DDoS |
| Request router | Envoy | Header routing, verify=true handler |
| Cache | Varnish / CDN native | 30-day cache of hot CIDs |
| Origin | NDN gateway pods | Kubo read-only + cluster-follower |
| Log sink | Vector → ClickHouse | Per-CID analytics |

## Subdomain Isolation

`<cid>.ipfs.ndnipfs.link` — each CID gets its own browser origin (prevents XSS across content). Implements the gateway subdomain pattern from the [IPFS gateway specs](https://specs.ipfs.tech/http-gateways/subdomain-gateway/).

Custom domains (`cdn.customer.com`) via BYO TLS or ACME DNS-01.

## Trustless Retrieval

Client: `GET /ipfs/<cid>?verify=true`

The edge:
1. Fetches blocks from origin.
2. Re-hashes response body (sha-256 → multihash → CID).
3. Compares against requested CID.
4. Sets `X-Ipfs-Verified: true` header or returns 502.

Optional: `Accept: application/vnd.ipld.car` returns a CAR file the client can verify itself (**this is the path IPFS Foundation recommends**).

## Regional Residency Locks

A pin created with `region: "eu-central-1"` is:
- Stored only on peers whose kubelets are tagged `region=eu-central-1`.
- Served only from EU PoPs (geo-DNS override).
- Audited — a tamper-evident log proves no egress outside region.

Satisfies GDPR Art. 44–50 and Swiss FADP.

## Token-gated Retrieval

`GET /v1/gateway/:cid` with `Authorization: Bearer siwe.<msg>.<sig>`

The router:
1. Verifies SIWE signature.
2. Calls `ownerOf(tokenId)` or `balanceOf(wallet, tokenId)` on the gate contract.
3. If holder, serves. Otherwise 403.

Supports ERC-20, ERC-721, ERC-1155, and allowlist merkle proofs.

## Public Gateway (Free Tier)

`https://gateway.ndnipfs.link/ipfs/:cid`
- 500 req/min/IP rate limit.
- 50 GB/mo egress free per account.
- No auth required.
- **Public good** — proposed to be added to the IPFS public gateway checker.

## Observability

- `X-Ipfs-Pop: sin01` — tells the client which PoP served.
- `X-Ipfs-Cache: HIT|MISS|REFILL`
- `X-Ipfs-Roundtrip: 42ms` (origin fetch time only)
- `Server-Timing` for RUM.

Public status page (`status.ndnipfs.com`) publishes per-region:
- Uptime (30/90/365 day)
- p50 / p95 / p99 TTFB
- Error rate
- Ongoing incidents (RSS + webhook)

## Deployment (Kubernetes)

See `gateway/k8s/` for Helm charts:
- `values-us-east-1.yaml`, `values-eu-central-1.yaml`, …
- HPA on request rate (target: 70% CPU, min 3 / max 50 pods).
- Pod anti-affinity across AZs.
- NodeLocal DNS + session affinity for long-range IPFS sessions.
