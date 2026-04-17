import fp from 'fastify-plugin';
import { create as createKubo } from 'kubo-rpc-client';

// Thin IPFS Cluster / Kubo client wrapper. In production this talks to
// an IPFS Cluster REST API and places replicas via the placement policy
// (geographic spread + carrier diversity).
export const clusterPlugin = fp(async (app) => {
  const kubo = createKubo({ url: process.env.KUBO_API_URL ?? 'http://kubo:5001' });
  const clusterApi = process.env.CLUSTER_API_URL ?? 'http://cluster:9094';

  async function clusterRequest(path, init = {}) {
    const res = await fetch(`${clusterApi}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(process.env.CLUSTER_AUTH ?? 'admin:admin').toString('base64')}`,
        ...init.headers,
      },
    });
    if (!res.ok) throw new Error(`cluster ${path} ${res.status}`);
    return res.json();
  }

  app.decorate('cluster', {
    async pin(cid, { replication = 3, region, name, meta } = {}) {
      const body = {
        cid,
        name,
        replication_factor_min: Math.max(1, replication - 1),
        replication_factor_max: replication,
        user_allocations: region ? await app.db.regions.peersFor(region) : undefined,
        metadata: meta,
      };
      return clusterRequest(`/pins/${cid}`, { method: 'POST', body: JSON.stringify(body) });
    },
    async unpin(cid) {
      return clusterRequest(`/pins/${cid}`, { method: 'DELETE' });
    },
    async status(cid) {
      return clusterRequest(`/pins/${cid}`);
    },
    async add(stream, { wrapWithDirectory = false } = {}) {
      const result = await kubo.add(stream, { wrapWithDirectory, cidVersion: 1, rawLeaves: true });
      return result.cid.toString();
    },
    kubo,
  });
});
