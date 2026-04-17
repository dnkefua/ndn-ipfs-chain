# NDN IPFS Chain MCP Server

**Model Context Protocol (MCP) implementation for AI-native pin management.**

Enables Claude (and other AI models) to manage IPFS content, analyze costs, and optimize storage tiers using natural language.

---

## Installation

### 1. Install Dependencies
```bash
cd mcp
npm install
```

### 2. Build TypeScript
```bash
npm run build
```

### 3. Set Environment Variables
```bash
export NDN_API_URL=http://localhost:3000/v1
export NDN_API_KEY=ndn_live_xxxxx  # OR
export NDN_JWT_TOKEN=eyJ...        # JWT token
```

### 4. Make Executable
```bash
chmod +x dist/index.js
```

---

## Using with Claude Desktop

### Step 1: Update Claude Configuration

Edit `~/.config/Claude/claude_desktop_config.json` (or create it):

```json
{
  "mcpServers": {
    "ndn-ipfs": {
      "command": "node",
      "args": ["/path/to/ndn-ipfs-chain/mcp/dist/index.js"],
      "env": {
        "NDN_API_URL": "http://localhost:3000/v1",
        "NDN_API_KEY": "ndn_live_your_key_here"
      }
    }
  }
}
```

### Step 2: Restart Claude Desktop

Close and reopen Claude. You should see "MCP Connections" in the bottom-left corner with a green dot.

### Step 3: Start Using

Open a new conversation and try:

```
"Show me my 10 largest pins and suggest which ones to move to Filecoin"
```

Claude will:
1. Call `list_pins(limit: 10, sort_by: "size")`
2. Get your usage analytics
3. Analyze storage costs
4. Recommend lifecycle policies

---

## Using with Claude API (Programmatic)

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-opus-4-1",
  max_tokens: 1024,
  tools: [
    // MCP tools are automatically injected here
  ],
  messages: [
    {
      role: "user",
      content: "What's my current storage cost and how can I save money?",
    },
  ],
});

console.log(response.content);
```

---

## Available Tools

### 1. `list_pins`
List all pinned CIDs with filtering and sorting.

**Parameters:**
- `limit` (number, optional): Max results (default: 50)
- `offset` (number, optional): Skip N pins (default: 0)
- `status` (string, optional): Filter by status (pinned|pinning|failed|queued)
- `sort_by` (string, optional): Sort by field (created|size)

**Example prompt:**
```
"Show me my 20 largest pins"
```

---

### 2. `pin_cid`
Pin a new CID to the network.

**Parameters:**
- `cid` (string, required): IPFS CID
- `name` (string, optional): Friendly name
- `region` (string, optional): us-west|us-east|eu|ap-southeast|ap-northeast
- `replication` (number, optional): Replica count (default: 3)
- `encryption` (boolean, optional): Enable encryption (default: false)

**Example prompt:**
```
"Pin this CID with encryption: QmXxxx"
```

---

### 3. `unpin_cid`
Remove a pin from the network.

**Parameters:**
- `cid` (string, required): IPFS CID to unpin

**Example prompt:**
```
"Delete this old pin: QmYyyy"
```

**⚠️ Warning:** This action is permanent.

---

### 4. `get_usage`
Get bandwidth, request, and storage metrics.

**Parameters:**
- `days` (number, optional): Time period (default: 30)

**Example prompt:**
```
"How much bandwidth did I use in the last 90 days?"
```

---

### 5. `get_pin_details`
Get detailed info about a specific pin.

**Parameters:**
- `cid` (string, required): IPFS CID

**Example prompt:**
```
"Tell me about this pin: QmXxxx"
```

---

### 6. `create_lifecycle_policy`
Create automatic tier transitions (hot → warm → cold → Filecoin).

**Parameters:**
- `name` (string, required): Policy name
- `rules` (array, required): Transition rules with days, from_tier, to_tier

**Example prompt:**
```
"Create a policy that moves all old pins to Filecoin after 90 days"
```

---

### 7. `analyze_costs`
Analyze storage costs and get optimization recommendations.

**Parameters:**
- `days` (number, optional): Analysis period (default: 30)

**Example prompt:**
```
"What's costing me the most and how can I save money?"
```

---

## Conversation Examples

### Example 1: Cost Optimization

**You:**
```
I have 500 pins and my storage bill is high. What should I do?
```

**Claude (using MCP):**
1. Calls `list_pins(limit: 500)`
2. Calls `get_usage(days: 30)`
3. Calls `analyze_costs()`

**Claude responds:**
```
I found several optimization opportunities:

