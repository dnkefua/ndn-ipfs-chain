import { z } from 'zod';

/**
 * Zod validation schemas for API endpoints.
 * Centralized validation for all request bodies, queries, and params.
 */

// CID validation - supports CIDv0 (Qm...) and CIDv1 (baf...)
const cidSchema = z.string()
  .regex(/^(Qm[A-Za-z0-9]{44}|baf[A-Za-z0-9]{46,58})$/, 'Invalid CID format')
  .describe('Content Identifier (CID) for IPFS');

// Region validation
const regionSchema = z.enum([
  'us-east-1', 'us-west-2',
  'eu-west-1', 'eu-central-1',
  'ap-southeast-1', 'ap-northeast-1',
  'sa-east-1',
]).describe('Geographic region for data residency');

// Pin status validation
const pinStatusSchema = z.enum(['queued', 'pinning', 'pinned', 'failed', 'unpinned', 'transitioning']);

// Lifecycle policy validation
const lifecycleSchema = z.enum(['standard', 'archive', 'compliance', 'ai-models']);

// Common metadata schema
const metaSchema = z.record(z.string(), z.string()).optional();

/**
 * POST /v1/pins - Pin a CID
 */
export const pinRequestSchema = z.object({
  cid: cidSchema,
  name: z.string().max(255).optional(),
  origins: z.array(z.string()).optional(),
  replication: z.number().int().min(1).max(10).default(3),
  region: regionSchema.optional(),
  encryption: z.boolean().default(false),
  lifecycle: lifecycleSchema.optional(),
  meta: metaSchema,
});

/**
 * GET /v1/pins - List pins query params
 */
export const pinsListQuerySchema = z.object({
  cid: cidSchema.optional(),
  name: z.string().max(255).optional(),
  status: pinStatusSchema.optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  cursor: z.string().optional(),
});

/**
 * POST /v1/upload - Direct upload
 */
export const uploadRequestSchema = z.object({
  name: z.string().max(255).optional(),
  region: regionSchema.optional(),
  replication: z.number().int().min(1).max(10).default(3),
  encryption: z.boolean().default(false),
  lifecycle: lifecycleSchema.optional(),
  meta: metaSchema,
});

/**
 * Tus upload metadata validation
 */
export const tusMetadataSchema = z.object({
  tenant_id: z.string().uuid().or(z.string().length(24)),
  name: z.string().max(255).optional(),
  region: regionSchema.optional(),
  replication: z.string().transform(Number).pipe(z.number().int().min(1).max(10)).default('3'),
  encryption: z.string().transform(v => v === 'true'),
  lifecycle: lifecycleSchema.optional(),
  meta: z.string().transform((str, ctx) => {
    if (!str) return undefined;
    try {
      return JSON.parse(str);
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON in meta field' });
      return z.NEVER;
    }
  }).optional(),
});

/**
 * POST /v1/triggers - Create smart contract trigger
 */
export const triggerRequestSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'arbitrum', 'base', 'optimism', 'avalanche', 'solana']),
  contract: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
  event: z.string().min(1),
  policy: z.object({
    region: regionSchema.optional(),
    replication: z.number().int().min(1).max(10).default(3),
    encryption: z.boolean().default(false),
    lifecycle: lifecycleSchema.optional(),
  }),
  enabled: z.boolean().default(true),
});

/**
 * GET /v1/gateway/:cid - Gateway retrieval params
 */
export const gatewayQuerySchema = z.object({
  verify: z.string().transform(v => v === 'true').default(false),
  download: z.string().transform(v => v === 'true').default(false),
  filename: z.string().max(255).optional(),
});

/**
 * POST /v1/lifecycle - Create lifecycle policy
 */
export const lifecyclePolicyRequestSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]{0,62}$/),
  rules: z.array(z.object({
    action: z.enum(['move-to-warm', 'move-to-cold', 'move-to-glacier', 'delete']),
    days: z.number().int().min(0).max(3650),
  })).min(1),
  description: z.string().max(500).optional(),
});

/**
 * POST /v1/encryption/keys - Create encryption key
 */
export const encryptionKeyRequestSchema = z.object({
  name: z.string().max(255),
  algorithm: z.enum(['aes-256-gcm']).default('aes-256-gcm'),
  rotationDays: z.number().int().min(30).max(365).optional(),
});

/**
 * POST /v1/teams - Create team
 */
export const teamRequestSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

/**
 * POST /v1/teams/:id/members - Add team member
 */
export const teamMemberRequestSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

/**
 * POST /v1/billing/subscribe - Subscribe to billing plan
 */
export const billingSubscribeRequestSchema = z.object({
  planId: z.string(),
  paymentMethodId: z.string(),
});

/**
 * Validation middleware factory
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params' | 'headers'} target - Request property to validate
 * @returns {Function} Fastify preHandler hook
 */
export function validate(schema, target = 'body') {
  return async (req, reply) => {
    try {
      const validated = schema.parse(req[target]);
      req[target] = validated; // Replace with validated (and potentially transformed) data
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'validation_error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        });
      }
      throw error;
    }
  };
}

/**
 * Safe JSON parser with error handling
 * @param {string} str - JSON string to parse
 * @param {string} fieldName - Field name for error messages
 * @returns {any} Parsed JSON object
 * @throws {Error} If JSON is invalid
 */
export function safeJsonParse(str, fieldName = 'data') {
  if (!str) return undefined;
  try {
    return JSON.parse(str);
  } catch (e) {
    throw new Error(`Invalid JSON in ${fieldName}: ${e.message}`);
  }
}
