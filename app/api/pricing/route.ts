import { NextResponse } from 'next/server';
import { getPricingSnapshot } from '@/lib/pricing/service';

export async function GET() {
  try {
    const snapshot = await getPricingSnapshot();
    return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch {
    return NextResponse.json({ error: 'Pricing is temporarily unavailable.' }, { status: 502 });
  }
}
