import { extendConfig, task } from 'hardhat/config';
import { NDNClient } from '@ndnanalytics/ipfs';
import { readFileSync } from 'node:fs';

// Adds a config section and two tasks:
//   npx hardhat ipfs:pin --path ./metadata.json
//   npx hardhat ipfs:deploy-artifacts
// Artifacts land on IPFS with their solc-generated CID fingerprint, giving
// your deployment pipeline an immutable record of every compile output.
extendConfig((config, userConfig) => {
  config.ndn = {
    apiKey:      userConfig.ndn?.apiKey      ?? process.env.NDN_API_KEY,
    region:      userConfig.ndn?.region      ?? 'us-east-1',
    replication: userConfig.ndn?.replication ?? 5,
    encryption:  userConfig.ndn?.encryption  ?? false,
  };
});

task('ipfs:pin', 'Pin a file to NDN IPFS Chain')
  .addParam('path', 'Local file path')
  .addOptionalParam('name', 'Name metadata')
  .setAction(async ({ path, name }, hre) => {
    const ipfs = new NDNClient(hre.config.ndn);
    const bytes = readFileSync(path);
    const pin = await ipfs.pin(bytes, { name: name ?? path, ...hre.config.ndn });
    console.log(`pinned ${pin.cid}  →  https://gateway.ndnipfs.link/${pin.cid}`);
  });

task('ipfs:deploy-artifacts', 'Pin all Hardhat artifacts for the last compile')
  .setAction(async (_, hre) => {
    const ipfs = new NDNClient(hre.config.ndn);
    const artifactPaths = await hre.artifacts.getArtifactPaths();
    const pins = [];
    for (const p of artifactPaths) {
      const pin = await ipfs.pin(readFileSync(p), { name: p.split(/[\\/]/).pop() });
      pins.push(pin);
    }
    console.log(`pinned ${pins.length} artifacts:`);
    for (const p of pins) console.log(`  ${p.name}  ${p.cid}`);
  });

export default {};
