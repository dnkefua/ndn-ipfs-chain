import pg from 'pg';
import { ethers } from 'ethers';
import pino from 'pino';

// Crypto-shred anchor: Daily Merkle root anchoring to L2 for GDPR compliance
// Runs as a long-lived service with daily scheduling

const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: ['PRIVATE_KEY', 'ANTHROPIC_API_KEY'],
});
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30000,
});

// L2 RPC endpoints for anchoring
const RPC = {
  base: process.env.RPC_BASE || 'https://mainnet.base.org',
  arbitrum: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
  optimism: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
};

// Anchor contract address (deploy once per chain)
const ANCHOR_CONTRACT = {
  address: process.env.ANCHOR_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  abi: [
    {
      name: 'anchorRoot',
      type: 'function',
      inputs: [
        { name: 'root', type: 'bytes32' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'count', type: 'uint256' },
      ],
      outputs: [],
    },
  ],
};

const metrics = {
  anchorsCreated: 0,
  keysShredded: 0,
  lastAnchorTime: null as Date | null,
  lastAnchorRoot: null as string | null,
  lastAnchorCount: 0,
};

interface AuditEntry {
  id: string;
  action: string;
  cid: string;
  tenant_id: string;
  created_at: Date;
}

async function getAuditLogsSince(lastAnchorTime: Date): Promise<AuditEntry[]> {
  const { rows } = await pool.query(
    `SELECT id, action, cid, tenant_id, created_at
     FROM audit_logs
     WHERE created_at > $1
       AND action IN ('pin', 'delete', 'encrypt_key_rotate', 'lifecycle_transition', 'trigger_event_pin')
     ORDER BY created_at ASC`,
    [lastAnchorTime]
  );
  return rows as AuditEntry[];
}

async function getLastAnchor(): Promise<{ timestamp: Date; root: string } | null> {
  const { rows } = await pool.query(
    `SELECT timestamp, merkle_root
     FROM crypto_shred_anchors
     ORDER BY timestamp DESC
     LIMIT 1`
  );
  return rows[0] ?? null;
}

function computeMerkleRoot(entries: AuditEntry[]): string {
  if (entries.length === 0) return '0x' + '0'.repeat(64);

  // Hash each audit entry
  const hashes = entries.map((entry) => {
    const data = JSON.stringify({
      id: entry.id,
      action: entry.action,
      cid: entry.cid,
      tenant: entry.tenant_id,
      timestamp: entry.created_at.toISOString(),
    });
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  });

  // Build Merkle tree bottom-up
  let level = hashes;
  while (level.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left; // Duplicate last if odd
      const parent = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'bytes32'],
          [left, right]
        )
      );
      nextLevel.push(parent);
    }
    level = nextLevel;
  }

  return level[0];
}

async function anchorToL2(root: string, timestamp: Date, count: number): Promise<void> {
  const chainNames = Object.keys(RPC) as Array<keyof typeof RPC>;
  const privateKey = process.env.ANCHOR_PRIVATE_KEY;

  if (!privateKey) {
    log.warn('ANCHOR_PRIVATE_KEY not set, skipping L2 anchoring');
    // Still record the root locally for compliance
    await pool.query(
      `INSERT INTO crypto_shred_anchors (chain, merkle_root, tx_hash, timestamp, entry_count)
       VALUES ($1, $2, $3, $4, $5)`,
      ['local', root, null, timestamp, count]
    );
    return;
  }

  for (const chain of chainNames) {
    try {
      log.info({ chain }, 'anchoring to L2');

      const provider = new ethers.JsonRpcProvider(RPC[chain]);
      const signer = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(
        ANCHOR_CONTRACT.address,
        ANCHOR_CONTRACT.abi,
        signer
      );

      const tx = await contract.anchorRoot(
        root,
        BigInt(Math.floor(timestamp.getTime() / 1000)),
        BigInt(count),
        { gasLimit: 200000 }
      );

      log.info({ chain, txHash: tx.hash }, 'anchored root to L2');

      // Store in database
      await pool.query(
        `INSERT INTO crypto_shred_anchors (chain, merkle_root, tx_hash, timestamp, entry_count)
         VALUES ($1, $2, $3, $4, $5)`,
        [chain, root, tx.hash, timestamp, count]
      );

      metrics.anchorsCreated++;

    } catch (err) {
      log.error({ err, chain }, 'failed to anchor to L2');
    }
  }
}

async function shredOldKeys(): Promise<void> {
  // Delete encryption keys marked for shredding (GDPR compliance)
  const { rows } = await pool.query(
    `SELECT id, wrapped_key
     FROM envelope_keys
     WHERE marked_for_deletion = true AND deleted_at IS NULL`
  );

  for (const row of rows) {
    try {
      // Overwrite key with zeros (cryptographic shredding)
      await pool.query(
        `UPDATE envelope_keys
         SET wrapped_key = $1, deleted_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [Buffer.alloc(row.wrapped_key.length, 0), row.id]
      );

      log.info({ keyId: row.id }, 'shredded key');
      metrics.keysShredded++;

      // Log to audit trail
      await pool.query(
        `INSERT INTO audit_logs (tenant_id, action, resource_type, resource_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        ['system', 'key_shred', 'envelope_key', row.id, JSON.stringify({ method: 'crypto_shred' })]
      );

    } catch (err) {
      log.error({ err, keyId: row.id }, 'failed to shred key');
    }
  }
}

async function anchor(): Promise<void> {
  log.info('Starting crypto-shred anchor cycle...');

  try {
    const now = new Date();
    const last = await getLastAnchor();
    const since = last?.timestamp ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

    log.info({ since }, 'fetching audit logs since');

    const entries = await getAuditLogsSince(since);
    if (entries.length === 0) {
      log.info('no audit entries to anchor');
      // Still anchor a root of zeros for continuity
      const emptyRoot = '0x' + '0'.repeat(64);
      await anchorToL2(emptyRoot, now, 0);
      return;
    }

    const root = computeMerkleRoot(entries);
    log.info({ root, count: entries.length }, 'computed Merkle root');

    await anchorToL2(root, now, entries.length);
    await shredOldKeys();

    metrics.lastAnchorTime = now;
    metrics.lastAnchorRoot = root;
    metrics.lastAnchorCount = entries.length;

    log.info('Crypto-shred anchor cycle complete');

  } catch (err) {
    log.error({ err }, 'Anchor cycle failed');
    throw err;
  }
}

export function getMetrics() {
  return { ...metrics };
}

async function main(): Promise<void> {
  log.info('Crypto-shred anchor service starting...');

  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Initial anchor
  await anchor();

  // Run daily at 2 AM (configurable interval)
  const intervalMs = Number(process.env.ANCHOR_INTERVAL_MS ?? 24 * 60 * 60 * 1000);
  const intervalId = setInterval(anchor, intervalMs);

  const shutdown = async (signal: string) => {
    log.info({ signal }, 'Shutting down crypto-shred anchor...');
    clearInterval(intervalId);
    await pool.end();
    log.info('Crypto-shred anchor shut down complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  log.error({ err }, 'Crypto-shred anchor crashed');
  process.exit(1);
});

export { anchor };
