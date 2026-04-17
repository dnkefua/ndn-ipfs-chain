import { CID } from 'multiformats/cid';
import { createHash } from 'node:crypto';

// Trustless retrieval gateway. When verify=true, the edge re-hashes the
// response body and attaches X-Ipfs-Verified: true|false.
export default async function gatewayRoutes(app) {
  app.get('/:cid', async (req, reply) => {
    const { cid } = req.params;
    const { verify } = req.query;
    try { CID.parse(cid); } catch { return reply.code(400).send({ error: 'invalid_cid' }); }

    const range = req.headers.range;
    const chunks = [];
    for await (const chunk of app.cluster.kubo.cat(cid, range ? parseRange(range) : {})) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    if (verify === 'true') {
      const expected = CID.parse(cid);
      const digest = createHash('sha256').update(body).digest();
      const ok = Buffer.compare(Buffer.from(expected.multihash.digest), digest) === 0;
      reply.header('X-Ipfs-Verified', ok ? 'true' : 'false');
      if (!ok) return reply.code(502).send({ error: 'integrity_check_failed' });
    }

    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    reply.header('X-Ipfs-Path', `/ipfs/${cid}`);
    reply.header('ETag', `"${cid}"`);
    return reply.send(body);
  });
}

function parseRange(header) {
  const m = /bytes=(\d+)-(\d+)?/.exec(header);
  if (!m) return {};
  return { offset: Number(m[1]), length: m[2] ? Number(m[2]) - Number(m[1]) + 1 : undefined };
}
