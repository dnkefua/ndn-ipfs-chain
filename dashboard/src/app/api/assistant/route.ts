// Server-side proxy for the NDP AI Assistant.
// Forwards chat messages to Anthropic's Messages API using the ANTHROPIC_API_KEY
// set server-side. Never expose the key client-side.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are the NDN IPFS Chain assistant. NDN IPFS Chain is an enterprise IPFS platform that exposes three data planes behind one unified protocol — the NDN Data Protocol (NDP v1.0):

1. BLOBS — a superset of IPFS Pinning Services API v1.0, at /v1/pins. For arbitrary file storage.
2. MODELS — AI/ML model registry with chunked weight shards and range-addressable streaming, at /v1/models. Supports HuggingFace imports.
3. STRUCTURED RECORDS — immutable version chains with a Mongo-ish query DSL and content-addressed saved views, at /v1/records.

Every addressable NDP object is canonicalized via JCS (RFC 8785), hashed with SHA-256, and produces a CIDv1 (raw codec). Two implementations that produce the same logical content produce the same CID.

You help developers set up collections, schemas, views, pins, and model imports on NDN IPFS Chain. Be concise and technical. When the user asks for a schema or query, respond with valid JSON (Schema Draft 2020-12 for schemas, NDP query DSL for filters). Supported operators in the query DSL: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $exists, $and, $or, $not. Dot paths for nested fields (e.g. "body.user.email").

Dashboard routes the user can visit:
- /dashboard — Blobs (pin files)
- /dashboard/models — AI models registry
- /dashboard/records — Collections
- /dashboard/records/schemas — Schemas
- /dashboard/records/views — Saved views
- /dashboard/docs — Whitepaper and NDP spec

Never fabricate CIDs. If you don't know the exact CID, tell the user to look it up in the dashboard.`;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'assistant_unconfigured',
          message:
            'Set ANTHROPIC_API_KEY in the dashboard environment to enable the AI Assistant. See docs/deploy.md.',
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const messages: AssistantMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    if (messages.length === 0) {
      return NextResponse.json({ error: 'messages_required' }, { status: 400 });
    }

    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(errText);
      } catch {
        parsed = { raw: errText };
      }
      return NextResponse.json(
        { error: 'upstream_error', status: upstream.status, details: parsed },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    const reply =
      Array.isArray(data?.content) && data.content[0]?.type === 'text'
        ? (data.content[0].text as string)
        : '';

    return NextResponse.json({
      reply,
      model: data?.model,
      stop_reason: data?.stop_reason,
      usage: data?.usage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
