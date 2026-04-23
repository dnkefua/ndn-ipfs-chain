import pg from 'pg';
import pino from 'pino';
import { transitionPin } from './transitions.js';

const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: ['req.headers.authorization', 'req.headers["x-api-key"]', 'CLUSTER_AUTH'],
});
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30000,
});

// Lifecycle transition rules: tier -> next tier after N days
const TRANSITIONS = [
  { from: 'hot', to: 'warm', minDays: 30 },
  { from: 'warm', to: 'cold', minDays: 90 },
  { from: 'cold', to: 'glacier', minDays: 365 },
];

// Metrics counters
const metrics = {
  pinsProcessed: 0,
  transitionsSuccessful: 0,
  transitionsFailed: 0,
  lastRunTime: null,
  lastRunDuration: 0,
};

/**
 * Process lifecycle transitions for all eligible pins
 */
async function processLifecycle() {
  const startTime = Date.now();
  log.info({ transitions: TRANSITIONS.length }, 'Starting lifecycle reconciliation cycle...');

  let client;
  try {
    client = await pool.connect();

    for (const transition of TRANSITIONS) {
      log.info({ action: `${transition.from}->${transition.to}` }, 'Checking for eligible pins');

      // Find pins eligible for transition
      const { rows: eligiblePins } = await client.query(
        `SELECT p.* FROM pins p
         JOIN lifecycle_policies lp ON lp.name = p.lifecycle AND lp.tenant_id = p.tenant_id
         WHERE lp.rules @> $1::jsonb
           AND p.tier = $2
           AND p.tier != $3
           AND p.created_at < now() - make_interval(days => $4)
           AND p.status = 'pinned'
         LIMIT 1000`,
        [
          JSON.stringify([{ action: `move-to-${transition.to}` }]),
          transition.from,
          transition.to,
          transition.minDays,
        ]
      );

      if (eligiblePins.length === 0) {
        log.info({ action: `${transition.from}->${transition.to}` }, 'No eligible pins found');
        continue;
      }

      log.info({ count: eligiblePins.length, action: `${transition.from}->${transition.to}` }, 'Found eligible pins');

      for (const pin of eligiblePins) {
        metrics.pinsProcessed++;

        try {
          // 1. Lock pin to prevent concurrent modifications
          await client.query(
            `UPDATE pins SET status = 'transitioning' WHERE id = $1 AND status = 'pinned'`,
            [pin.id]
          );

          // 2. Execute transition
          const result = await transitionPin(
            pin,
            process.env.CLUSTER_API_URL,
            process.env.FILECOIN_BROKER_URL
          );

          // 3. Update state with new tier
          await client.query(
            `UPDATE pins SET tier = $1, status = 'pinned', updated_at = now() WHERE id = $2`,
            [result.newTier, pin.id]
          );

          // 4. Log success
          log.info({
            cid: pin.cid,
            tenant: pin.tenant_id,
            from: pin.tier,
            to: result.newTier,
            size: pin.size,
          }, 'Lifecycle transition successful');

          metrics.transitionsSuccessful++;

          // 5. Create audit log entry
          await client.query(
            `INSERT INTO audit_logs (tenant_id, action, resource_type, resource_id, metadata, created_at)
             VALUES ($1, $2, $3, $4, $5, now())`,
            [
              pin.tenant_id,
              `lifecycle_transition:${transition.from}_to_${transition.to}`,
              'pin',
              pin.id,
              JSON.stringify({ from: pin.tier, to: result.newTier, cid: pin.cid }),
            ]
          );

        } catch (err) {
          metrics.transitionsFailed++;
          log.error({
            err,
            pinId: pin.id,
            cid: pin.cid,
            tier: pin.tier
          }, 'Lifecycle transition failed');

          // Revert status back to pinned so it can be retried
          await client.query(
            `UPDATE pins SET status = 'pinned' WHERE id = $1`,
            [pin.id]
          );
        }
      }
    }

    const duration = Date.now() - startTime;
    metrics.lastRunTime = new Date().toISOString();
    metrics.lastRunDuration = duration;

    log.info({
      duration,
      processed: metrics.pinsProcessed,
      successful: metrics.transitionsSuccessful,
      failed: metrics.transitionsFailed
    }, 'Lifecycle reconciliation cycle complete');

  } catch (err) {
    log.error({ err }, 'Lifecycle cycle failed catastrophically');
    throw err;
  } finally {
    if (client) client.release();
  }
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
  log.info('Lifecycle worker starting...');

  // Validate required environment variables
  const required = ['DATABASE_URL', 'CLUSTER_API_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Run once on boot
  await processLifecycle();

  // Run every 6 hours (configurable)
  const intervalMs = Number(process.env.LIFECYCLE_INTERVAL_MS ?? 6 * 60 * 60 * 1000);
  log.info({ intervalHours: intervalMs / 3600000 }, 'Scheduling lifecycle cycles');

  const intervalId = setInterval(async () => {
    await processLifecycle().catch(err => {
      log.error({ err }, 'Scheduled lifecycle cycle failed');
    });
  }, intervalMs);

  // Graceful shutdown
  const shutdown = async (signal) => {
    log.info({ signal }, 'Shutting down lifecycle worker...');
    clearInterval(intervalId);
    await pool.end();
    log.info('Lifecycle worker shut down complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  log.error({ err }, 'Lifecycle worker crashed');
  process.exit(1);
});

// Export for testing
export { processLifecycle, TRANSITIONS };
