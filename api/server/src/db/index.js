import fp from 'fastify-plugin';
import pg from 'pg';
import { pins } from './pins.js';
import { apiKeys } from './apiKeys.js';
import { envelopeKeys } from './keys.js';
import { triggers } from './triggers.js';
import { lifecycle } from './lifecycle.js';
import { teams } from './teams.js';
import { analytics } from './analytics.js';
import { regions } from './regions.js';
import { tenants } from './tenants.js';
import { audit } from './audit.js';

export const dbPlugin = fp(async (app) => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX ?? 20),
  });
  await pool.query('SELECT 1');

  const sql = (text, params) => pool.query(text, params).then((r) => r.rows);
  const one = (text, params) => sql(text, params).then((rows) => rows[0] ?? null);

  app.decorate('db', {
    pool, sql, one,
    pins:          pins({ sql, one }),
    apiKeys:       apiKeys({ sql, one }),
    keys:          envelopeKeys({ sql, one }),
    triggers:      triggers({ sql, one }),
    lifecycle:     lifecycle({ sql, one }),
    teams:         teams({ sql, one }),
    analytics:     analytics({ sql, one }),
    regions:       regions({ sql, one }),
    tenants:       tenants({ sql, one }),
    audit:         audit({ sql, one }),
  });

  app.addHook('onClose', async () => { await pool.end(); });
});
