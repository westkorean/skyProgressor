import { NextRequest, NextResponse } from 'next/server';
import { fetchUpstreamJson } from '@/lib/fetchUpstreamJson';

export async function GET(request: NextRequest) {
  const uuid = request.nextUrl.searchParams.get('uuid');

  if (!uuid || !/^[a-f0-9-]{32,36}$/i.test(uuid)) {
    return NextResponse.json({ error: 'Missing uuid parameter' }, { status: 400 });
  }

  try {
    const result = await fetchUpstreamJson(`https://sessionserver.mojang.com/session/minecraft/profile/${encodeURIComponent(uuid)}`);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.status === 404 || result.status === 204 ? 'Player not found' : 'Mojang session service is unavailable' },
        { status: result.status === 404 || result.status === 204 ? 404 : 502 }
      );
    }
    const name = result.data && typeof result.data === 'object' && !Array.isArray(result.data) && typeof (result.data as Record<string, unknown>).name === 'string'
      ? (result.data as Record<string, unknown>).name
      : null;
    return NextResponse.json({ name });
  } catch {
    return NextResponse.json({ error: 'Mojang session service is unavailable' }, { status: 502 });
  }
}
