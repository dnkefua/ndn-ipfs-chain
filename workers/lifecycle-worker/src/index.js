import pg from 'pg';
import pino from 'pino';
import { transitionPin } from './transitions.js';

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const ACTIONS = [
  { id: 'move-to-warm', days: 30 },
  { id: 'move-to-cold', days: 90 },
  { id: 'move-to-glacier', days: 365 },
];

async function processLifecycle() {
  log.info('Starting lifecycle reconciliation cycle...');

  for (const action of ACTIONS) {
    log.info({ action: action.id }, 'Checking for eligible pins');

    // Using the logic from pins.js:ueFor
    const { rows: eligiblePins } = await pool.query(
      `SELECT p.* FROM pins p
       JOIN lifecycle_policies lp ON lp.name = p.lifecycle AND lp.tenant_id = p.tenant_id
       WHERE lp.rules @> $1::jsonb
         AND p.tier != $2
         AND p.created_at < now() - make_interval(days => $3)
       LIMIT 1000`,
      [JSON.stringify([{ action: action.id }]),
       action.id === 'move-to-warm' ? 'warm' : (action.id === 'move-to-cold' ? 'cold' : 'glacier'),
       action.days]
    );

    for (const pin of eligiblePins) {
      try {
        // 1. Lock pin
        await pool.query(`UPDATE pins SET status = 'transitioning' WHERE id = $1`, [pin.id]);

        // 2. Execute transition
        const result = await transitionPin(pin, process.env.CLUSTER_API_URL, process.env.BROKER_API_URL);

        // 3. Update state
        await pool.query(
          `UPDATE pins SET tier = $1, status = 'pinned', updated_at = now() WHERE id = $2`,
          [result.newTier, pin.id]
        );

        log.info({ cid: pin.cid, from: pin.tier, to: result.newTier }, 'Lifecycle transition successful');
      } catch (err) {
        log.error({ err, pinId: pin.id }, 'Lifecycle transition failed');
        await pool.query(`UPDATE pins SET status = 'pinned' WHERE id = $1`, [pin.id]);
      }
    }
  }
  log.info('Lifecycle reconciliation cycle complete');
}

async function main() {
  log.info('Lifecycle worker started');

  // Run once on boot
  await processLifecycle();

  // Run every 6 hours
  setInterval(processLifecycle, 6 * 60 * 60 * 1000);
}

main().catch(err => {
  log.error(err);
  process.exit(1);
});
