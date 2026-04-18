// NDP canonicalization + CID minting.
// Implements §2.2 (envelope) and §2.3 (CID rules) of the NDP spec.
// Every addressable NDP object flows through here before it touches storage,
// guaranteeing that two implementations producing the same logical content
// also produce the same CID.

import canonicalize from 'canonicalize';          // RFC 8785 JSON Canonicalization
import { sha256 } from 'multiformats/hashes/sha2';
import { CID } from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';

const NDP_VERSION = '1';

/**
 * Build a canonical NDP envelope.
 * @param {object}   args
 * @param {string}   args.kind      - envelope kind (record, blob-meta, ...)
 * @param {string}   args.tenantId  - UUID of the tenant
 * @param {object}   args.body      - kind-specific payload
 * @param {string|null} [args.parentCid=null] - prior version CID
 * @param {Date}     [args.createdAt=new Date()]
 * @returns {object} a plain envelope object (not yet hashed)
 */
export function envelope({ kind, tenantId, body, parentCid = null, createdAt = new Date() }) {
  return {
    ndp: NDP_VERSION,
    kind,
    tenant: tenantId,
    created: createdAt.toISOString(),
    parent: parentCid,
    body,
  };
}

/**
 * Canonicalize an envelope (or any JSON object) per RFC 8785 and mint its CID.
 * @param {object} obj
 * @returns {{ cid: string, bytes: Uint8Array, canonical: string }}
 */
export async function mintCid(obj) {
  const canonical = canonicalize(obj);                    // RFC 8785 output (UTF-8 string)
  const bytes = new TextEncoder().encode(canonical);
  const hash = await sha256.digest(bytes);
  const cid = CID.createV1(raw.code, hash);               // CIDv1, codec 0x55 (raw)
  return { cid: cid.toString(), bytes, canonical };
}

/**
 * One-shot helper: build envelope + mint its CID.
 * @returns {{ envelope: object, cid: string, bytes: Uint8Array, canonical: string }}
 */
export async function envelopeWithCid(args) {
  const env = envelope(args);
  const { cid, bytes, canonical } = await mintCid(env);
  return { envelope: env, cid, bytes, canonical };
}

/**
 * Validate a CID string is a well-formed CIDv1. Throws on invalid input.
 */
export function assertValidCid(cidStr) {
  try { CID.parse(cidStr); } catch { throw new Error(`invalid CID: ${cidStr}`); }
}

/**
 * Validate a structured-DB record body against a JSON Schema. Returns the
 * list of validation errors (empty if valid). Uses Ajv under the hood.
 * Schemas are cached by CID because they themselves are content-addressed.
 */
const schemaCache = new Map();                            // cid -> compiled validator
export async function validateAgainstSchema(body, schemaJson, schemaCid) {
  if (!schemaJson) return [];                             // no schema => pass
  let validate = schemaCache.get(schemaCid);
  if (!validate) {
    const { default: Ajv2020 } = await import('ajv/dist/2020.js');
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    validate = ajv.compile(schemaJson);
    schemaCache.set(schemaCid, validate);
  }
  return validate(body) ? [] : (validate.errors ?? []);
}
