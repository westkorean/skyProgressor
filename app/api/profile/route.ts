import { NextRequest, NextResponse } from 'next/server';
import { fetchUpstreamJsonCached } from '@/lib/fetchUpstreamJson';

export async function GET(request: NextRequest) {
  
  const uuid = request.nextUrl.searchParams.get('uuid');

  if (!uuid || !/^[a-f0-9-]{32,36}$/i.test(uuid)) {
    return NextResponse.json({ error: 'Invalid uuid parameter' }, { status: 400 });
  }

  const apiKey = process.env.HYPIXEL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Hypixel API key is not configured' }, { status: 503 });
  }

  try {
    const result = await fetchUpstreamJsonCached(
      `https://api.hypixel.net/v2/skyblock/profiles?uuid=${encodeURIComponent(uuid)}`,
      { headers: { 'API-Key': apiKey } },
      30_000
    );
    return NextResponse.json(result.data, { status: result.status, headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=30' } });
  } catch {
    return NextResponse.json({ error: 'Hypixel profile service is unavailable' }, { status: 502 });
  }
}
