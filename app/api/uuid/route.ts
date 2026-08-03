import { NextRequest, NextResponse } from 'next/server';
import { fetchUpstreamJsonCached } from '@/lib/fetchUpstreamJson';

export async function GET(request: NextRequest) {
    
  const ign = request.nextUrl.searchParams.get('ign');

  if (!ign || !/^[A-Za-z0-9_]{1,16}$/.test(ign)) {
    return NextResponse.json({ error: 'Missing ign parameter' }, { status: 400 });
  }

  try {
    const result = await fetchUpstreamJsonCached(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(ign.toLowerCase())}`, {}, 300_000);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.status === 404 || result.status === 204 ? 'Player not found' : 'Mojang profile service is unavailable' },
        { status: result.status === 404 || result.status === 204 ? 404 : 502 }
      );
    }
    return NextResponse.json(result.data, { headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=300' } });
  } catch {
    return NextResponse.json({ error: 'Mojang profile service is unavailable' }, { status: 502 });
  }
}
