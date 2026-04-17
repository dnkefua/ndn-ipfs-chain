import { request } from 'undici';
import { CID } from 'multiformats/cid';
import { encryptStream, EncryptedPayload } from './encryption.js';

export type Region =
  | 'us-east-1' | 'us-west-2'
  | 'eu-west-1' | 'eu-central-1'
  | 'ap-southeast-1' | 'ap-northeast-1'
  | 'sa-east-1';

export interface PinOptions {
  name?: string;
  region?: Region;
  replication?: number;
  encryption?: boolean;
  lifecycle?: string;
  meta?: Record<string, string>;
  onProgress?: (bytesSent: number, bytesTotal: number) => void;
}

export interface Pin {
  id: string;
  cid: string;
  name?: string;
  status: 'queued' | 'pinning' | 'pinned' | 'failed';
  created: string;
  size?: number;
  replicas?: string[];
}

export interface NDNClientConfig {
  apiKey?: string;
  jwt?: string;
  baseUrl?: string;    // defaults to https://api.ndnipfs.com/v1
  gatewayUrl?: string; // defaults to https://gateway.ndnipfs.link
  region?: Region;
  fetch?: typeof fetch;
}

/**
 * NDN IPFS Chain client.
 *
 * @example
 * ```ts
 * import { NDNClient } from '@ndnanalytics/ipfs';
 *
 * const client = new NDNClient({ apiKey: process.env.NDN_API_KEY });
 * const pin = await client.pin(file, { region: 'us-east-1', encryption: true });
 * console.log(pin.cid);
 * ```
 */
export class NDNClient {
  readonly baseUrl: string;
  readonly gatewayUrl: string;
  readonly region?: Region;
  private readonly auth: Record<string, string>;

  constructor(config: NDNClientConfig = {}) {
    this.baseUrl    = config.baseUrl    ?? 'https://api.ndnipfs.com/v1';
    this.gatewayUrl = config.gatewayUrl ?? 'https://gateway.ndnipfs.link';
    this.region     = config.region;
    this.auth = config.apiKey
      ? { 'X-API-Key': config.apiKey }
      : config.jwt
        ? { Authorization: `Bearer ${config.jwt}` }
        : {};
  }

  /** Pin existing content by CID. */
  async pinCid(cid: string, opts: PinOptions = {}): Promise<Pin> {
    CID.parse(cid); // validate
    const res = await this.#request('POST', '/pins', {
      body: { cid, ...this.#applyDefaults(opts) },
    });
    return res as Pin;
  }

  /** Upload + pin a Blob, Buffer, ReadableStream, File, or string. */
  async pin(
    data: Blob | ArrayBuffer | Uint8Array | ReadableStream | string,
    opts: PinOptions = {},
  ): Promise<Pin> {
    const form = new FormData();
    let payload: Blob;

    if (typeof data === 'string') payload = new Blob([data]);
    else if (data instanceof Uint8Array || data instanceof ArrayBuffer) payload = new Blob([data]);
    else if (data instanceof Blob) payload = data;
    else payload = await streamToBlob(data as ReadableStream);

    if (opts.encryption) {
      const encrypted: EncryptedPayload = await encryptStream(payload);
      form.set('file', new Blob([encrypted.ciphertext]), opts.name ?? 'file.enc');
      form.set('encryption', 'true');
      form.set('meta', JSON.stringify({ iv: encrypted.iv, keyId: encrypted.keyId, ...opts.meta }));
    } else {
      form.set('file', payload, opts.name ?? 'file');
    }

    const merged = this.#applyDefaults(opts);
    if (merged.name)        form.set('name', merged.name);
    if (merged.region)      form.set('region', merged.region);
    if (merged.replication) form.set('replication', String(merged.replication));
    if (merged.lifecycle)   form.set('lifecycle', merged.lifecycle);

    const res = await this.#request('POST', '/upload', { form, onProgress: opts.onProgress });
    return res as Pin;
  }

  /** Retrieve a pinned CID. `verify: true` forces integrity re-hashing at the edge. */
  async get(cid: string, opts: { verify?: boolean; range?: [number, number] } = {}): Promise<Uint8Array> {
    const url = new URL(`/${cid}`, this.gatewayUrl);
    if (opts.verify) url.searchParams.set('verify', 'true');
    const headers: Record<string, string> = { ...this.auth };
    if (opts.range) headers.Range = `bytes=${opts.range[0]}-${opts.range[1]}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new NDNError(res.status, `get ${cid} failed`);
    return new Uint8Array(await res.arrayBuffer());
  }

  /** List pins with filters. */
  async list(filters: { cid?: string; name?: string; status?: Pin['status']; limit?: number; cursor?: string } = {}) {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== undefined) as [string, string][]);
    return this.#request('GET', `/pins?${q}`) as Promise<{ count: number; results: Pin[]; next?: string }>;
  }

  /** Unpin by pin ID. */
  async unpin(pinId: string): Promise<void> {
    await this.#request('DELETE', `/pins/${pinId}`);
  }

  /** Create a smart-contract trigger that auto-pins referenced CIDs. */
  async createTrigger(trigger: {
    chain: 'ethereum' | 'polygon' | 'arbitrum' | 'base' | 'optimism' | 'avalanche' | 'solana';
    contract: string;
    event: string;
    cidField: string;
    filter?: Record<string, unknown>;
    policy?: PinOptions;
  }) {
    return this.#request('POST', '/triggers', { body: trigger });
  }

  /** Create a lifecycle policy (e.g., move-to-cold after 30 days). */
  async createLifecyclePolicy(name: string, rules: LifecycleRule[]) {
    return this.#request('POST', '/lifecycle/policies', { body: { name, rules } });
  }

  /** Get usage analytics. */
  async usage(opts: { from?: Date; to?: Date; granularity?: 'hour' | 'day' | 'month' } = {}) {
    const q = new URLSearchParams();
    if (opts.from) q.set('from', opts.from.toISOString());
    if (opts.to)   q.set('to',   opts.to.toISOString());
    if (opts.granularity) q.set('granularity', opts.granularity);
    return this.#request('GET', `/analytics/usage?${q}`);
  }

  #applyDefaults(opts: PinOptions): PinOptions {
    return { region: this.region, replication: 3, ...opts };
  }

  async #request(
    method: string,
    path: string,
    init: { body?: unknown; form?: FormData; onProgress?: PinOptions['onProgress'] } = {},
  ) {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = { ...this.auth };
    let body: BodyInit | undefined;

    if (init.form) {
      body = init.form;
    } else if (init.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(init.body);
    }

    const res = await fetch(url, { method, headers, body });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'unknown', status: res.status }));
      throw new NDNError(res.status, err.error ?? 'request_failed', err);
    }
    if (res.status === 204) return null;
    return res.json();
  }
}

export class NDNError extends Error {
  constructor(public readonly status: number, message: string, public readonly body?: unknown) {
    super(message);
  }
}

export interface LifecycleRule {
  action: 'move-to-warm' | 'move-to-cold' | 'move-to-filecoin' | 'delete' | 'reduce-replication';
  afterDays?: number;
  ifNotAccessedFor?: number;
  if?: string;
}

async function streamToBlob(stream: ReadableStream): Promise<Blob> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return new Blob(chunks);
}
