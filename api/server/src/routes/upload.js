import { Server as TusServer } from 'tus-node-server';
import { FileStore } from '@tus/file-store';
import { createHash, randomBytes, createCipheriv } from 'node:crypto';
import { Readable } from 'node:stream';
import fs from 'node:fs';

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
  const store = new FileStore({ directory: process.env.TUS_TMP ?? '/tmp/ndn-tus' });
  const tus = new TusServer({
    path: '/tus',
    datastore: store,
  });

  tus.on('POST_FINISH', async (req, res, upload) => {
    try {
      const { metadata, id, size } = upload;
      const tenantId = metadata.tenant_id;
      if (!tenantId) {
        app.log.error({ uploadId: id }, 'tus upload finished without tenant_id metadata');
        return;
      }

      const encryption = metadata.encryption === 'true';
      const filePath = store.getPath(id);
      let fileStream = fs.createReadStream(filePath);

      let keyMaterial, iv, keyId;
      if (encryption) {
        keyMaterial = randomBytes(32);
        iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', keyMaterial, iv);
        fileStream = fileStream.pipe(cipher);
        keyId = await app.db.keys.store(tenantId, keyMaterial, iv);
      }

      const cid = await app.cluster.add(fileStream);
      await app.cluster.pin(cid, {
        replication: Number(metadata.replication ?? 3),
        region: metadata.region,
      });

      await app.db.pins.create({
        tenant: tenantId,
        cid,
        name: metadata.name,
        region: metadata.region,
        replication: Number(metadata.replication ?? 3),
        encryption,
        keyId,
        lifecycle: metadata.lifecycle,
        meta: metadata.meta ? JSON.parse(metadata.meta) : undefined,
        size,
        status: 'pinned',
        created: new Date(),
      });

      await fs.promises.unlink(filePath);
      app.log.info({ uploadId: id, cid }, 'tus upload successfully ingested and pinned');
    } catch (err) {
      app.log.error({ err, uploadId: upload.id }, 'tus POST_FINISH pipeline failed');
    }
  });

  app.all('/tus/*', (req, reply) => tus.handle(req.raw, reply.raw));
}
