import fp from 'fastify-plugin';
import { create as createKubo } from 'kubo-rpc-client';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { randomUUID } from 'node:crypto';

// Storage backend abstraction. Two implementations:
//   - filebase: S3-compatible IPFS pinning service (default in prod). Returns
//     real CIDs via x-amz-meta-cid response header. Retrieval through
//     https://ipfs.filebase.io/ipfs/{cid}.
//   - kubo:    direct kubo + IPFS Cluster (legacy / future self-hosted path).
// Selection is via STORAGE_BACKEND env var. Falls back to filebase when
// FILEBASE_BUCKET is set, else kubo.
export const clusterPlugin = fp(async (app) => {
  const backend = process.env.STORAGE_BACKEND
    ?? (process.env.FILEBASE_BUCKET ? 'filebase' : 'kubo');

  if (backend === 'filebase') {
    const bucket = process.env.FILEBASE_BUCKET;
    const accessKeyId = process.env.FILEBASE_ACCESS_KEY;
    const secretAccessKey = process.env.FILEBASE_SECRET_KEY;
    const gateway = process.env.FILEBASE_GATEWAY ?? 'https://ipfs.filebase.io';
    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error('FILEBASE_BUCKET, FILEBASE_ACCESS_KEY, FILEBASE_SECRET_KEY required when STORAGE_BACKEND=filebase');
    }

    const s3 = new S3Client({
      region: 'us-east-1',
      endpoint: 'https://s3.filebase.com',
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });

    app.decorate('cluster', {
      // Stream upload to Filebase, return CID from response metadata.
      async add(stream) {
        const key = `obj/${randomUUID()}`;
        const upload = new Upload({
          client: s3,
          params: { Bucket: bucket, Key: key, Body: stream },
          queueSize: 4,
          partSize: 5 * 1024 * 1024,
        });
        const result = await upload.done();
        // CID is exposed via the object metadata after upload completes.
        const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        const cid = head.Metadata?.cid ?? result.ETag?.replace(/"/g, '');
        if (!cid || !cid.startsWith('Qm') && !cid.startsWith('bafy')) {
          throw new Error(`filebase upload did not return a valid CID (got: ${cid})`);
        }
        return cid;
      },
      // Filebase auto-pins on PUT. Replication/region are not configurable
      // on the free tier — silently accept the args for API compatibility.
      async pin(_cid, _opts = {}) {
        return { ok: true, backend: 'filebase' };
      },
      async unpin(cid) {
        // Best-effort: we stored under a UUID key, not the CID. Skip for now.
        // Real cleanup happens via Filebase lifecycle policy on the bucket.
        app.log.info({ cid }, 'unpin: no-op on filebase backend');
        return { ok: true };
      },
      async status(cid) {
        return { cid, status: 'pinned', backend: 'filebase' };
      },
      // Retrieval: stream from the Filebase IPFS gateway. Range support is
      // forwarded by the caller (gateway.js) via the offset/length args.
      kubo: {
        async *cat(cid, { offset, length } = {}) {
          const headers = {};
          if (offset !== undefined) {
            const end = length !== undefined ? offset + length - 1 : '';
            headers.Range = `bytes=${offset}-${end}`;
          }
          const res = await fetch(`${gateway}/ipfs/${cid}`, { headers });
          if (!res.ok && res.status !== 206) {
            throw new Error(`gateway fetch ${cid}: ${res.status}`);
          }
          const reader = res.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            yield value;
          }
        },
      },
    });
    app.log.info({ bucket, gateway }, 'cluster plugin initialized: filebase backend');
    return;
  }

  // kubo backend (legacy / self-hosted)
  const kubo = createKubo({ url: process.env.KUBO_API_URL ?? 'http://kubo:5001' });
  const clusterApi = process.env.CLUSTER_API_URL ?? 'http://cluster:9094';

  async function clusterRequest(path, init = {}) {
    const clusterAuth = process.env.CLUSTER_AUTH;
    if (!clusterAuth) {
      throw new Error('CLUSTER_AUTH environment variable is required for kubo backend');
    }
    const res = await fetch(`${clusterApi}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(clusterAuth).toString('base64')}`,
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
  app.log.info('cluster plugin initialized: kubo backend');
});
