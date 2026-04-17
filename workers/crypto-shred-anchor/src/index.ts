import * as postgres from 'pg';
import { ethers } from 'ethers';
import pino from 'pino';

// Daily anchor job: snapshot audit log, compute Merkle root, post to L2

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const pool = new postgres.Pool({ connectionString: process.env.DATABASE_URL });

// L2 RPC endpoints for anchoring
const RPC = {
  base:      process.env.RPC_BASE || 'https://mainnet.base.org',
  arbitrum:  process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
  optimism:  process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
};

// Contract that accepts Merkle roots on-chain
const ANCHOR_CONTRACT = {
  address: process.env.ANCHOR_CONTRACT_ADDRESS || '0x...',
  abi: [
    {
      name: 'anchorRoot',
      type: 'function',
      inputs: [
        { name: 'root', type: 'bytes32' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'count', type: 'uint256' },
      ],
      outputs: [{ name: 'txHash', type: 'string' }],
    },
  ],
};

interface AuditEntry {
  id: string;
  action: string;
  cid: string;
  tenantId: string;
  timestamp: Date;
}

async function getAuditLogsSince(lastAnchorTime: Date): Promise<AuditEntry[]> {
  const { rows } = await pool.query(
    `SELECT id, action, cid, tenant_id, created_at FROM audit_log
     WHERE created_at > $1 AND action IN ('pin', 'delete', 'encrypt_key_rotate')
     ORDER BY created_at ASC`,
    [lastAnchorTime]
  );
  return rows as AuditEntry[];
}

async function getLastAnchor(): Promise<{ timestamp: Date; root: string } | null> {
  const { rows } = await pool.query(
    `SELECT timestamp, merkle_root FROM crypto_shred_anchors
     ORDER BY timestamp DESC LIMIT 1`
  );
  return rows[0] ?? null;
}

function computeMerkleRoot(entries: AuditEntry[]): string {
  // Simple Merkle tree from audit entries
  const hashes = entries.map((entry) => {
    const data = JSON.stringify({
      id: entry.id,
      action: entry.action,
      cid: entry.cid,
      tenantId: entry.tenantId,
      timestamp: entry.timestamp.toISOString(),
    });
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  });

  // Build tree bottom-up
  let level = hashes;
  while (level.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left; // Duplicate last if odd
      const parent = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'bytes32'],
        [left, right]
      ));
      nextLevel.push(parent);
    }
    level = nextLevel;
  }

  return level[0] ?? '0x0';
}

async function anchorToL2(root: string, timestamp: Date, count: number): Promise<void> {
  const chainNames = Object.keys(RPC) as Array<keyof typeof RPC>;

  for (const chain of chainNames) {
    try {
      log.info({ chain }, 'anchoring to L2');

      const provider = new ethers.JsonRpcProvider(RPC[chain]);
      const signer = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider);
      const contract = new ethers.Contract(
        ANCHOR_CONTRACT.address,
        ANCHOR_CONTRACT.abi,
        signer
      );

      const txHash = await contract.anchorRoot(
        root,
        Math.floor(timestamp.getTime() / 1000),
        count,
        { gasLimit: 200000 }
      );

      log.info({ chain, txHash }, 'anchored root to L2');

      // Store in database
      await pool.query(
        `INSERT INTO crypto_shred_anchors (chain, merkle_root, tx_hash, timestamp)
         VALUES ($1, $2, $3, $4)`,
        [chain, root, txHash, timestamp]
      );
    } catch (err) {
      log.error({ err, chain }, 'failed to anchor to L2');
    }
  }
}

async function shredOldKeys(): Promise<void> {
  // Delete encryption keys marked for shredding (GDPR compliance)
  const { rows } = await pool.query(
    `SELECT id, wrapped_key FROM envelope_keys
     WHERE marked_for_deletion = true AND deleted_at IS NULL`
  );

  for (const row of rows) {
    try {
      // Overwrite key with zeros (simulate key destruction)
      await pool.query(
        `UPDATE envelope_keys SET wrapped_key = $1, deleted_at = NOW()
         WHERE id = $2`,
        [Buffer.alloc(row.wrapped_key.length, 0), row.id]
      );

      log.info({ keyId: row.id }, 'shredded key');
    } catch (err) {
      log.error({ err, keyId: row.id }, 'failed to shred key');
    }
  }
}

async function main(): Promise<void> {
  try {
    const now = new Date();
    const last = await getLastAnchor();
    const since = last?.timestamp ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

    log.info({ since }, 'fetching audit logs since');

    const entries = await getAuditLogsSince(since);
    if (entries.length === 0) {
      log.info('no audit entries to anchor');
      return;
    }

    const root = computeMerkleRoot(entries);
    log.info({ root, count: entries.length }, 'computed merkle root');

    await anchorToL2(root, now, entries.length);
    await shredOldKeys();

    log.info('crypto-shred anchor job completed');
  } catch (err) {
    log.error(err, 'anchor job failed');
    throw err;
  }
}

// Run on schedule (cron: 0 2 * * * UTC = 2 AM daily)
if (require.main === module) {
  main()
    .catch((err) => {
      log.fatal(err);
      process.exit(1);
    })
    .finally(() => process.exit(0));
}

export { main };
