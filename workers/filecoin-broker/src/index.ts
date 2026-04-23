import pg from 'pg';
import pino from 'pino';

// Filecoin broker: Pack CARs, submit deals to Boost, track SP performance
// Runs as a long-lived service with periodic reconciliation

const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: ['FILECOIN_API_KEY', 'CLUSTER_AUTH', 'PRIVATE_KEY'],
});
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30000,
});

interface Pin {
  id: string;
  cid: string;
  size: number;
  tenant_id: string;
  created_at: Date;
}

interface StorageProvider {
  id: string;
  address: string;
  reputation: number;
  price: number;
  minSize: number;
  maxSize: number;
  uptime: number;
}

interface FilecoinDeal {
  id: string;
  cid: string;
  proposalCid: string;
  minerId: string;
  status: 'proposed' | 'active' | 'expired' | 'failed' | 'sealed';
  expiresAt: Date;
  cost: number;
}

const metrics = {
  pinsProcessed: 0,
  carsCreated: 0,
  dealsCreated: 0,
  dealsSealed: 0,
  dealsFailed: 0,
  bytesStored: 0,
  lastReconcileTime: null as Date | null,
  lastReconcileDuration: 0,
};

async function getEligiblePinsForFilecoin(): Promise<Pin[]> {
  const { rows } = await pool.query(
    `SELECT p.id, p.cid, p.size, p.tenant_id, p.created_at
     FROM pins p
     LEFT JOIN filecoin_deals fd ON p.cid = fd.cid
     WHERE fd.id IS NULL
       AND p.size > 100000000  -- 100 MB minimum
       AND p.created_at < NOW() - INTERVAL '7 days'
       AND p.status = 'pinned'
       AND p.tier = 'cold'
     LIMIT 100`
  );
  return rows as Pin[];
}

async function getStorageProviders(): Promise<StorageProvider[]> {
  const { rows } = await pool.query(
    `SELECT id, address, reputation, price, min_size, max_size, uptime
     FROM storage_providers
     WHERE active = true AND uptime > 95
     ORDER BY reputation DESC`
  );
  return rows as StorageProvider[];
}

interface CARMetadata {
  root: string;
  size: number;
  blocks: number;
}

async function packCARs(pins: Pin[]): Promise<Map<string, CARMetadata>> {
  const cars = new Map<string, CARMetadata>();
  let currentCar = { size: 0, pins: [] as Pin[] };
  const carSize = 1_000_000_000; // 1 GB target

  for (const pin of pins) {
    if (currentCar.size + pin.size > carSize && currentCar.pins.length > 0) {
      const root = generateCarRoot(currentCar.pins);
      cars.set(root, {
        root,
        size: currentCar.size,
        blocks: currentCar.pins.length,
      });
      metrics.carsCreated++;
      currentCar = { size: 0, pins: [] };
    }
    currentCar.pins.push(pin);
    currentCar.size += pin.size;
  }

  if (currentCar.pins.length > 0) {
    const root = generateCarRoot(currentCar.pins);
    cars.set(root, {
      root,
      size: currentCar.size,
      blocks: currentCar.pins.length,
    });
    metrics.carsCreated++;
  }

  log.info({ carCount: cars.size, totalSize: pins.reduce((s, p) => s + p.size, 0) }, 'packed CARs');
  return cars;
}

function generateCarRoot(pins: Pin[]): string {
  const data = pins.map(p => p.cid).join('|');
  return Buffer.from(data).toString('hex').slice(0, 64);
}

