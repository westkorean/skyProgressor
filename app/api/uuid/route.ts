import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    
  const ign = request.nextUrl.searchParams.get('ign');

  if (!ign) {
    return NextResponse.json({ error: 'Missing ign parameter' }, { status: 400 });
  }

  const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${ign}`);

  if (!res.ok) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  const data = await res.json();
  return NextResponse.json(data); // { id: uuid, name: ign }
}