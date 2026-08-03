import { NextResponse } from 'next/server';
import { fetchUpstreamJson } from '@/lib/fetchUpstreamJson';

export async function GET() {
  try {
    const [lowestBin, recent] = await Promise.all([
      fetchUpstreamJson('https://sky.coflnet.com/api/prices/neu', { next: { revalidate: 120 } }, 15_000),
      fetchUpstreamJson('https://sky.coflnet.com/api/prices/change', { next: { revalidate: 120 } }, 15_000),
    ]);
    if (!lowestBin.ok && !recent.ok) return NextResponse.json({ error: 'Auction pricing is temporarily unavailable' }, { status: 502 });
    return NextResponse.json({ lowestBin: lowestBin.ok ? lowestBin.data : {}, recent: recent.ok ? recent.data : {} });
  } catch {
    return NextResponse.json({ error: 'Auction pricing is temporarily unavailable' }, { status: 502 });
  }
}
