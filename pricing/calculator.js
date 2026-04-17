/**
 * NDN IPFS Chain — Pricing calculator (pure function, framework-free).
 *
 * Import into a React/Vue page or run standalone:
 *   node calculator.js 2000 20000 3
 */

export const PLANS = {
  free:       { name: 'Free',       base: 0,    storageGB: 5,     egressGB: 50,    repIncluded: 3 },
  pro:        { name: 'Pro',        base: 19,   storageGB: 500,   egressGB: 2000,  repIncluded: 3 },
  team:       { name: 'Team',       base: 199,  storageGB: 5000,  egressGB: 20000, repIncluded: 5 },
  enterprise: { name: 'Enterprise', base: 1500, storageGB: 20000, egressGB: 80000, repIncluded: 5 },
};

export const RATES = {
  // $/GB-month, per storage tier
  storage: { hot: 0.023, warm: 0.008, cold: 0.002, glacier: 0.0004 },
  egress:  { free: 0.04, pro: 0.02, team: 0.01, enterprise: 0.005 },
};

/**
 * @param storageGB   {{hot:number,warm:number,cold:number,glacier:number}}
 * @param egressGB    number per month
 * @param replication number
 */
export function calculate(storageGB, egressGB, replication = 3, planHint) {
  const totalStorage = Object.values(storageGB).reduce((a, b) => a + b, 0) * replication;
  const plan =
    planHint ??
    (totalStorage > 10000 || egressGB > 30000 ? 'enterprise'
      : totalStorage > 3000 || egressGB > 5000 ? 'team'
      : totalStorage > 10   || egressGB > 100  ? 'pro'
      : 'free');
  const p = PLANS[plan];

  const overage = {
    hot:     Math.max(0, storageGB.hot     * replication - p.storageGB) * RATES.storage.hot,
    warm:    storageGB.warm     * replication * RATES.storage.warm,
    cold:    storageGB.cold     * replication * RATES.storage.cold,
    glacier: storageGB.glacier  * replication * RATES.storage.glacier,
    egress:  Math.max(0, egressGB - p.egressGB) * RATES.egress[plan],
  };
  const overageTotal = Object.values(overage).reduce((a, b) => a + b, 0);

  return {
    plan,
    base: p.base,
    overage,
    overageTotal: round2(overageTotal),
    total: round2(p.base + overageTotal),
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

if (import.meta.url === `file://${process.argv[1]}`) {
  const [hot = 100, egress = 1000, rep = 3] = process.argv.slice(2).map(Number);
  console.table(calculate({ hot, warm: 0, cold: 0, glacier: 0 }, egress, rep));
}
