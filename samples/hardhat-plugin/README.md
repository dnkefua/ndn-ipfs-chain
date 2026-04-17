# hardhat-ndn-ipfs

Pin metadata, artifacts, and deployment records to NDN IPFS Chain from Hardhat.

## Install
```bash
npm install -D hardhat-ndn-ipfs @ndnanalytics/ipfs
```

```js
// hardhat.config.js
import 'hardhat-ndn-ipfs';

export default {
  ndn: {
    apiKey:      process.env.NDN_API_KEY,
    region:      'us-east-1',
    replication: 5,
  },
};
```

## Tasks
```bash
npx hardhat ipfs:pin --path ./metadata.json
npx hardhat ipfs:deploy-artifacts
```

## Use case
Pair with a `Deploy` script that records the artifact CID on-chain, giving verifiers a cryptographic pointer to the exact compile output.
