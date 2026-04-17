import { Server as TusServer } from 'tus-node-server';
import { FileStore } from '@tus/file-store';
import { createHash, randomBytes, createCipheriv } from 'node:crypto';
import { Readable } from 'node:stream';

export default async function uploadRoutes(app) {
  app.addHook('onRequest', app.authenticate);

  // Direct upload (≤ 1 GiB)
  app.post('/', { preHandler: app.requireScope('pins:write') }, async (req, reply) => {
    const parts = req.parts();
    let fileStream, fields = {};
    for await (const part of parts) {
      if (part.type === 'file') fileStream = part.file;
      else fields[part.fieldname] = part.value;
    }
    if (!fileStream) return reply.code(400).send({ error: 'file_required' });

    const encryption = fields.encryption === 'true';
    let keyMaterial, iv;
    if (encryption) {
      keyMaterial = randomBytes(32);
      iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', keyMaterial, iv);
      fileStream = Readable.from(fileStream).pipe(cipher);
    }

    const cid = await app.cluster.add(fileStream);
    const keyId = encryption ? await app.db.keys.store(req.user.tenant, keyMaterial, iv) : null;

    const pin = await app.db.pins.create({
      tenant: req.user.tenant, cid,
      name: fields.name,
      region: fields.region,
      replication: Number(fields.replication ?? 3),
      encryption, keyId,
      lifecycle: fields.lifecycle,
      meta: fields.meta ? JSON.parse(fields.meta) : undefined,
      status: 'pinned', created: new Date(),
    });
    reply.code(201);
    return pin;
  });

  // Resumable uploads (tus 1.0.0). Larger than 1 GiB, or mobile/flaky networks.
  const tus = new TusServer({
    path: '/tus',
    datastore: new FileStore({ directory: process.env.TUS_TMP ?? '/tmp/ndn-tus' }),
  });
  tus.on('POST_FINISH', async (req, res, upload) => {
    // After the upload completes, ingest into IPFS and create a pin record.
    // Implementation detail: stream the assembled file into cluster.add().
    app.log.info({ uploadId: upload.id, size: upload.size }, 'tus upload complete');
  });
  app.all('/tus/*', (req, reply) => tus.handle(req.raw, reply.raw));
}
