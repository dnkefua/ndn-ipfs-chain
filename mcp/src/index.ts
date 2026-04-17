#!/usr/bin/env node

import {
  Server,
  StdioServerTransport,
  CallToolRequest,
  Tool,
  TextContent,
} from '@modelcontextprotocol/sdk/server/index.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/shared/error.js';
import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NDN_API_URL || 'http://localhost:3000/v1';
const API_KEY = process.env.NDN_API_KEY || '';
const JWT_TOKEN = process.env.NDN_JWT_TOKEN || '';

interface Pin {
  cid: string;
  name: string;
  size: number;
  status: string;
  created: string;
  region?: string;
  replication?: number;
  tier?: string;
}

interface Usage {
  bandwidth: number;
  requests: number;
  storage: number;
  byTier?: Record<string, number>;
}

// Initialize API client
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_URL,
    timeout: 30000,
  });

  if (API_KEY) {
    client.defaults.headers.common['X-API-Key'] = API_KEY;
  } else if (JWT_TOKEN) {
    client.defaults.headers.common['Authorization'] = `Bearer ${JWT_TOKEN}`;
  }

  return client;
}

// Initialize MCP server
const server = new Server(
  {
    name: 'ndn-ipfs-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const api = createApiClient();

// Tool: List pins
async function listPins(args: Record<string, unknown>): Promise<TextContent> {
  const limit = (args.limit as number) || 50;
  const offset = (args.offset as number) || 0;
  const status = (args.status as string) || '';
  const sortBy = (args.sort_by as string) || 'created';

  try {
    const response = await api.get('/pins', {
      params: { limit, offset, status },
    });

    const pins = response.data.pins as Pin[] || [];

    // Sort if requested
    if (sortBy === 'size') pins.sort((a, b) => b.size - a.size);
    if (sortBy === 'created') pins.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    const text = pins
      .map(
        (p) =>
          `• ${p.name || p.cid.slice(0, 12)}... (${formatBytes(p.size)}, ${p.status}, tier: ${p.tier || 'hot'})`
      )
      .join('\n');

    return {
      type: 'text',
      text: `Found ${pins.length} pins:\n\n${text}`,
    };
  } catch (err: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to list pins: ${err.message}`
    );
  }
}

// Tool: Pin a CID
async function pinCid(args: Record<string, unknown>): Promise<TextContent> {
  const cid = args.cid as string;
  const name = (args.name as string) || cid.slice(0, 16);
  const region = (args.region as string) || '';
  const replication = (args.replication as number) || 3;
  const encryption = (args.encryption as boolean) || false;

  if (!cid) {
    throw new McpError(ErrorCode.InvalidRequest, 'CID is required');
  }

  try {
    const response = await api.post('/pins', {
      cid,
      name,
      region,
      replication,
      encryption,
    });

    const pin = response.data as Pin;
    return {
      type: 'text',
      text: `✓ Pinned "${pin.name}" (CID: ${pin.cid.slice(0, 16)}...)\nStatus: ${pin.status}\nSize: ${formatBytes(pin.size)}\nReplication: ${pin.replication}`,
    };
  } catch (err: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to pin CID: ${err.response?.data?.error || err.message}`
    );
  }
}

// Tool: Unpin a CID
async function unpinCid(args: Record<string, unknown>): Promise<TextContent> {
  const cid = args.cid as string;

  if (!cid) {
    throw new McpError(ErrorCode.InvalidRequest, 'CID is required');
  }

  try {
    await api.delete(`/pins/${cid}`);
    return {
      type: 'text',
      text: `✓ Unpinned ${cid.slice(0, 16)}...`,
    };
  } catch (err: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to unpin CID: ${err.response?.data?.error || err.message}`
    );
  }
}

// Tool: Get usage analytics
async function getUsage(args: Record<string, unknown>): Promise<TextContent> {
  const days = (args.days as number) || 30;

  try {
    const response = await api.get('/analytics/usage', {
      params: { days },
    });

    const usage = response.data as Usage;
    const bandwidth = formatBytes(usage.bandwidth);
    const storage = formatBytes(usage.storage);

    return {
      type: 'text',
      text: `Usage Statistics (Last ${days} days):\n\n📊 Bandwidth: ${bandwidth}\n📈 Requests: ${usage.requests.toLocaleString()}\n💾 Storage: ${storage}`,
    };
  } catch (err: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get usage: ${err.message}`
    );
  }
}

