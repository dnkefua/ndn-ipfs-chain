# API Reference

Base URL: `https://api.ndnipfs.com/v1` (global anycast)
EU residency: `https://api-eu.ndnipfs.com/v1`
Sandbox (no auth): `https://api.sandbox.ndnipfs.com/v1`

Interactive Swagger UI: https://api.ndnipfs.com/docs

## Auth

| Header | Usage |
|---|---|
| `X-API-Key: ndn_live_…` | Long-lived key |
| `Authorization: Bearer <JWT>` | Org/team session tokens |
| `Authorization: Bearer siwe.<msg>.<sig>` | Sign-In With Ethereum |

All endpoints except the public gateway require auth. Scopes: `pins:read`, `pins:write`, `keys:*`, `triggers:*`, `lifecycle:*`, `analytics:read`, `teams:*`, `*`.

## Pins (Pinning Services API v1.0 compatible)

### List pins
```
GET /pins?status=pinned&limit=100
```

### Pin a CID
```
POST /pins
{
  "cid": "bafybei…",
  "name": "model-v3.safetensors",
  "replication": 5,
  "region": "us-east-1",
  "encryption": false,
  "lifecycle": "archive-after-30d",
  "meta": { "team": "ml", "env": "prod" }
}
```

### Get / Unpin
```
GET    /pins/{id}
DELETE /pins/{id}
```

## Upload

### Direct (≤ 1 GiB)
```
POST /upload          multipart/form-data
fields: file, name, region, replication, encryption, lifecycle, meta
```

### Resumable (tus 1.0.0)
```
POST /upload/tus      → returns upload URL
PATCH <upload-url>    → send chunks
HEAD  <upload-url>    → resume offset
```

## Gateway

### Trustless retrieval
```
GET /gateway/{cid}?verify=true
→ X-Ipfs-Verified: true
→ X-Ipfs-Pop: fra01
→ X-Ipfs-Cache: HIT
```

### CAR file (client-verifiable)
```
GET /gateway/{cid}
Accept: application/vnd.ipld.car
```

## Lifecycle

```
GET  /lifecycle/policies
POST /lifecycle/policies
{
  "name": "compliance-7yr",
  "rules": [
    { "action": "move-to-cold",     "afterDays":  30 },
    { "action": "move-to-filecoin", "afterDays":  90 },
    { "action": "delete",           "afterDays": 2555 }
  ]
}
DELETE /lifecycle/policies/{id}
```

Actions: `move-to-warm`, `move-to-cold`, `move-to-filecoin`, `reduce-replication`, `delete`.
Predicates: `afterDays`, `ifNotAccessedFor`, `if` (CEL expression over pin metadata).

## Encryption

```
GET  /encryption/keys          → list (never returns material)
POST /encryption/keys          → creates + returns material ONCE
POST /encryption/keys/{id}/shred → destroys key, returns anchor proof
```

The CID always addresses ciphertext when encryption is used; deleting the key permanently removes access.

## Triggers (smart-contract pinning)

```
POST /triggers
{
  "chain":    "polygon",
  "contract": "0xProvenanceRegistry...",
  "event":    "BatchRecorded(bytes32,string)",
  "cidField": "1",
  "filter":   { "indexed_0": "0x…" },
  "policy":   { "replication": 5, "region": "eu-central-1" }
}
```

Supported chains: `ethereum`, `polygon`, `arbitrum`, `base`, `optimism`, `avalanche`, `solana`.

## Analytics

```
GET /analytics/usage?from=2026-01-01&to=2026-02-01&granularity=day
GET /analytics/replication
GET /analytics/filecoin-deals
```

## Errors

All errors return:
```json
{ "error": "snake_case_code", "message": "human readable" }
```

| Status | Common codes |
|---|---|
| 400 | `invalid_cid`, `invalid_policy`, `missing_fields` |
| 401 | `authentication_required`, `invalid_api_key`, `invalid_jwt` |
| 403 | `insufficient_scope`, `quota_exceeded` |
| 404 | `not_found` |
| 409 | `already_shredded`, `pin_in_progress` |
| 429 | `rate_limited` (Retry-After header) |
| 502 | `integrity_check_failed`, `origin_unreachable` |

## Rate limits

| Tier | Req/min | Concurrent uploads | Egress/mo |
|---|---:|---:|---:|
| Free | 600 | 3 | 50 GB |
| Pro | 6,000 | 20 | 1 TB |
| Team | 30,000 | 100 | 10 TB |
| Enterprise | negotiated | negotiated | negotiated |

Retry-After is always returned when throttled.
