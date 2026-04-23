import { Server as TusServer } from '@tus/server';
import { FileStore } from '@tus/file-store';
import { createHash, randomBytes, createCipheriv } from 'node:crypto';
import { Readable } from 'node:stream';
import fs from 'node:fs';
import { z } from 'zod';
import { validate, uploadRequestSchema, tusMetadataSchema } from '../lib/validators.js';

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

    // Validate fields using zod
    try {
      uploadRequestSchema.parse(fields);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'validation_error',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    const encryption = fields.encryption === 'true';
    let keyMaterial, iv;
    if (encryption) {
      keyMaterial = randomBytes(32);
      iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', keyMaterial, iv);
      fileStream = Readable.from(fileStream).pipe(cipher);
    }

    // Safe JSON parse for meta field
    let meta;
    if (fields.meta) {
      try {
        meta = JSON.parse(fields.meta);
      } catch (e) {
        return reply.code(400).send({ error: 'invalid_meta_json', message: e.message });
      }
    }

    const pin = await app.db.pins.create({
      tenant: req.user.tenant, cid: '', // cid will be set after upload
      name: fields.name,
      region: fields.region,
      replication: Number(fields.replication ?? 3),
      encryption, keyId: null,
      lifecycle: fields.lifecycle,
      meta,
      status: 'pinned', created: new Date(),
    });

    const cid = await app.cluster.add(fileStream);
    const keyId = encryption ? await app.db.keys.store(req.user.tenant, keyMaterial, iv) : null;

    // Update the pin with the actual CID and keyId
    await app.db.pins.update(pin.id, { cid, keyId });
    pin.cid = cid;
    pin.keyId = keyId;

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

      // Safe JSON parse for meta field
      let meta;
      if (metadata.meta) {
        try {
          meta = JSON.parse(metadata.meta);
        } catch (e) {
          app.log.error({ err: e, uploadId: id }, 'tus upload had invalid meta JSON');
        }
      }

      await app.db.pins.create({
        tenant: tenantId,
        cid,
        name: metadata.name,
        region: metadata.region,
        replication: Number(metadata.replication ?? 3),
        encryption,
        keyId,
        lifecycle: metadata.lifecycle,
        meta,
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
