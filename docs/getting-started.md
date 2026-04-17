# Getting started (5 min)

## 1. Get an API key
Sign up at https://app.ndnipfs.com. Free tier: 5 GB + 50 GB egress. No credit card.

```bash
export NDN_API_KEY=ndn_live_xxx
```

## 2. Install an SDK

### JavaScript / TypeScript
```bash
npm install @ndnanalytics/ipfs
```

### Python
```bash
pip install ndn-ipfs
```

### CLI (Python)
```bash
pip install 'ndn-ipfs[cli]'
ndn auth login --api-key $NDN_API_KEY
```

## 3. Pin your first file

### JS
```ts
import { NDNClient } from '@ndnanalytics/ipfs';
const ipfs = new NDNClient({ apiKey: process.env.NDN_API_KEY });

const pin = await ipfs.pin('Hello, IPFS 👋', { name: 'hello.txt' });
console.log(pin.cid);

const bytes = await ipfs.get(pin.cid, { verify: true });
console.log(new TextDecoder().decode(bytes));
```

### Python
```python
from ndn_ipfs import NDNClient, PinOptions
ipfs = NDNClient(api_key=os.environ["NDN_API_KEY"])
pin = ipfs.pin(b"Hello, IPFS", PinOptions(name="hello.txt"))
print(pin.cid)
```

### CLI
```bash
echo 'Hello, IPFS' > hello.txt
ndn pin hello.txt
```

## 4. Access via gateway
Any gateway works. Ours is fast:
```
https://gateway.ndnipfs.link/<cid>
```
Subdomain form (XSS-safe):
```
https://<cid>.ipfs.ndnipfs.link
```

## 5. Add encryption
```ts
const pin = await ipfs.pin(file, { encryption: true });
```

NDN never sees plaintext. The CID addresses ciphertext. Keep the envelope key (returned in the SDK response) somewhere safe — lose it and the content is permanently unreadable (this is the feature).

## 6. Set up a lifecycle policy
```ts
await ipfs.createLifecyclePolicy('archive-after-30d', [
  { action: 'move-to-cold', afterDays: 30 },
  { action: 'move-to-filecoin', afterDays: 90 },
]);
```

## 7. Auto-pin on smart-contract events
```ts
await ipfs.createTrigger({
  chain: 'polygon',
  contract: '0xYourContract...',
  event: 'AssetMinted(uint256,string)',
  cidField: '1',
  policy: { replication: 5 },
});
```

## Next steps
- [API reference](api-reference.md)
- [Sample: Next.js dApp](../samples/nextjs-dapp/)
- [Sample: Hardhat plugin](../samples/hardhat-plugin/)
- [Sample: LangChain agent memory](../samples/langchain-memory/)
- [Migrating from Pinata](migrate-from-pinata.md)
