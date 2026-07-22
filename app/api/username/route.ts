import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const uuid = request.nextUrl.searchParams.get('uuid');

  if (!uuid) {
    return NextResponse.json({ error: 'Missing uuid parameter' }, { status: 400 });
  }

  const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);

  if (!res.ok) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  const data = await res.json();
  return NextResponse.json({ name: data.name });
}