function selectBestStorageProviders(
  carCount: number,
  providers: StorageProvider[]
): StorageProvider[] {
  const scored = providers.map((sp) => ({
    sp,
    score:
      sp.reputation * 0.4 +
      (100 - sp.price * 10) * 0.3 +
      sp.uptime * 0.3,
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(s => s.sp);
}

interface BoostProposal {
  carRoot: string;
  carSize: number;
  clientAddress: string;
  providerId: string;
  duration: number;
  pricePerEpoch: number;
  startEpoch: number;
}

async function submitProposalToBoost(proposal: BoostProposal): Promise<string> {
  const boostUrl = process.env.BOOST_API_URL || 'http://localhost:8080';

  const proposalPayload = {
    Piece: {
      PieceCID: proposal.carRoot,
      PieceSize: proposal.carSize,
    },
    Client: proposal.clientAddress,
    Provider: proposal.providerId,
    Duration: proposal.duration,
    PricePerEpoch: proposal.pricePerEpoch,
    StartEpoch: proposal.startEpoch,
    Verified: true, // Filecoin Plus
  };

  const response = await fetch(`${boostUrl}/deal/proposal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(proposalPayload),
  });

  if (!response.ok) {
    throw new Error(`Boost API error: ${response.statusText}`);
  }

  const result = await response.json() as { ProposalCID: string };
  return result.ProposalCID;
}

async function createDealRecord(
  cid: string,
  proposalCid: string,
  providerId: string,
  cost: number
): Promise<FilecoinDeal> {
  const expiresAt = new Date(Date.now() + 540 * 24 * 60 * 60 * 1000);

  const { rows } = await pool.query(
    `INSERT INTO filecoin_deals (cid, proposal_cid, provider_id, status, expires_at, cost)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, cid, proposal_cid, provider_id, status, expires_at, cost`,
    [cid, proposalCid, providerId, 'proposed', expiresAt, cost]
  );

  return rows[0] as FilecoinDeal;
}

async function trackDealStatus(): Promise<void> {
  const { rows: pendingDeals } = await pool.query(
    `SELECT id, cid, proposal_cid, provider_id FROM filecoin_deals
     WHERE status IN ('proposed', 'active')
     LIMIT 50`
  );

  for (const deal of pendingDeals) {
    try {
      const boostUrl = process.env.BOOST_API_URL || 'http://localhost:8080';
      const response = await fetch(`${boostUrl}/deal/status/${deal.proposal_cid}`);

      if (response.ok) {
        const status = await response.json() as { State: number };
        let newStatus = 'active';

        if (status.State === 0) newStatus = 'proposed';
        else if (status.State > 6) newStatus = 'failed';
        else if (status.State >= 5) newStatus = 'sealed';

        await pool.query(
          `UPDATE filecoin_deals SET status = $1 WHERE id = $2`,
          [newStatus, deal.id]
        );

        if (newStatus === 'sealed') {
          metrics.dealsSealed++;
          // Update associated pins to glacier tier
          await pool.query(
            `UPDATE pins SET tier = 'glacier', status = 'pinned'
             WHERE id IN (SELECT pin_id FROM filecoin_deal_pins WHERE deal_id = $1)`,
            [deal.id]
          );
        }

        log.debug({ dealId: deal.id, status: newStatus }, 'updated deal status');
      }
    } catch (err) {
      log.warn({ dealId: deal.id, err }, 'failed to check deal status');
    }
  }
}

async function processRedealQueue(): Promise<void> {
  const { rows: redeals } = await pool.query(
    `SELECT * FROM filecoin_redeal_queue WHERE status = 'pending' LIMIT 10`
  );

  for (const redeal of redeals) {
    try {
      const { rows: pins } = await pool.query(
        `SELECT p.* FROM pins p
         JOIN filecoin_deal_pins dp ON dp.pin_id = p.id
         WHERE dp.deal_id = $1`,
        [redeal.original_deal_id]
      );

      if (pins.length > 0) {
        const cars = await packCARs(pins);
        const providers = await getStorageProviders();
        const selectedSPs = selectBestStorageProviders(cars.size, providers);

        for (const [carRoot] of cars) {
          for (const sp of selectedSPs) {
            const proposal: BoostProposal = {
              carRoot,
              carSize: cars.get(carRoot)!.size,
              clientAddress: process.env.FILECOIN_CLIENT_ADDRESS || 'f1...',
              providerId: sp.address,
              duration: 540,
              pricePerEpoch: sp.price,
              startEpoch: Math.floor(Date.now() / 30000),
            };
            await submitProposalToBoost(proposal);
          }
        }

        await pool.query(
          `UPDATE filecoin_redeal_queue SET status = 'completed', completed_at = NOW()
           WHERE id = $1`,
          [redeal.id]
        );
      }
    } catch (err) {
      log.error({ err, redealId: redeal.id }, 're-deal processing failed');
      metrics.dealsFailed++;
    }
  }
}

async function reconcile(): Promise<void> {
  const startTime = Date.now();
  log.info('Starting Filecoin broker reconciliation...');

  try {
    // 1. Fetch eligible pins
    const pins = await getEligiblePinsForFilecoin();
    if (pins.length > 0) {
      log.info({ count: pins.length }, 'found eligible pins for Filecoin');
      metrics.pinsProcessed += pins.length;
      metrics.bytesStored += pins.reduce((s, p) => s + p.size, 0);

      // 2. Pack CARs
      const cars = await packCARs(pins);

      // 3. Get active SPs
      const providers = await getStorageProviders();
      if (providers.length > 0) {
        const selectedSPs = selectBestStorageProviders(cars.size, providers);

        // 4. Submit proposals
        for (const [carRoot, carMeta] of cars) {
          for (const sp of selectedSPs) {
            try {
              const proposal: BoostProposal = {
                carRoot,
                carSize: carMeta.size,
                clientAddress: process.env.FILECOIN_CLIENT_ADDRESS || 'f1...',
                providerId: sp.address,
                duration: 540,
                pricePerEpoch: sp.price,
                startEpoch: Math.floor(Date.now() / 30000),
              };

              const proposalCid = await submitProposalToBoost(proposal);
              await createDealRecord(carRoot, proposalCid, sp.id, carMeta.size * sp.price);
              metrics.dealsCreated++;
            } catch (err) {
              log.error({ err, sp: sp.id }, 'failed to create deal');
              metrics.dealsFailed++;
            }
          }
        }
      }
    }

    // 5. Track existing deals
    await trackDealStatus();

    // 6. Process re-deal queue
    await processRedealQueue();

    metrics.lastReconcileTime = new Date();
    metrics.lastReconcileDuration = Date.now() - startTime;

    log.info({
      duration: metrics.lastReconcileDuration,
      pins: pins.length,
      dealsCreated: metrics.dealsCreated,
      dealsSealed: metrics.dealsSealed,
    }, 'Filecoin broker reconciliation complete');

  } catch (err) {
    log.error({ err }, 'Reconciliation failed');
    throw err;
  }
}

export function getMetrics() {
  return { ...metrics };
}

async function main(): Promise<void> {
  log.info('Filecoin broker starting...');

  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Initial reconciliation
  await reconcile();

  // Run every hour (configurable)
  const intervalMs = Number(process.env.FILECOIN_RECONCILE_INTERVAL_MS ?? 60 * 60 * 1000);
  const intervalId = setInterval(reconcile, intervalMs);

  const shutdown = async (signal: string) => {
    log.info({ signal }, 'Shutting down Filecoin broker...');
    clearInterval(intervalId);
    await pool.end();
    log.info('Filecoin broker shut down complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  log.error({ err }, 'Filecoin broker crashed');
  process.exit(1);
});

export { reconcile };
