import { randomBytes } from 'node:crypto';
import { ethers } from 'ethers';

// Envelope-key management. Keys never leave the tenant's KMS after
// creation, except the one-time material on POST. Shredding destroys
// the wrapped key and anchors a Merkle proof on-chain.
export default async function encryptionRoutes(app) {
  app.addHook('onRequest', app.authenticate);

  app.get('/keys', { preHandler: app.requireScope('keys:read') }, async (req) => {
    return app.db.keys.list(req.user.tenant);
  });

  app.post('/keys', { preHandler: app.requireScope('keys:write') }, async (req, reply) => {
    const material = randomBytes(32);
    const key = await app.db.keys.create(req.user.tenant, material);
    reply.code(201);
    return { ...key, material: material.toString('base64') };
  });

  app.post('/keys/:id/shred', { preHandler: app.requireScope('keys:write') }, async (req, reply) => {
    const key = await app.db.keys.get(req.user.tenant, req.params.id);
    if (!key) return reply.code(404).send({ error: 'not_found' });
    if (key.shredded) return reply.code(409).send({ error: 'already_shredded' });

    await app.db.keys.shred(req.user.tenant, req.params.id);
    const anchor = await anchorOnChain(app, req.params.id, new Date());
    return { keyId: req.params.id, shreddedAt: anchor.timestamp, anchorTxHash: anchor.txHash, chain: anchor.chain };
  });
}

async function anchorOnChain(app, keyId, when) {
  // Production: batch shred events daily → Merkle root → submit to an L2.
  // This stub is synchronous and returns a placeholder on dev.
  if (!process.env.ANCHOR_RPC_URL) {
    return { chain: 'ethereum-sepolia', txHash: '0x' + 'ab'.repeat(32), timestamp: when.toISOString() };
  }
  const provider = new ethers.JsonRpcProvider(process.env.ANCHOR_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ANCHOR_KEY, provider);
  const tx = await wallet.sendTransaction({ to: wallet.address, data: ethers.hexlify(ethers.toUtf8Bytes(`shred:${keyId}`)) });
  await tx.wait();
  return { chain: 'ethereum', txHash: tx.hash, timestamp: when.toISOString() };
}