// Tool: Create lifecycle policy
async function createLifecyclePolicy(
  args: Record<string, unknown>
): Promise<TextContent> {
  const name = args.name as string;
  const rules = args.rules as Array<{
    days: number;
    from_tier: string;
    to_tier: string;
  }> || [];

  if (!name || rules.length === 0) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      'Policy name and at least one rule required'
    );
  }

  try {
    const response = await api.post('/lifecycle/policies', {
      name,
      rules,
    });

    const policy = response.data;
    const ruleText = rules
      .map((r) => `  • Day ${r.days}: ${r.from_tier} → ${r.to_tier}`)
      .join('\n');

    return {
      type: 'text',
      text: `✓ Created lifecycle policy "${name}"\n\nRules:\n${ruleText}`,
    };
  } catch (err: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to create policy: ${err.response?.data?.error || err.message}`
    );
  }
}

// Tool: Analyze costs and suggest optimizations
async function analyzeCosts(args: Record<string, unknown>): Promise<TextContent> {
  const days = (args.days as number) || 30;

  try {
    const [pinsRes, usageRes] = await Promise.all([
      api.get('/pins', { params: { limit: 1000 } }),
      api.get('/analytics/usage', { params: { days } }),
    ]);

    const pins = pinsRes.data.pins as Pin[] || [];
    const usage = usageRes.data as Usage;

    // Calculate costs
    const storageRate = 0.0001; // $0.10 per GB-month
    const currentCost = (usage.storage / 1e9) * storageRate;

    // Find optimization opportunities
    const hotContent = pins.filter((p) => !p.tier || p.tier === 'hot');
    const largeOldContent = pins
      .filter(
        (p) =>
          p.size > 1e9 &&
          new Date(p.created).getTime() < Date.now() - 60 * 24 * 60 * 60 * 1000
      )
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    let recommendations = '';
    if (largeOldContent.length > 0) {
      const savingsPerMonth = (largeOldContent.reduce((s, p) => s + p.size, 0) / 1e9) * storageRate * 0.8; // 80% savings moving to cold
      recommendations += `\n\n💡 Move these ${largeOldContent.length} large, old pins to cold tier:\n`;
      largeOldContent.forEach((p) => {
        recommendations += `  • ${p.name || p.cid.slice(0, 12)} (${formatBytes(p.size)}) - Saves $${(savingsPerMonth * (p.size / largeOldContent.reduce((s, pp) => s + pp.size, 0))).toFixed(2)}/mo`;
      });
      recommendations += `\n  → Total monthly savings: $${savingsPerMonth.toFixed(2)}`;
    }

    if (hotContent.length > pins.length * 0.8) {
      recommendations += `\n\n💡 ${Math.round((hotContent.length / pins.length) * 100)}% of pins are hot tier. Consider moving older content to warm tier to reduce costs.`;
    }

    return {
      type: 'text',
      text: `📉 Cost Analysis (${days}-day period):\n\nCurrent estimated cost: $${currentCost.toFixed(2)}\nStorage: ${formatBytes(usage.storage)}\nTotal pins: ${pins.length}${recommendations || '\n✓ No optimization opportunities found.'}`,
    };
  } catch (err: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to analyze costs: ${err.message}`
    );
  }
}

