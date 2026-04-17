import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

export const tenants = ({ sql, one }) => ({
  get(id) {
    return one(`SELECT * FROM tenants WHERE id = $1`, [id]);
  },

  async signup({ email, password, walletAddr, orgName }) {
    const tenant = await one(
      `INSERT INTO tenants (name, plan) VALUES ($1, 'free') RETURNING *`,
      [orgName ?? email.split('@')[0]]);
    const user = await one(
      `INSERT INTO users (tenant_id, email, password_hash, wallet_addr)
       VALUES ($1,$2,$3,$4) RETURNING id, email, wallet_addr, created_at`,
      [tenant.id, email, password ? hashPassword(password) : null, walletAddr]);
    return { tenant, user };
  },

  async verifyPassword(email, password) {
    const user = await one(
      `SELECT u.*, t.plan FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = $1`, [email]);
    if (!user?.password_hash) return null;
    return verifyPassword(password, user.password_hash) ? user : null;
  },

  async findByWallet(addr) {
    return one(
      `SELECT u.*, t.plan FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.wallet_addr = $1`, [addr.toLowerCase()]);
  },

  upgradePlan(id, plan, stripeId) {
    return sql(`UPDATE tenants SET plan=$2, stripe_id=$3 WHERE id=$1`, [id, plan, stripeId]);
  },
});

function hashPassword(pw) {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `${salt.toString('hex')}.${hash.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [saltHex, hashHex] = stored.split('.');
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
