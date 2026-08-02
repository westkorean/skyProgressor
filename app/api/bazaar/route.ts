import { NextResponse } from 'next/server';
import { fetchUpstreamJson } from '@/lib/fetchUpstreamJson';

export async function GET() {
  try {
    const result = await fetchUpstreamJson('https://api.hypixel.net/v2/skyblock/bazaar', { next: { revalidate: 60 } });
    return NextResponse.json(result.data, { status: result.status });
  } catch {
    return NextResponse.json({ success: false, cause: 'Hypixel Bazaar service is unavailable' }, { status: 502 });
  }
}
