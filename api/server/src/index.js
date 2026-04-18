import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { readFileSync } from 'node:fs';
import { load as loadYaml } from 'js-yaml';

import pinsRoutes from './routes/pins.js';
import uploadRoutes from './routes/upload.js';
import gatewayRoutes from './routes/gateway.js';
import lifecycleRoutes from './routes/lifecycle.js';
import encryptionRoutes from './routes/encryption.js';
import triggersRoutes from './routes/triggers.js';
import analyticsRoutes from './routes/analytics.js';
import teamsRoutes from './routes/teams.js';
import { authPlugin } from './plugins/auth.js';
import { clusterPlugin } from './plugins/cluster.js';
import { dbPlugin } from './db/index.js';
import { meteringPlugin } from './plugins/metering.js';
import authRoutes from './routes/auth.js';
import billingRoutes from './routes/billing.js';
import modelRoutes from './routes/models.js';
import recordsRoutes from './routes/records.js';

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? 'info', redact: ['req.headers.authorization', 'req.headers["x-api-key"]'] },
  trustProxy: true,
  bodyLimit: 1024 * 1024 * 1024, // 1 GiB — larger uploads use tus
});

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cors, { origin: true });
await app.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX ?? 600),
  timeWindow: '1 minute',
  keyGenerator: (req) => req.headers['x-api-key'] ?? req.ip,
});
await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret-change-me' });
await app.register(multipart, { limits: { fileSize: 1024 * 1024 * 1024 } });

// OpenAPI docs at /docs
const openapi = loadYaml(readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8'));
await app.register(swagger, { mode: 'static', specification: { document: openapi } });
await app.register(swaggerUi, { routePrefix: '/docs', uiConfig: { deepLinking: true } });

await app.register(dbPlugin);
await app.register(clusterPlugin);
await app.register(authPlugin);
await app.register(meteringPlugin);

// `/healthz` is intercepted by the GCP Frontend on bare Cloud Run domains, so we expose
// the same payload under `/_health` (and keep an alias at `/healthz` for anyone who cares
// to hit it via an authenticated client or a private ingress).
const healthHandler = async () => ({ status: 'ok', service: 'ndn-ipfs-api', version: '1.0.0' });
app.get('/_health', healthHandler);
app.get('/healthz', healthHandler);

app.register(authRoutes,       { prefix: '/v1/auth' });
app.register(billingRoutes,    { prefix: '/v1/billing' });
app.register(pinsRoutes,       { prefix: '/v1/pins' });
app.register(uploadRoutes,     { prefix: '/v1/upload' });
app.register(gatewayRoutes,    { prefix: '/v1/gateway' });
app.register(lifecycleRoutes,  { prefix: '/v1/lifecycle' });
app.register(encryptionRoutes, { prefix: '/v1/encryption' });
app.register(triggersRoutes,   { prefix: '/v1/triggers' });
app.register(analyticsRoutes,  { prefix: '/v1/analytics' });
app.register(teamsRoutes,      { prefix: '/v1/teams' });
app.register(modelRoutes,      { prefix: '/v1/models' });
app.register(recordsRoutes,    { prefix: '/v1/records' });

// NDP discovery endpoint — declares which of the three databases this deployment
// exposes and which optional spec extensions are live. See specs/ndp_protocol.md §7.
app.get('/v1/_discovery', async () => ({
  ndp_version: '1.0',
  provider: 'ndn-ipfs-chain',
  provider_version: process.env.npm_package_version ?? '0.4.0',
  databases: {
    blobs:      { enabled: true, pinning_services_api: 'v1.0' },
    models:     { enabled: true, streaming: ['chunked', 'range'] },
    structured: { enabled: true, query_extensions: [], views: true },
  },
  auth_methods: ['api_key', 'jwt', 'siwe'],
  cid_codecs: ['raw', 'dag-pb'],
  hash_functions: ['sha-256'],
}));

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: '0.0.0.0' });
app.log.info(`NDN IPFS API listening on :${port}  —  docs at /docs`);
