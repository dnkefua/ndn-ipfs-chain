# Migrate from Pinata (10 min)

## Why migrate
- Cheaper at scale (Pinata: $20/mo min; NDN: pay-as-you-go from $0).
- Features Pinata doesn't have: client-side encryption, smart-contract triggers, lifecycle policies, regional residency locks.
- Pinning Services API-compatible — your existing tools continue to work.

## Step 1 — Get your CIDs out of Pinata
```bash
curl -s "https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=1000" \
  -H "Authorization: Bearer $PINATA_JWT" | jq -r '.rows[].ipfs_pin_hash' > cids.txt
```

## Step 2 — Bulk-import to NDN
```bash
while read cid; do
  ndn pin-cid "$cid" --replication 3 --region us-east-1
done < cids.txt
```

Or, programmatically:
```ts
import { NDNClient } from '@ndnanalytics/ipfs';
const ipfs = new NDNClient({ apiKey: process.env.NDN_API_KEY });
for (const cid of cids) await ipfs.pinCid(cid);
```

## Step 3 — Swap gateway
Replace `https://gateway.pinata.cloud/ipfs/<cid>` with `https://gateway.ndnipfs.link/<cid>` — drop-in.

For custom subdomain gateways: update DNS CNAME from `gateway.pinata.cloud` to `gateway.ndnipfs.link`.

## Step 4 — Swap SDK calls (optional)
Pinata's `pinFileToIPFS` → NDN's `ipfs.pin(data, opts)`:

| Pinata | NDN |
|---|---|
| `pinFileToIPFS(file)` | `ipfs.pin(file)` |
| `pinJSONToIPFS(obj)` | `ipfs.pin(JSON.stringify(obj), { name: 'x.json' })` |
| `pinByHash(cid)` | `ipfs.pinCid(cid)` |
| `unpin(cid)` | `ipfs.unpin(pinId)` |

## Step 5 — (Optional) Adopt NDN-native features
- **Encryption:** add `encryption: true` to `pin()` options.
- **Lifecycle:** set up a `move-to-cold` policy for data > 30 days.
- **Triggers:** replace backend-polling code with a smart-contract trigger.

## Need help?
Email migrations@ndnanalytics.com — we run the migration for you at no cost for accounts transferring > 1 TB.
