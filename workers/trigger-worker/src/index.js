import pg from 'pg';
import pino from 'pino';
import { evmWatcher } from './evm.js';
import { solanaWatcher } from './solana.js';

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const RPC = {
  ethereum:  process.env.RPC_ETHEREUM,
  polygon:   process.env.RPC_POLYGON,
  arbitrum:  process.env.RPC_ARBITRUM,
  base:      process.env.RPC_BASE,
  optimism:  process.env.RPC_OPTIMISM,
  avalanche: process.env.RPC_AVALANCHE,
  solana:    process.env.RPC_SOLANA,
};

async function loadTriggers(chain) {
  const { rows } = await pool.query(
    `SELECT * FROM triggers WHERE chain = $1 AND enabled`, [chain]);
  return rows;
}

async function onEvent({ trigger, cid, txHash, blockNumber, extra = {} }) {
  log.info({ triggerId: trigger.id, cid, txHash, blockNumber }, 'event → pin');
  const policy = trigger.policy ?? {};
  const pin = {
    tenant_id: trigger.tenant_id,
    cid,
    name: `trigger:${trigger.id}:${txHash ?? blockNumber}`,
    status: 'queued',
    tier: 'hot',
    region: policy.region ?? null,
    replication: policy.replication ?? 3,
    encryption: !!policy.encryption,
    lifecycle: policy.lifecycle ?? null,
    meta: { triggerId: trigger.id, txHash, blockNumber, ...extra },
  };
  await pool.query(
    `INSERT INTO pins (tenant_id, cid, name, status, tier, region, replication, encryption, lifecycle, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (tenant_id, cid) DO NOTHING`,
    [pin.tenant_id, pin.cid, pin.name, pin.status, pin.tier, pin.region,
     pin.replication, pin.encryption, pin.lifecycle, JSON.stringify(pin.meta)]);

  // Ask the cluster to actually pin. In production this goes through a shared
  // queue so the worker doesn't depend on the API being up.
  if (process.env.CLUSTER_API_URL) {
    await fetch(`${process.env.CLUSTER_API_URL}/pins/${cid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(process.env.CLUSTER_AUTH ?? 'admin:admin').toString('base64')}` },
      body: JSON.stringify({
        replication_factor_min: pin.replication - 1,
        replication_factor_max: pin.replication,
      }),
    }).catch((err) => log.error({ err }, 'cluster pin failed'));
  }
}

async function main() {
  const subscriptions = [];
  for (const chain of ['ethereum', 'polygon', 'arbitrum', 'base', 'optimism', 'avalanche']) {
    if (!RPC[chain]) continue;
    const triggers = await loadTriggers(chain);
    if (triggers.length === 0) continue;
    const sub = await evmWatcher({ chain, rpc: RPC[chain], triggers, onEvent, log });
    subscriptions.push(sub);
  }
  if (RPC.solana) {
    const triggers = await loadTriggers('solana');
    if (triggers.length > 0) {
      subscriptions.push(await solanaWatcher({ rpc: RPC.solana, triggers, onEvent, log }));
    }
  }
  log.info({ count: subscriptions.length }, 'trigger worker ready');

  // Reload triggers every minute to pick up new/removed ones.
  setInterval(async () => {
    for (const sub of subscriptions) await sub.refresh?.();
  }, 60_000);

  process.on('SIGTERM', async () => {
    for (const sub of subscriptions) await sub.close?.();
    await pool.end();
    process.exit(0);
  });
}

main().catch((err) => { log.error(err); process.exit(1); });
