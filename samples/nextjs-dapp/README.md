# Next.js dApp — NDN IPFS Sample

```bash
cp .env.example .env.local        # add NDN_API_KEY
npm install
npm run dev                        # → http://localhost:3000
```

Uploads a file in the browser, sends it to `/api/pin`, which calls NDN and returns the CID. Encryption is enabled by default — keys are generated client-side in the route handler.
