import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('clusterPlugin', () => {
  let mockApp: any;
  let originalFetch: typeof global.fetch;
  let mockFetch: any;

  beforeEach(() => {
    mockApp = {
      decorate: vi.fn(),
      db: {
        regions: {
          peersFor: vi.fn(),
        },
      },
      log: {
        error: vi.fn(),
        info: vi.fn(),
      },
    };

    mockFetch = vi.fn();
    originalFetch = global.fetch;
    global.fetch = mockFetch;

    // Set required env vars
    process.env.CLUSTER_API_URL = 'http://localhost:9094';
    process.env.CLUSTER_AUTH = 'testuser:testpass';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.CLUSTER_API_URL;
    delete process.env.CLUSTER_AUTH;
  });

  it('throws error when CLUSTER_AUTH is not configured', async () => {
    delete process.env.CLUSTER_AUTH;

    const { clusterPlugin } = await import('../../api/server/src/plugins/cluster.js');

    expect(async () => {
      await clusterPlugin(mockApp);
      const decorateCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'cluster'
      );
      if (decorateCall) {
        const cluster = decorateCall[1];
        await cluster.pin('bafytest');
      }
    }).rejects.toThrow('CLUSTER_AUTH environment variable is required');
  });

  describe('cluster.pin', () => {
    it('sends correct pin request to cluster', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ cid: 'bafytest', status: 'pinned' }),
      });
      mockApp.db.regions.peersFor.mockResolvedValue(['peer1', 'peer2']);

      const { clusterPlugin } = await import('../../api/server/src/plugins/cluster.js');
      await clusterPlugin(mockApp);

      const decorateCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'cluster'
      );

      if (decorateCall) {
        const cluster = decorateCall[1];
        await cluster.pin('bafytest', {
          replication: 3,
          region: 'us-east-1',
          name: 'test-pin',
          meta: { custom: 'value' },
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:9094/pins/bafytest',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: expect.stringMatching(/^Basic /),
            },
            body: JSON.stringify({
              cid: 'bafytest',
              name: 'test-pin',
              replication_factor_min: 2,
              replication_factor_max: 3,
              user_allocations: ['peer1', 'peer2'],
              metadata: { custom: 'value' },
            }),
          })
        );
      }
    });

    it('throws on cluster API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Error',
      });

      const { clusterPlugin } = await import('../../api/server/src/plugins/cluster.js');
      await clusterPlugin(mockApp);

      const decorateCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'cluster'
      );

      if (decorateCall) {
        const cluster = decorateCall[1];
        await expect(cluster.pin('bafytest')).rejects.toThrow('cluster /pins/bafytest 500');
      }
    });
  });

  describe('cluster.unpin', () => {
    it('sends DELETE request to cluster', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ cid: 'bafytest', status: 'unpinned' }),
      });

      const { clusterPlugin } = await import('../../api/server/src/plugins/cluster.js');
      await clusterPlugin(mockApp);

      const decorateCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'cluster'
      );

      if (decorateCall) {
        const cluster = decorateCall[1];
        await cluster.unpin('bafytest');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:9094/pins/bafytest',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      }
    });
  });

  describe('cluster.status', () => {
    it('sends GET request to cluster', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          cid: 'bafytest',
          status: 'pinned',
          peer_map: { peer1: 'active', peer2: 'active' },
        }),
      });

      const { clusterPlugin } = await import('../../api/server/src/plugins/cluster.js');
      await clusterPlugin(mockApp);

      const decorateCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'cluster'
      );

      if (decorateCall) {
        const cluster = decorateCall[1];
        const status = await cluster.status('bafytest');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:9094/pins/bafytest',
          expect.objectContaining({
            method: 'GET',
          })
        );
        expect(status).toEqual({
          cid: 'bafytest',
          status: 'pinned',
          peer_map: { peer1: 'active', peer2: 'active' },
        });
      }
    });
  });

  describe('cluster.add', () => {
    it('adds content to Kubo', async () => {
      const mockKubo = {
        add: vi.fn().mockResolvedValue({ cid: { toString: () => 'bafynewcid' } }),
      };

      // Mock kubo-rpc-client
      vi.mock('kubo-rpc-client', () => ({
        create: vi.fn().mockReturnValue(mockKubo),
      }));

      const { clusterPlugin } = await import('../../api/server/src/plugins/cluster.js');
      await clusterPlugin(mockApp);

      const decorateCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'cluster'
      );

      if (decorateCall) {
        const cluster = decorateCall[1];
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(Buffer.from('test data'));
            controller.close();
          },
        });

        const cid = await cluster.add(stream);

        expect(cid).toBe('bafynewcid');
        expect(mockKubo.add).toHaveBeenCalled();
      }
    });
  });
});
