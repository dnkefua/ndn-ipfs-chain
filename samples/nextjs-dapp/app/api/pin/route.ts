import { NDNClient } from '@ndnanalytics/ipfs';
import { NextRequest, NextResponse } from 'next/server';

const ipfs = new NDNClient({ apiKey: process.env.NDN_API_KEY! });

export async function POST(req: NextRequest) {
  const buf = Buffer.from(await req.arrayBuffer());
  const name = req.headers.get('x-filename') ?? 'upload';
  const pin = await ipfs.pin(buf, { name, region: 'us-east-1', encryption: true });
  return NextResponse.json(pin);
}
