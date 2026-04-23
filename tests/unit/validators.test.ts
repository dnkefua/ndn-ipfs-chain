import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  pinRequestSchema,
  pinsListQuerySchema,
  uploadRequestSchema,
  tusMetadataSchema,
  triggerRequestSchema,
  gatewayQuerySchema,
  lifecyclePolicyRequestSchema,
  safeJsonParse,
} from '../../api/server/src/lib/validators.js';

describe('validators', () => {
  describe('pinRequestSchema', () => {
    it('validates valid pin request', () => {
      const valid = {
        cid: 'bafybeigdyrzt5srpe6v2mx5fxv5fdy56kw7btqyh2yeqv5v55c2c6m3q',
        name: 'test-file.txt',
        replication: 3,
        encryption: false,
      };
      expect(pinRequestSchema.parse(valid)).toEqual(valid);
    });

    it('rejects invalid CID', () => {
      const invalid = { cid: 'not-a-valid-cid' };
      expect(() => pinRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });

    it('rejects CIDv0 format', () => {
      const valid = { cid: 'QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' };
      expect(() => pinRequestSchema.parse(valid)).toThrow(z.ZodError);
    });

    it('accepts optional fields with defaults', () => {
      const minimal = { cid: 'bafybeigdyrzt5srpe6v2mx5fxv5fdy56kw7btqyh2yeqv5v55c2c6m3q' };
      const result = pinRequestSchema.parse(minimal);
      expect(result.replication).toBe(3);
      expect(result.encryption).toBe(false);
    });

    it('rejects replication out of range', () => {
      const invalid = {
        cid: 'bafybeigdyrzt5srpe6v2mx5fxv5fdy56kw7btqyh2yeqv5v55c2c6m3q',
        replication: 15,
      };
      expect(() => pinRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });

    it('accepts valid region', () => {
      const valid = {
        cid: 'bafybeigdyrzt5srpe6v2mx5fxv5fdy56kw7btqyh2yeqv5v55c2c6m3q',
        region: 'eu-central-1',
      };
      expect(pinRequestSchema.parse(valid).region).toBe('eu-central-1');
    });

    it('rejects invalid region', () => {
      const invalid = {
        cid: 'bafybeigdyrzt5srpe6v2mx5fxv5fdy56kw7btqyh2yeqv5v55c2c6m3q',
        region: 'invalid-region',
      };
      expect(() => pinRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });
  });

  describe('pinsListQuerySchema', () => {
    it('validates valid query params', () => {
      const valid = {
        limit: 50,
        cursor: 'abc123',
      };
      expect(pinsListQuerySchema.parse(valid)).toEqual(valid);
    });

    it('defaults limit to 100', () => {
      const result = pinsListQuerySchema.parse({});
      expect(result.limit).toBe(100);
    });

    it('rejects limit over 1000', () => {
      expect(() => pinsListQuerySchema.parse({ limit: 2000 })).toThrow(z.ZodError);
    });

    it('accepts valid status filter', () => {
      const valid = { status: 'pinned' };
      expect(pinsListQuerySchema.parse(valid).status).toBe('pinned');
    });

    it('rejects invalid status', () => {
      expect(() => pinsListQuerySchema.parse({ status: 'invalid' })).toThrow(z.ZodError);
    });
  });

  describe('uploadRequestSchema', () => {
    it('validates valid upload request', () => {
      const valid = {
        name: 'upload.txt',
        encryption: true,
        replication: 3,
      };
      expect(uploadRequestSchema.parse(valid)).toEqual(valid);
    });

    it('accepts minimal request', () => {
      const minimal = {};
      const result = uploadRequestSchema.parse(minimal);
      expect(result.encryption).toBe(false);
      expect(result.replication).toBe(3);
    });

    it('rejects name too long', () => {
      const invalid = { name: 'a'.repeat(300) };
      expect(() => uploadRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });
  });

  describe('tusMetadataSchema', () => {
    it('validates valid tus metadata', () => {
      const valid = {
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'file.bin',
        encryption: 'false',
        replication: '3',
      };
      const result = tusMetadataSchema.parse(valid);
      expect(result.tenant_id).toBe(valid.tenant_id);
      expect(result.encryption).toBe(false);
      expect(result.replication).toBe(3);
    });

    it('accepts 24-char tenant_id', () => {
      const valid = {
        tenant_id: '507f1f77bcf86cd799439011',
        encryption: 'false',
        replication: '3',
      };
      expect(() => tusMetadataSchema.parse(valid)).not.toThrow();
    });

    it('rejects invalid tenant_id', () => {
      const invalid = {
        tenant_id: 'not-valid-id',
        encryption: 'false',
        replication: '3',
      };
      expect(() => tusMetadataSchema.parse(invalid)).toThrow(z.ZodError);
    });

    it('parses meta JSON field', () => {
      const valid = {
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        encryption: 'false',
        replication: '3',
        meta: '{"custom": "value"}',
      };
      const result = tusMetadataSchema.parse(valid);
      expect(result.meta).toEqual({ custom: 'value' });
    });

    it('rejects invalid meta JSON', () => {
      const invalid = {
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        encryption: 'false',
        replication: '3',
        meta: 'not-json',
      };
      expect(() => tusMetadataSchema.parse(invalid)).toThrow(z.ZodError);
    });
  });

  describe('triggerRequestSchema', () => {
    it('validates valid trigger request', () => {
      const valid = {
        chain: 'ethereum',
        contract: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        event: 'Transfer',
        policy: {
          replication: 3,
          encryption: false,
        },
        enabled: true,
      };
      expect(triggerRequestSchema.parse(valid)).toEqual(valid);
    });

    it('rejects invalid contract address', () => {
      const invalid = {
        chain: 'ethereum',
        contract: 'not-a-valid-address',
        event: 'Transfer',
      };
      expect(() => triggerRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });

    it('accepts all valid chains', () => {
      const chains = ['ethereum', 'polygon', 'arbitrum', 'base', 'optimism', 'avalanche', 'solana'];
      for (const chain of chains) {
        const valid = {
          chain,
          contract: chain === 'solana' ? '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1' : '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          event: 'Transfer',
        };
        expect(() => triggerRequestSchema.parse(valid)).not.toThrow();
      }
    });
  });

  describe('gatewayQuerySchema', () => {
    it('validates valid gateway params', () => {
      const valid = {
        verify: 'true',
        download: 'false',
        filename: 'download.txt',
      };
      const result = gatewayQuerySchema.parse(valid);
      expect(result.verify).toBe(true);
      expect(result.download).toBe(false);
    });

    it('defaults verify to false', () => {
      const result = gatewayQuerySchema.parse({});
      expect(result.verify).toBe(false);
    });

    it('rejects filename too long', () => {
      expect(() => gatewayQuerySchema.parse({ filename: 'a'.repeat(300) })).toThrow(z.ZodError);
    });
  });

  describe('lifecyclePolicyRequestSchema', () => {
    it('validates valid lifecycle policy', () => {
      const valid = {
        name: 'archive-policy',
        rules: [
          { action: 'move-to-warm', days: 30 },
          { action: 'move-to-cold', days: 90 },
        ],
        description: 'Archive old data',
      };
      expect(lifecyclePolicyRequestSchema.parse(valid)).toEqual(valid);
    });

    it('accepts valid policy name', () => {
      const valid = {
        name: 'my-policy-123',
        rules: [{ action: 'move-to-warm', days: 30 }],
      };
      expect(() => lifecyclePolicyRequestSchema.parse(valid)).not.toThrow();
    });

    it('rejects invalid policy name (starts with number)', () => {
      const invalid = {
        name: '123-policy',
        rules: [{ action: 'move-to-warm', days: 30 }],
      };
      expect(() => lifecyclePolicyRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });

    it('rejects days out of range', () => {
      const invalid = {
        name: 'test-policy',
        rules: [{ action: 'move-to-warm', days: 5000 }],
      };
      expect(() => lifecyclePolicyRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });

    it('accepts all valid actions', () => {
      const actions = ['move-to-warm', 'move-to-cold', 'move-to-glacier', 'delete'];
      for (const action of actions) {
        const valid = {
          name: 'test-policy',
          rules: [{ action, days: 30 }],
        };
        expect(() => lifecyclePolicyRequestSchema.parse(valid)).not.toThrow();
      }
    });
  });

  describe('safeJsonParse', () => {
    it('parses valid JSON', () => {
      const result = safeJsonParse('{"key": "value"}', 'test');
      expect(result).toEqual({ key: 'value' });
    });

    it('returns undefined for empty string', () => {
      const result = safeJsonParse('', 'test');
      expect(result).toBeUndefined();
    });

    it('throws on invalid JSON', () => {
      expect(() => safeJsonParse('not-json', 'test')).toThrow('Invalid JSON in test');
    });
  });
});
