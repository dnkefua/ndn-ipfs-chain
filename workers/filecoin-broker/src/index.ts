import pg from 'pg';
import pino from 'pino';
import { Wallet } from 'ethers';

// Filecoin broker: Pack CARs, submit deals to Boost, track SP performance

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

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
  status: 'proposed' | 'active' | 'expired' | 'failed';
  expiresAt: Date;
  cost: number;
}

async function getEligiblePinsForFilecoin(): Promise<Pin[]> {
  // Get pins that haven't been pinned to Filecoin yet, >100MB, created >7 days ago
  const { rows } = await pool.query(
    `SELECT p.id, p.cid, p.size, p.tenant_id, p.created_at
     FROM pins p
     LEFT JOIN filecoin_deals fd ON p.cid = fd.cid
     WHERE fd.id IS NULL
       AND p.size > 100000000  -- 100 MB minimum
       AND p.created_at < NOW() - INTERVAL '7 days'
       AND p.status = 'pinned'
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

  // Group pins into ~1 GB CARs for optimal deals
  let currentCar = { size: 0, pins: [] as Pin[] };
  const carSize = 1_000_000_000; // 1 GB target

  for (const pin of pins) {
    if (currentCar.size + pin.size > carSize && currentCar.pins.length > 0) {
      // Flush current CAR
      const root = generateCarRoot(currentCar.pins);
      cars.set(root, {
        root,
        size: currentCar.size,
        blocks: currentCar.pins.length,
      });
      currentCar = { size: 0, pins: [] };
    }

    currentCar.pins.push(pin);
    currentCar.size += pin.size;
  }

  // Flush final CAR
  if (currentCar.pins.length > 0) {
    const root = generateCarRoot(currentCar.pins);
    cars.set(root, {
      root,
      size: currentCar.size,
      blocks: currentCar.pins.length,
    });
  }

  log.info({ carCount: cars.size, totalSize: pins.reduce((s, p) => s + p.size, 0) }, 'packed CARs');
  return cars;
}

function generateCarRoot(pins: Pin[]): string {
  // Simplified: hash of concatenated CIDs
  const data = pins.map(p => p.cid).join('|');
  return Buffer.from(data).toString('hex').slice(0, 64);
}

async function selectBestStorageProviders(
  carCount: number,
  providers: StorageProvider[]
): Promise<StorageProvider[]> {
  // Score based on: reputation, price, uptime, available space
  const scored = providers.map((sp) => ({
    sp,
    score:
      sp.reputation * 0.4 +
      (100 - sp.price * 10) * 0.3 +
      sp.uptime * 0.3,
  }));

  scored.sort((a, b) => b.score - a.score);

  // Return top 3 SPs for replication
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
  // Call to Boost HTTP endpoint to submit storage proposal
  // Returns proposal CID
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

  try {
    const response = await fetch(`${boostUrl}/deal/proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proposalPayload),
    });

    if (!response.ok) {
      throw new Error(`Boost API error: ${response.statusText}`);
    }

    const result = (await response.json()) as { ProposalCID: string };
    return result.ProposalCID;
  } catch (err) {
    log.error({ err, provider: proposal.providerId }, 'failed to submit proposal to Boost');
    throw err;
  }
}

async function createDealRecord(
  cid: string,
  proposalCid: string,
  providerId: string,
  cost: number
): Promise<FilecoinDeal> {
  const expiresAt = new Date(Date.now() + 540 * 24 * 60 * 60 * 1000); // 540 days

  const { rows } = await pool.query(
    `INSERT INTO filecoin_deals (cid, proposal_cid, provider_id, status, expires_at, cost)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, cid, proposal_cid, provider_id, status, expires_at, cost`,
    [cid, proposalCid, providerId, 'proposed', expiresAt, cost]
  );

  return rows[0] as FilecoinDeal;
}

async function trackDealStatus(): Promise<void> {
  // Poll Boost for deal status updates
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
        const status = (await response.json()) as { State: number };
        let newStatus = 'active';

        if (status.State === 0) newStatus = 'proposed';
        else if (status.State > 6) newStatus = 'failed';

        await pool.query(
          `UPDATE filecoin_deals SET status = $1 WHERE id = $2`,
          [newStatus, deal.id]
        );

        log.debug({ dealId: deal.id, status: newStatus }, 'updated deal status');
      }
    } catch (err) {
      log.warn({ dealId: deal.id, err }, 'failed to check deal status');
    }
  }
}

async function main(): Promise<void> {
  try {
    // 1. Fetch eligible pins
    const pins = await getEligiblePinsForFilecoin();
    if (pins.length === 0) {
      log.info('no eligible pins for Filecoin');
      return;
    }

    log.info({ count: pins.length }, 'found eligible pins for Filecoin');

    // 2. Pack CARs
    const cars = await packCARs(pins);

    // 3. Get active SPs
    const providers = await getStorageProviders();
    if (providers.length === 0) {
      log.warn('no active storage providers available');
      return;
    }

    // 4. Select best SPs
    const selectedSPs = await selectBestStorageProviders(cars.size, providers);
    log.info({ spCount: selectedSPs.length }, 'selected storage providers');

    // 5. Submit proposals
    let dealsCreated = 0;
    for (const [carRoot, carMeta] of cars) {
      for (const sp of selectedSPs) {
        try {
          const proposal: BoostProposal = {
            carRoot,
            carSize: carMeta.size,
            clientAddress: process.env.CLIENT_ADDRESS || '0x...',
            providerId: sp.address,
            duration: 540, // ~1.5 years
            pricePerEpoch: sp.price,
            startEpoch: Math.floor(Date.now() / 30000), // Filecoin epoch
          };

          const proposalCid = await submitProposalToBoost(proposal);
          await createDealRecord(carRoot, proposalCid, sp.id, carMeta.size * sp.price);

          dealsCreated++;
        } catch (err) {
          log.error({ err, sp: sp.id }, 'failed to create deal');
        }
      }
    }

    // 6. Track existing deals
    await trackDealStatus();

    log.info({ dealsCreated }, 'filecoin broker job completed');
  } catch (err) {
    log.error(err, 'broker job failed');
    throw err;
  }
}

// Run on schedule (cron: 0 1 * * * UTC = 1 AM daily)
if (require.main === module) {
  main()
    .catch((err) => {
      log.fatal(err);
      process.exit(1);
    })
    .finally(() => process.exit(0));
}

export { main };
