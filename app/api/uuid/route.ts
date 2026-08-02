import { NextRequest, NextResponse } from 'next/server';
import { fetchUpstreamJson } from '@/lib/fetchUpstreamJson';

export async function GET(request: NextRequest) {
    
  const ign = request.nextUrl.searchParams.get('ign');

  if (!ign || !/^[A-Za-z0-9_]{1,16}$/.test(ign)) {
    return NextResponse.json({ error: 'Missing ign parameter' }, { status: 400 });
  }

  try {
    const result = await fetchUpstreamJson(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(ign)}`);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.status === 404 || result.status === 204 ? 'Player not found' : 'Mojang profile service is unavailable' },
        { status: result.status === 404 || result.status === 204 ? 404 : 502 }
      );
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: 'Mojang profile service is unavailable' }, { status: 502 });
  }
}
