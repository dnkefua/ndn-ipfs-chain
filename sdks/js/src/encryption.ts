// Client-side AES-256-GCM envelope encryption. Runs in browser and Node
// (via WebCrypto). The SDK encrypts before the bytes leave the client,
// so the resulting CID addresses ciphertext — NDN never sees plaintext.

export interface EncryptedPayload {
  ciphertext: Uint8Array;
  iv: string;      // base64
  keyId: string;   // caller-managed ref, NOT the key material
  algorithm: 'AES-256-GCM';
}

export interface EncryptOptions {
  key?: CryptoKey;       // if omitted, a fresh key is generated
  keyId?: string;
  additionalData?: Uint8Array;
}

export async function encryptStream(data: Blob, opts: EncryptOptions = {}): Promise<EncryptedPayload & { key: CryptoKey }> {
  const key = opts.key ?? await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new Uint8Array(await data.arrayBuffer());
  const ct  = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: opts.additionalData },
    key,
    plaintext,
  );
  return {
    ciphertext: new Uint8Array(ct),
    iv: toBase64(iv),
    keyId: opts.keyId ?? crypto.randomUUID(),
    algorithm: 'AES-256-GCM',
    key,
  };
}

export async function decryptBytes(
  ciphertext: Uint8Array,
  key: CryptoKey,
  iv: string,
  additionalData?: Uint8Array,
): Promise<Uint8Array> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv), additionalData },
    key,
    ciphertext,
  );
  return new Uint8Array(pt);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  return toBase64(new Uint8Array(await crypto.subtle.exportKey('raw', key)));
}

export async function importKey(base64Key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromBase64(base64Key), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
