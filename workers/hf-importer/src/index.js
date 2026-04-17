import axios from 'axios';
import pino from 'pino';
import pg from 'pg';
import { KuboRpcClient } from 'kubo-rpc-client';

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const kubo = new KuboRpcClient({ url: process.env.KUBO_RPC_URL });

async function mirrorHFRepo(repoId, tenantId) {
  log.info({ repoId, tenantId }, 'Starting HF mirror');

  // 1. Get file list from HF API
  const { data: files } = await axios.get(`https://huggingface.co/api/models/${repoId}`);
  const fileList = files.siblings; // Simplification: assume siblings is the file list

  const shardMap = {};
  let rootCid = null;

  for (const file of fileList) {
    log.info({ file }, 'Mirroring file to IPFS');

    // Stream from HF -> IPFS
    const response = await axios.get(`https://huggingface.co/${repoId}/resolve/main/${file}`, {
      responseType: 'stream'
    });

    const result = await kubo.add(response.data);
    const cid = result.cid.toString();

    if (file.endsWith('.bin') || file.endsWith('.safetensors')) {
      shardMap[file] = cid;
    }

    if (!rootCid) rootCid = cid; // Simple root assignment
  }

  // Register in Model Registry
  await pool.query(
    `INSERT INTO models (tenant_id, name, version, root_cid, shard_map, model_card)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [tenantId, repoId, 'latest', rootCid, JSON.stringify(shardMap), JSON.stringify({ source: 'huggingface', repo: repoId })]
  );

  log.info({ repoId, rootCid }, 'HF mirror complete and registered');
}

async function main() {
  log.info('HF Importer ready');
  // This worker typically listens to a queue (e.g. Redis/BullMQ)
  // For MVP, we'll implement a simple trigger mechanism or CLI call.
}

main().catch(err => {
  log.error(err);
  process.exit(1);
});
