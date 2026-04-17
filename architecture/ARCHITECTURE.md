# NDN IPFS Chain — Architecture

## High-level diagram

```
                              Developers / dApps / AI pipelines
                                          │
                                ┌─────────┴─────────┐
                                │   SDKs (JS, Py)   │
                                │   CLI (ndn)       │
                                │   MCP / LangChain │
                                └─────────┬─────────┘
                                          │ HTTPS / tus / WS
                                          ▼
                              ┌───────────────────────┐
                              │    Edge (Cloudflare)  │
                              │    - WAF, anycast     │
                              │    - Subdomain gateways│
                              └───────────┬───────────┘
                                          │
                 ┌────────────────────────┼────────────────────────┐
                 ▼                        ▼                        ▼
           API (Fastify)           Gateway (Envoy)         tus Upload
                 │                        │                        │
                 └──────────┬─────────────┴────────────┬───────────┘
                            │                          │
                            ▼                          ▼
                   ┌────────────────┐         ┌────────────────┐
                   │ Orchestration  │◄───────►│ Object Store   │
                   │ (IPFS Cluster) │         │ (Kubo blocks)  │
                   └────────┬───────┘         └────────────────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
         Lifecycle     Trigger Worker   Filecoin Broker
         Engine        (EVM/SOL WS)     (Boost/Motion)
             │              │              │
             ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │ Postgres │   │  Redis   │   │ ClickHouse│
       │ (state)  │   │ (queue)  │   │ (usage)   │
       └──────────┘   └──────────┘   └──────────┘
```

## Services

| Service | Language | Purpose |
|---|---|---|
| **api** | Node 20 + Fastify | REST API, auth, RBAC, OpenAPI docs |
| **gateway** | Go + Kubo HTTP gateway | Content retrieval, subdomain isolation |
| **cluster** | Go (IPFS Cluster) | Pinset CRDT + placement scheduler |
| **kubo** | Go (Kubo) | Storage + DHT |
| **lifecycle-worker** | Go | Nightly reconciler, hot/cold moves |
| **trigger-worker** | Rust | EVM/Solana WebSocket subscribers |
| **filecoin-broker** | Go | CAR packing, Boost deal orchestration |
| **billing** | Node | Metering → Stripe / on-chain |

## Data stores

- **Postgres**: tenants, API keys, pins metadata, lifecycle policies, triggers.
- **Redis**: rate-limit counters, BullMQ queues, session cache.
- **ClickHouse**: usage metering, request logs, analytics.
- **S3 / R2**: tus staging, pinset snapshots, CAR files.
- **HashiCorp Vault**: envelope-key wrapping (per-tenant transit keys).

## Request flow: `POST /v1/upload`

```
 1. client          POST multipart → api
 2. api             validate auth, RBAC, size → accept multipart stream
 3. api             stream → kubo.add() → CID
 4. api             cluster.pin(cid, placement policy)
 5. cluster         CRDT update → N peers fetch over bitswap
 6. api             write pin record → Postgres; queue lifecycle enrollment
 7. api             return 201 + Pin JSON (status: pinned | pinning)
```

## Request flow: trustless GET

```
 1. client          GET /ipfs/<cid>?verify=true → edge
 2. edge            cache check → MISS → origin
 3. origin          kubo.cat(cid) → stream to client
 4. edge            sha-256 stream, compare to multihash
 5. edge            set X-Ipfs-Verified: true  (or 502 if mismatch)
 6. edge            put body into cache with ETag = CID
```

## Security boundaries

- All tenant data segregated by `tenant_id` at every query.
- Envelope keys never logged; Vault transit operations only.
- Per-tenant quotas enforced at rate-limit + storage layers.
- All admin actions signed by operator keys + Merkle-anchored daily.
- Public gateway pods run in a separate VPC with no DB access.
- CIS Benchmarks + Pod Security Admission `restricted`.

## Scaling targets

| Metric | Target year 1 | Target year 2 |
|---|---:|---:|
| CIDs pinned | 100 M | 1 B |
| GiB stored (hot + cold) | 5 PiB | 50 PiB |
| Filecoin deals | 500 k | 5 M |
| Req/s (read) | 50 k | 500 k |
| Active tenants | 10 k | 100 k |
