import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  
  const uuid = request.nextUrl.searchParams.get('uuid');

  if (!uuid) {
    return NextResponse.json({ error: 'Missing uuid parameter' }, { status: 400 });
  }

  console.log('Using key:', process.env.HYPIXEL_API_KEY);

  const res = await fetch(
    `https://api.hypixel.net/v2/skyblock/profiles?uuid=${uuid}`,
    { headers: { 'API-Key': process.env.HYPIXEL_API_KEY! } }
  );

  const data = await res.json();
  return NextResponse.json(data);
}