import { NextResponse } from 'next/server';
import { enrichOwnedItems, type OwnedItemLookup } from '@/lib/ownedItemMetadata';

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const rawItems = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).items
      : null;
    if (!Array.isArray(rawItems) || rawItems.length > 750) {
      return NextResponse.json({ error: 'Invalid item metadata request' }, { status: 400 });
    }
    const items: OwnedItemLookup[] = rawItems.flatMap((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
      const item = value as Record<string, unknown>;
      if (typeof item.id !== 'string' || !/^[A-Z0-9_:\-]{1,100}$/i.test(item.id)) return [];
      return [{ id: item.id, name: typeof item.name === 'string' ? item.name.slice(0, 150) : null }];
    });
    return NextResponse.json({ items: await enrichOwnedItems(items) });
  } catch {
    return NextResponse.json({ error: 'Unable to enrich owned items' }, { status: 502 });
  }
}
