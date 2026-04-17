import { describe, it, expect } from 'vitest';
import { NDNClient } from './src/index';
import { encrypt, decrypt } from './src/encryption';

describe('Build Verification', () => {
  it('NDNClient class should be importable', () => {
    expect(NDNClient).toBeDefined();
    const client = new NDNClient({ apiUrl: 'http://localhost:3000', apiKey: 'test' });
    expect(client).toBeTruthy();
  });

  it('encryption module should export functions', () => {
    expect(encrypt).toBeDefined();
    expect(decrypt).toBeDefined();
  });

  it('should build without TypeScript errors', () => {
    const client = new NDNClient({
      apiUrl: 'https://api.ndnipfs.link/v1',
      apiKey: 'ndn_live_test',
    });

    expect(client.apiUrl).toBe('https://api.ndnipfs.link/v1');
  });

  it('SDK methods should have correct signatures', async () => {
    const client = new NDNClient({
      apiUrl: 'http://localhost:3000',
      apiKey: 'test',
    });

    expect(typeof client.pin).toBe('function');
    expect(typeof client.pinCid).toBe('function');
    expect(typeof client.get).toBe('function');
    expect(typeof client.list).toBe('function');
    expect(typeof client.unpin).toBe('function');
    expect(typeof client.createTrigger).toBe('function');
    expect(typeof client.createLifecyclePolicy).toBe('function');
    expect(typeof client.usage).toBe('function');
  });
});
