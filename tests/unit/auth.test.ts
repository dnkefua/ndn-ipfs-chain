import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Fastify and dependencies
vi.mock('siwe', () => ({
  SiweMessage: vi.fn().mockImplementation(() => ({
    verify: vi.fn().mockResolvedValue({
      data: { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
      success: true,
    }),
  })),
}));

describe('authPlugin', () => {
  let mockApp: any;
  let mockReq: any;
  let mockReply: any;

  beforeEach(() => {
    mockApp = {
      decorate: vi.fn(),
      db: {
        apiKeys: {
          verify: vi.fn(),
        },
      },
      jwtVerify: vi.fn(),
    };

    mockReq = {
      headers: {},
      user: null,
    };

    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
  });

  describe('authenticate', () => {
    it('bypasses auth in sandbox mode with explicit SANDBOX_MODE=true', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalSandbox = process.env.SANDBOX_MODE;

      process.env.NODE_ENV = 'sandbox';
      process.env.SANDBOX_MODE = 'true';

      const { authPlugin } = await import('../../api/server/src/plugins/auth.js');
      const handler = (authPlugin as any)[Symbol.for('skip-override')];

      // Call the plugin
      await authPlugin(mockApp);

      // Get the authenticate function that was decorated
      const decorateCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'authenticate'
      );

      if (decorateCall) {
        const authenticateFn = decorateCall[1];
        await authenticateFn.call(mockApp, mockReq, mockReply);

        expect(mockReq.user).toEqual({
          tenant: 'sandbox',
          scopes: ['*'],
        });
      }

      process.env.NODE_ENV = originalEnv;
      process.env.SANDBOX_MODE = originalSandbox;
    });

    it('does NOT bypass auth with only NODE_ENV=sandbox (missing SANDBOX_MODE)', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalSandbox = process.env.SANDBOX_MODE;

      process.env.NODE_ENV = 'sandbox';
      process.env.SANDBOX_MODE = undefined;

      mockReq.headers['x-api-key'] = undefined;
      mockReq.headers.authorization = undefined;

      const { authPlugin } = await import('../../api/server/src/plugins/auth.js');
      await authPlugin(mockApp);

      const decorateCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'authenticate'
      );

      if (decorateCall) {
        const authenticateFn = decorateCall[1];
        await authenticateFn.call(mockApp, mockReq, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(401);
        expect(mockReply.send).toHaveBeenCalledWith({ error: 'authentication_required' });
      }

      process.env.NODE_ENV = originalEnv;
      process.env.SANDBOX_MODE = originalSandbox;
    });

    it('authenticates with valid API key', async () => {
      const mockApiKey = {
        tenantId: 'tenant-123',
        scopes: ['pins:read', 'pins:write'],
        id: 'key-456',
      };
      mockApp.db.apiKeys.verify.mockResolvedValue(mockApiKey);
      mockReq.headers['x-api-key'] = 'ndn_test_abc123';

      const { authPlugin } = await import('../../api/server/src/plugins/auth.js');
      await authPlugin(mockApp);

      const decorateCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'authenticate'
      );

      if (decorateCall) {
        const authenticateFn = decorateCall[1];
        await authenticateFn.call(mockApp, mockReq, mockReply);

        expect(mockApp.db.apiKeys.verify).toHaveBeenCalledWith('ndn_test_abc123');
        expect(mockReq.user).toEqual({
          tenant: 'tenant-123',
          scopes: ['pins:read', 'pins:write'],
          keyId: 'key-456',
        });
      }
    });

    it('rejects invalid API key', async () => {
      mockApp.db.apiKeys.verify.mockResolvedValue(null);
      mockReq.headers['x-api-key'] = 'invalid-key';

      const { authPlugin } = await import('../../api/server/src/plugins/auth.js');
      await authPlugin(mockApp);

      const decorateCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'authenticate'
      );

      if (decorateCall) {
        const authenticateFn = decorateCall[1];
        await authenticateFn.call(mockApp, mockReq, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(401);
        expect(mockReply.send).toHaveBeenCalledWith({ error: 'invalid_api_key' });
      }
    });

    it('authenticates with valid JWT', async () => {
      mockReq.headers.authorization = 'Bearer valid.jwt.token';
      mockApp.jwtVerify.mockResolvedValue({
        tenant: 'tenant-123',
        scopes: ['pins:read'],
        sub: 'user-456',
      });

      const { authPlugin } = await import('../../api/server/src/plugins/auth.js');
      await authPlugin(mockApp);

      const decorateCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'authenticate'
      );

      if (decorateCall) {
        const authenticateFn = decorateCall[1];
        await authenticateFn.call(mockApp, mockReq, mockReply);

        expect(mockReq.user).toEqual({
          tenant: 'tenant-123',
          scopes: ['pins:read'],
          userId: 'user-456',
        });
      }
    });

    it('rejects invalid JWT', async () => {
      mockReq.headers.authorization = 'Bearer invalid.jwt.token';
      mockApp.jwtVerify.mockRejectedValue(new Error('Invalid JWT'));

      const { authPlugin } = await import('../../api/server/src/plugins/auth.js');
      await authPlugin(mockApp);

      const decorateCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'authenticate'
      );

      if (decorateCall) {
        const authenticateFn = decorateCall[1];
        await authenticateFn.call(mockApp, mockReq, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(401);
        expect(mockReply.send).toHaveBeenCalledWith({ error: 'invalid_jwt' });
      }
    });

    it('requires authentication when no credentials provided', async () => {
      const { authPlugin } = await import('../../api/server/src/plugins/auth.js');
      await authPlugin(mockApp);

      const decorateCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'authenticate'
      );

      if (decorateCall) {
        const authenticateFn = decorateCall[1];
        await authenticateFn.call(mockApp, mockReq, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(401);
        expect(mockReply.send).toHaveBeenCalledWith({ error: 'authentication_required' });
      }
    });
  });

  describe('requireScope', () => {
    it('allows access with matching scope', async () => {
      mockReq.user = { scopes: ['pins:read', 'pins:write'] };
      const mockReplyAllow = { code: vi.fn(), send: vi.fn() };

      const { authPlugin } = await import('../../api/server/src/plugins/auth.js');
      await authPlugin(mockApp);

      const requireScopeCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'requireScope'
      );

      if (requireScopeCall) {
        const requireScopeFn = requireScopeCall[1];
        const scopeChecker = await requireScopeFn('pins:read');
        await scopeChecker(mockReq, mockReplyAllow);

        expect(mockReplyAllow.code).not.toHaveBeenCalled();
        expect(mockReplyAllow.send).not.toHaveBeenCalled();
      }
    });

    it('allows access with wildcard scope', async () => {
      mockReq.user = { scopes: ['*'] };
      const mockReplyAllow = { code: vi.fn(), send: vi.fn() };

      const { authPlugin } = await import('../../api/server/src/plugins/auth.js');
      await authPlugin(mockApp);

      const requireScopeCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'requireScope'
      );

      if (requireScopeCall) {
        const requireScopeFn = requireScopeCall[1];
        const scopeChecker = await requireScopeFn('pins:read');
        await scopeChecker(mockReq, mockReplyAllow);

        expect(mockReplyAllow.code).not.toHaveBeenCalled();
        expect(mockReplyAllow.send).not.toHaveBeenCalled();
      }
    });

    it('allows access with parent scope (pins:*)', async () => {
      mockReq.user = { scopes: ['pins:*'] };
      const mockReplyAllow = { code: vi.fn(), send: vi.fn() };

      const { authPlugin } = await import('../../api/server/src/plugins/auth.js');
      await authPlugin(mockApp);

      const requireScopeCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'requireScope'
      );

      if (requireScopeCall) {
        const requireScopeFn = requireScopeCall[1];
        const scopeChecker = await requireScopeFn('pins:read');
        await scopeChecker(mockReq, mockReplyAllow);

        expect(mockReplyAllow.code).not.toHaveBeenCalled();
        expect(mockReplyAllow.send).not.toHaveBeenCalled();
      }
    });

    it('denies access without required scope', async () => {
      mockReq.user = { scopes: ['pins:read'] };
      const mockReplyDeny = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      const { authPlugin } = await import('../../api/server/src/plugins/auth.js');
      await authPlugin(mockApp);

      const requireScopeCall = mockApp.decorate.mock.calls.find(
        (call: any) => call[0] === 'requireScope'
      );

      if (requireScopeCall) {
        const requireScopeFn = requireScopeCall[1];
        const scopeChecker = await requireScopeFn('pins:write');
        await scopeChecker(mockReq, mockReplyDeny);

        expect(mockReplyDeny.code).toHaveBeenCalledWith(403);
        expect(mockReplyDeny.send).toHaveBeenCalledWith({
          error: 'insufficient_scope',
          required: ['pins:write'],
        });
      }
    });
  });
});
