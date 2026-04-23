import pg from 'pg';
import pino from 'pino';
import { evmWatcher } from './evm.js';
import { solanaWatcher } from './solana.js';

const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: ['req.headers.authorization', 'req.headers["x-api-key"]', 'CLUSTER_AUTH', 'rpc'],
});
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30000,
});

// Chain configuration
const CHAINS = {
  ethereum: { name: 'Ethereum', rpcEnv: 'RPC_ETHEREUM' },
  polygon: { name: 'Polygon', rpcEnv: 'RPC_POLYGON' },
  arbitrum: { name: 'Arbitrum', rpcEnv: 'RPC_ARBITRUM' },
  base: { name: 'Base', rpcEnv: 'RPC_BASE' },
  optimism: { name: 'Optimism', rpcEnv: 'RPC_OPTIMISM' },
  avalanche: { name: 'Avalanche', rpcEnv: 'RPC_AVALANCHE' },
  solana: { name: 'Solana', rpcEnv: 'RPC_SOLANA', type: 'solana' },
};

// Metrics
const metrics = {
  eventsProcessed: 0,
  pinsCreated: 0,
  pinsFailed: 0,
  activeSubscriptions: 0,
  lastReloadTime: null,
};

/**
 * Load enabled triggers for a specific chain
 */
async function loadTriggers(chain) {
  const { rows } = await pool.query(
    `SELECT * FROM triggers WHERE chain = $1 AND enabled = true ORDER BY created_at`,
    [chain]
  );
  return rows;
}

/**
 * Handle smart contract event -> create pin
 */