1. Move large old pins to cold tier
   • old_podcast_2023.car (50 GB) → saves $4.00/mo
   • archive_backup_v1.car (75 GB) → saves $6.00/mo
   Total savings: $15/month

2. Your entire catalog is on "hot" tier
   → Moving 80% to "warm" would save $50/month

I recommend creating a lifecycle policy that:
- Keeps recent pins hot (first 30 days)
- Moves to warm (days 30-90)
- Moves to cold (days 90+)
- Pins to Filecoin after 180 days

This would cut your costs by 60% while keeping recent data fast.
```

**You:**
```
Create that policy for me
```

**Claude calls:** `create_lifecycle_policy(name: "Auto-archive", rules: [...])`

---

### Example 2: Bulk Organization

**You:**
```
Show me all my pins over 10 GB, sorted by size
```

**Claude calls:** `list_pins(sort_by: "size", limit: 100)`

**Claude responds:**
```
Found 12 pins over 10 GB:

1. database_backup_2024.car (75 GB) - hot tier - pinned
2. video_archive_raw.car (50 GB) - hot tier - pinned
3. dataset_training_v3.car (35 GB) - hot tier - pinned
...
```

**You:**
```
Pin all of these to Filecoin for long-term storage
```

**Claude calls:** Multiple `create_lifecycle_policy()` calls to set rules for each pin.

---

### Example 3: Real-Time Management

**You:**
```
I just got an event from a smart contract that says content QmZzzz should be pinned. Pin it with encryption in the EU region.
```

**Claude calls:** `pin_cid(cid: "QmZzzz", region: "eu", encryption: true)`

**Claude responds:**
```
✓ Pinned "contract-output" (CID: QmZzzz...)
Status: pinning
Region: EU
Encryption: enabled
Replication: 3x
```

---

## Architecture

```
Claude (UI or API)
    ↓
MCP Server (stdio)
    ↓
NDN API Client
    ↓
NDN IPFS Chain API
    ↓
Database + IPFS Cluster
```

**Communication:** Stdio (standard input/output) for local Claude Desktop, or HTTP for Claude API.

---

## Security

### API Key Handling
- Keys are loaded from environment variables only
- Never hardcoded in config files
- Use `.env` file locally (add to `.gitignore`)

### Scope Management
- Each API key has scopes (pins:read, pins:write, admin)
- MCP server respects those scopes
- Claude cannot escalate privileges

### Best Practices
```bash
# Development
export NDN_API_KEY=$(cat ~/.ndn/api-key.txt)
npm run dev

# Production
# Use rotating keys
# Audit all MCP calls via API logs
# Limit to read-only scopes when possible
```

---

## Troubleshooting

### Issue: "MCP Server Connection Failed"

**Solution:**
```bash
# Check server is running
npm run build
npm start

# Verify environment variables
echo $NDN_API_URL
echo $NDN_API_KEY

# Test API connectivity
curl http://localhost:3000/v1/pins -H "X-API-Key: $NDN_API_KEY"
```

### Issue: "Tool not found" in Claude

**Solution:**
- Restart Claude Desktop
- Check `claude_desktop_config.json` syntax (use JSON validator)
- Verify path to `dist/index.js` is absolute

### Issue: Claude calls tools but gets errors

**Solution:**
- Check API key is valid
- Verify API server is running
- Check MCP server logs: `npm run dev` (stdout in terminal)

---

## Example Use Cases

| Scenario | Claude Command |
|----------|----------------|
| **Daily cost report** | "What did I spend on storage yesterday?" |
| **Bulk pinning** | "Pin these 10 CIDs with 5x replication" |
| **Compliance audit** | "Show me all encrypted pins created before Jan 1" |
| **Archive automation** | "Create a policy to move everything to Filecoin after 1 year" |
| **Storage optimization** | "Find my 50 least-accessed pins" |
| **Cost forecasting** | "If my storage doubles, how much will it cost?" |
| **Disaster recovery** | "List all pins in US-West region" |

---

## Development

### Run in Development Mode
```bash
npm run dev
```

Outputs:
```
MCP stdio server listening...
```

Test with Claude Desktop (will auto-reload on file changes).

### Build for Production
```bash
npm run build
```

Output: `dist/index.js` (executable)

---

## API Reference

All tools return JSON responses converted to readable text by Claude.

**Tool Response Format:**
```typescript
{
  type: "text",
  text: "Human-readable response..."
}
```

---

## Contributing

Found a bug or want a new tool? Open an issue:
https://github.com/dnkefua/ndn-ipfs-chain/issues

---

## License

Apache 2.0

---

**Made for IPFS believers.** 🚀
