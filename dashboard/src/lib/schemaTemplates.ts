// Curated JSON Schema Draft 2020-12 templates for the New Collection modal.
// Each template is a valid JSON Schema object. The user can edit before submit.

export interface SchemaTemplate {
  id: string;
  label: string;
  description: string;
  schema: Record<string, unknown>;
}

const DIALECT = 'https://json-schema.org/draft/2020-12/schema';

export const SCHEMA_TEMPLATES: SchemaTemplate[] = [
  {
    id: 'user-profile',
    label: 'User Profile',
    description: 'End-user account records (email, display name, avatar).',
    schema: {
      $schema: DIALECT,
      type: 'object',
      required: ['id', 'email', 'display_name'],
      additionalProperties: false,
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        display_name: { type: 'string', minLength: 1, maxLength: 120 },
        avatar_cid: { type: 'string' },
        bio: { type: 'string', maxLength: 1024 },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
  },
  {
    id: 'product',
    label: 'Product',
    description: 'Catalog items with SKU, price, and inventory status.',
    schema: {
      $schema: DIALECT,
      type: 'object',
      required: ['sku', 'name', 'price_cents', 'currency'],
      additionalProperties: false,
      properties: {
        sku: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        price_cents: { type: 'integer', minimum: 0 },
        currency: { type: 'string', minLength: 3, maxLength: 3 },
        description: { type: 'string' },
        image_cids: { type: 'array', items: { type: 'string' } },
        tags: { type: 'array', items: { type: 'string' } },
        in_stock: { type: 'boolean' },
      },
    },
  },
  {
    id: 'order',
    label: 'Order',
    description: 'Customer orders with line items and fulfillment status.',
    schema: {
      $schema: DIALECT,
      type: 'object',
      required: ['id', 'customer_id', 'items', 'total_cents', 'status'],
      additionalProperties: false,
      properties: {
        id: { type: 'string', format: 'uuid' },
        customer_id: { type: 'string', format: 'uuid' },
        items: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['sku', 'qty', 'unit_price_cents'],
            additionalProperties: false,
            properties: {
              sku: { type: 'string' },
              qty: { type: 'integer', minimum: 1 },
              unit_price_cents: { type: 'integer', minimum: 0 },
            },
          },
        },
        total_cents: { type: 'integer', minimum: 0 },
        status: {
          type: 'string',
          enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
        },
        shipped_at: { type: 'string', format: 'date-time' },
      },
    },
  },
  {
    id: 'event-log',
    label: 'Event Log',
    description: 'Audit-friendly application events with actor and payload.',
    schema: {
      $schema: DIALECT,
      type: 'object',
      required: ['event_type', 'timestamp', 'actor', 'payload'],
      additionalProperties: false,
      properties: {
        event_type: { type: 'string', minLength: 1 },
        timestamp: { type: 'string', format: 'date-time' },
        actor: { type: 'string' },
        payload: { type: 'object' },
        session_id: { type: 'string' },
        ip_hash: { type: 'string' },
      },
    },
  },
  {
    id: 'article',
    label: 'Article / CMS Post',
    description: 'Blog or CMS entries with markdown body and publish state.',
    schema: {
      $schema: DIALECT,
      type: 'object',
      required: ['title', 'body_md', 'slug', 'published', 'author'],
      additionalProperties: false,
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        body_md: { type: 'string' },
        slug: { type: 'string', pattern: '^[a-z0-9-]+$' },
        published: { type: 'boolean' },
        author: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        cover_image_cid: { type: 'string' },
        published_at: { type: 'string', format: 'date-time' },
      },
    },
  },
  {
    id: 'telemetry',
    label: 'Telemetry Sample',
    description: 'Device metric readings with tags and optional geohash.',
    schema: {
      $schema: DIALECT,
      type: 'object',
      required: ['device_id', 'metric', 'value', 'unit', 'timestamp'],
      additionalProperties: false,
      properties: {
        device_id: { type: 'string' },
        metric: { type: 'string' },
        value: { type: 'number' },
        unit: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        tags: { type: 'object', additionalProperties: { type: 'string' } },
        geohash: { type: 'string' },
      },
    },
  },
  {
    id: 'ipfs-pin',
    label: 'IPFS Pin Record',
    description: 'Pinning operations with replication count and status.',
    schema: {
      $schema: DIALECT,
      type: 'object',
      required: ['cid', 'tenant', 'pinned_at', 'replication_count', 'status'],
      additionalProperties: false,
      properties: {
        cid: { type: 'string' },
        tenant: { type: 'string', format: 'uuid' },
        pinned_at: { type: 'string', format: 'date-time' },
        replication_count: { type: 'integer', minimum: 1 },
        status: { type: 'string', enum: ['pinning', 'pinned', 'failed'] },
        size_bytes: { type: 'integer', minimum: 0 },
        labels: { type: 'object' },
      },
    },
  },
];

export function getTemplate(id: string): SchemaTemplate | undefined {
  return SCHEMA_TEMPLATES.find((t) => t.id === id);
}
