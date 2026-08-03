import { NextRequest, NextResponse } from 'next/server';
import { fetchUpstreamJsonCached } from '@/lib/fetchUpstreamJson';

export async function GET(request: NextRequest) {
  const profile = request.nextUrl.searchParams.get('profile');
  if (!profile || !/^[a-f0-9-]{32,36}$/i.test(profile)) return NextResponse.json({ success: false, cause: 'Invalid profile parameter' }, { status: 400 });
  const apiKey = process.env.HYPIXEL_API_KEY;
  if (!apiKey) return NextResponse.json({ success: false, cause: 'Hypixel API key is not configured' }, { status: 503 });
  try {
    const result = await fetchUpstreamJsonCached(`https://api.hypixel.net/v2/skyblock/museum?profile=${encodeURIComponent(profile)}`, {
      headers: { 'API-Key': apiKey },
    }, 60_000);
    return NextResponse.json(result.data, { status: result.status, headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=60' } });
  } catch {
    return NextResponse.json({ success: false, cause: 'Hypixel Museum service is unavailable' }, { status: 502 });
  }
}