async function onEvent({ trigger, cid, txHash, blockNumber, extra = {} }) {
  metrics.eventsProcessed++;

  log.info({
    triggerId: trigger.id,
    triggerName: trigger.name,
    chain: trigger.chain,
    cid,
    txHash,
    blockNumber,
  }, 'Processing contract event');

  const policy = trigger.policy ?? {};
  const pinName = `trigger:${trigger.id}:${txHash ?? blockNumber}`;

  let pinId;
  try {
    // Insert pin into database
    const result = await pool.query(
      `INSERT INTO pins (
         tenant_id, cid, name, status, tier, region, replication,
         encryption, lifecycle, meta, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
       ON CONFLICT (tenant_id, cid) DO UPDATE
         SET meta = pins.meta || $10::jsonb, updated_at = now()
       RETURNING id`,
      [
        trigger.tenant_id,
        cid,
        pinName,
        'queued',
        'hot',
        policy.region ?? null,
        policy.replication ?? 3,
        !!policy.encryption,
        policy.lifecycle ?? null,
        JSON.stringify({
          triggerId: trigger.id,
          triggerName: trigger.name,
          chain: trigger.chain,
          txHash,
          blockNumber,
          contract: trigger.contract,
          event: trigger.event,
          ...extra,
        }),
      ]
    );

    pinId = result.rows[0]?.id;
    metrics.pinsCreated++;

    log.info({ pinId, cid, triggerId: trigger.id }, 'Pin created from trigger');

    // Request cluster to pin the content
    if (process.env.CLUSTER_API_URL) {
      try {
        const clusterAuth = process.env.CLUSTER_AUTH;
        if (!clusterAuth) {
          throw new Error('CLUSTER_AUTH not configured');
        }

        const response = await fetch(`${process.env.CLUSTER_API_URL}/pins/${cid}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(clusterAuth).toString('base64')}`,
          },
          body: JSON.stringify({
            replication_factor_min: Math.max(1, (policy.replication ?? 3) - 1),
            replication_factor_max: policy.replication ?? 3,
            name: pinName,
          }),
        });

        if (!response.ok) {
          throw new Error(`Cluster responded with ${response.status}`);
        }

        // Update pin status to pinning
        await pool.query(
          `UPDATE pins SET status = 'pinning' WHERE id = $1`,
          [pinId]
        );

        log.info({ pinId, cid }, 'Cluster pin requested');

      } catch (clusterErr) {
        log.error({ err: clusterErr, pinId, cid }, 'Cluster pin request failed');
        await pool.query(
          `UPDATE pins SET status = 'failed' WHERE id = $1`,
          [pinId]
        );
        metrics.pinsFailed++;
      }
    }

    // Create audit log entry
    await pool.query(
      `INSERT INTO audit_logs (tenant_id, action, resource_type, resource_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [
        trigger.tenant_id,
        'trigger_event_pin',
        'pin',
        pinId,
        JSON.stringify({ triggerId: trigger.id, cid, txHash, blockNumber }),
      ]
    );

  } catch (err) {
    metrics.pinsFailed++;
    log.error({ err, triggerId: trigger.id, cid }, 'Failed to create pin from trigger');

    // Update or insert error record
    if (pinId) {
      await pool.query(
        `UPDATE pins SET status = 'failed', meta = meta || $1 WHERE id = $2`,
        [JSON.stringify({ error: err.message }), pinId]
      );
    }
  }
}

/**
 * Refresh all chain subscriptions
 */
async function refreshSubscriptions(subscriptions) {
  const newSubscriptions = [];

  for (const [chain, config] of Object.entries(CHAINS)) {
    const rpc = process.env[config.rpcEnv];
    if (!rpc) {
      log.debug({ chain }, 'Skipping chain - RPC not configured');
      continue;
    }

    const triggers = await loadTriggers(chain);
    if (triggers.length === 0) {
      log.debug({ chain }, 'No enabled triggers for chain');
      continue;
    }

    log.info({ chain, count: triggers.length }, 'Setting up chain watchers');

    try {
      if (config.type === 'solana') {
        const sub = await solanaWatcher({
          rpc,
          triggers,
          onEvent,
          log,
        });
        newSubscriptions.push({ chain, sub });
      } else {
        const sub = await evmWatcher({
          chain,
          rpc,
          triggers,
          onEvent,
          log,
        });
        newSubscriptions.push({ chain, sub });
      }

      // Refresh the subscription (sets up listeners)
      await newSubscriptions[newSubscriptions.length - 1].sub.refresh();

    } catch (err) {
      log.error({ err, chain }, 'Failed to set up chain watcher');
    }
  }

  // Close old subscriptions
  for (const { chain, sub } of subscriptions) {
    try {
      await sub.close?.();
      log.debug({ chain }, 'Closed old subscription');
    } catch (err) {
      log.warn({ err, chain }, 'Error closing old subscription');
    }
  }

  metrics.activeSubscriptions = newSubscriptions.length;
  metrics.lastReloadTime = new Date().toISOString();

  log.info({ count: newSubscriptions.length }, 'Subscriptions refreshed');

  return newSubscriptions;
}

/**
 * Export metrics for monitoring
 */
export function getMetrics() {
  return { ...metrics };
}

/**
 * Main entry point
 */
async function main() {
  log.info('Trigger worker starting...');

  // Validate required environment variables
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Initial subscription setup
  let subscriptions = await refreshSubscriptions([]);

  // Reload triggers periodically to pick up new/removed ones
  const reloadIntervalMs = Number(process.env.TRIGGER_RELOAD_INTERVAL_MS ?? 60_000);
  log.info({ intervalSeconds: reloadIntervalMs / 1000 }, 'Scheduling trigger reloads');

  const reloadId = setInterval(async () => {
    try {
      subscriptions = await refreshSubscriptions(subscriptions);
    } catch (err) {
      log.error({ err }, 'Trigger reload failed');
    }
  }, reloadIntervalMs);

  // Graceful shutdown
  const shutdown = async (signal) => {
    log.info({ signal }, 'Shutting down trigger worker...');
    clearInterval(reloadId);

    // Close all subscriptions
    for (const { chain, sub } of subscriptions) {
      try {
        await sub.close?.();
        log.debug({ chain }, 'Closed subscription');
      } catch (err) {
        log.warn({ err, chain }, 'Error closing subscription');
      }
    }

    await pool.end();
    log.info('Trigger worker shut down complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  log.error({ err }, 'Trigger worker crashed');
  process.exit(1);
});

// Export for testing
export { loadTriggers, onEvent, refreshSubscriptions, CHAINS };