// Tool: Get pin details
async function getPinDetails(args: Record<string, unknown>): Promise<TextContent> {
  const cid = args.cid as string;

  if (!cid) {
    throw new McpError(ErrorCode.InvalidRequest, 'CID is required');
  }

  try {
    const response = await api.get(`/pins/${cid}`);
    const pin = response.data as Pin;

    return {
      type: 'text',
      text: `📌 Pin Details:\n\nName: ${pin.name}\nCID: ${pin.cid}\nSize: ${formatBytes(pin.size)}\nStatus: ${pin.status}\nRegion: ${pin.region || 'auto'}\nReplication: ${pin.replication || 3}x\nTier: ${pin.tier || 'hot'}\nCreated: ${new Date(pin.created).toLocaleDateString()}`,
    };
  } catch (err: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get pin details: ${err.message}`
    );
  }
}

// Helper: Format bytes to human-readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Register tools
const tools: Tool[] = [
  {
    name: 'list_pins',
    description:
      'List all pinned CIDs with optional filtering and sorting. Returns a summary of pins with size, status, and tier.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of pins to return (default: 50)',
        },
        offset: {
          type: 'number',
          description: 'Number of pins to skip (default: 0)',
        },
        status: {
          type: 'string',
          enum: ['pinned', 'pinning', 'failed', 'queued'],
          description: 'Filter by pin status',
        },
        sort_by: {
          type: 'string',
          enum: ['created', 'size'],
          description: 'Sort results by field (default: created)',
        },
      },
    },
  },
  {
    name: 'pin_cid',
    description:
      'Pin a new CID to the NDN network with optional encryption and replication.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        cid: {
          type: 'string',
          description: 'IPFS CID to pin (required)',
        },
        name: {
          type: 'string',
          description: 'Friendly name for the pin',
        },
        region: {
          type: 'string',
          enum: ['us-west', 'us-east', 'eu', 'ap-southeast', 'ap-northeast'],
          description: 'Preferred region for pin placement',
        },
        replication: {
          type: 'number',
          description: 'Number of replicas (default: 3)',
        },
        encryption: {
          type: 'boolean',
          description: 'Enable encryption at rest (default: false)',
        },
      },
      required: ['cid'],
    },
  },
  {
    name: 'unpin_cid',
    description: 'Remove a pin from the network. This action is permanent.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        cid: {
          type: 'string',
          description: 'IPFS CID to unpin (required)',
        },
      },
      required: ['cid'],
    },
  },
  {
    name: 'get_usage',
    description:
      'Get usage analytics including bandwidth, requests, and storage over a time period.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to report (default: 30)',
        },
      },
    },
  },
  {
    name: 'get_pin_details',
    description: 'Get detailed information about a specific pinned CID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        cid: {
          type: 'string',
          description: 'IPFS CID to get details for (required)',
        },
      },
      required: ['cid'],
    },
  },
  {
    name: 'create_lifecycle_policy',
    description:
      'Create an automatic lifecycle policy that transitions pins between storage tiers (hot → warm → cold → Filecoin).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Name for the policy (required)',
        },
        rules: {
          type: 'array',
          description: 'Array of transition rules (required)',
          items: {
            type: 'object',
            properties: {
              days: {
                type: 'number',
                description: 'Days after creation before transition',
              },
              from_tier: {
                type: 'string',
                enum: ['hot', 'warm', 'cold', 'filecoin'],
              },
              to_tier: {
                type: 'string',
                enum: ['hot', 'warm', 'cold', 'filecoin'],
              },
            },
          },
        },
      },
      required: ['name', 'rules'],
    },
  },
  {
    name: 'analyze_costs',
    description:
      'Analyze storage costs and get AI suggestions for cost optimization. Returns current costs and recommendations for moving data to cheaper tiers.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to analyze (default: 30)',
        },
      },
    },
  },
];

server.setRequestHandler(
  'tools/list',
  async () => ({
    tools,
  })
);

server.setRequestHandler(
  'tools/call',
  async (request: CallToolRequest) => {
    const { name, arguments: args } = request;

    let result: TextContent;

    switch (name) {
      case 'list_pins':
        result = await listPins(args);
        break;
      case 'pin_cid':
        result = await pinCid(args);
        break;
      case 'unpin_cid':
        result = await unpinCid(args);
        break;
      case 'get_usage':
        result = await getUsage(args);
        break;
      case 'get_pin_details':
        result = await getPinDetails(args);
        break;
      case 'create_lifecycle_policy':
        result = await createLifecyclePolicy(args);
        break;
      case 'analyze_costs':
        result = await analyzeCosts(args);
        break;
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }

    return {
      content: [result],
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
