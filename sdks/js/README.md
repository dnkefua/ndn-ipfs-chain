# @ndnanalytics/ipfs

> The easiest way to build on IPFS. Pin, retrieve, encrypt, and automate in 3 lines.

## Install
```bash
npm install @ndnanalytics/ipfs
```

## Quick start
```ts
import { NDNClient } from '@ndnanalytics/ipfs';

const ipfs = new NDNClient({ apiKey: process.env.NDN_API_KEY });

// Pin anything: Blob, Buffer, string, File, or ReadableStream.
const pin = await ipfs.pin('Hello, IPFS 👋', { name: 'hello.txt' });
console.log(pin.cid); // bafybei...

// Retrieve with trustless verification (edge re-hashes the payload).
const bytes = await ipfs.get(pin.cid, { verify: true });
```

## Client-side encryption
```ts
const pin = await ipfs.pin(file, { encryption: true }); // E2E, keys never leave you
```

## Smart-contract trigger — auto-pin on event
```ts
await ipfs.createTrigger({
  chain: 'polygon',
  contract: '0xProvenanceRegistry...',
  event: 'BatchRecorded(bytes32,string)',
  cidField: '1',
  policy: { replication: 5, region: 'eu-central-1', encryption: true },
});
```

## Lifecycle policy — hot → cold → Filecoin
```ts
await ipfs.createLifecyclePolicy('compliance-7yr', [
  { action: 'move-to-cold',     afterDays:  30 },
  { action: 'move-to-filecoin', afterDays:  90 },
  { action: 'delete',           afterDays: 2555 }, // 7 years
]);
```

## API surface
- `pin(data, opts)` — upload + pin
- `pinCid(cid, opts)` — pin an existing CID
- `get(cid, opts)` — trustless retrieval
- `list(filters)` / `unpin(id)`
- `createTrigger(...)` — auto-pin on smart-contract events
- `createLifecyclePolicy(...)`
- `usage({ from, to, granularity })`

Full API reference: https://docs.ndnipfs.com
