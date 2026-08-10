import { NextRequest, NextResponse } from 'next/server';

const NETWORTH_TTL_MS = 60_000;
const MAX_NETWORTH_ENTRIES = 50;
type NetworthCacheEntry = { expiresAt: number; value: unknown };
const networthCache = new Map<string, NetworthCacheEntry>();
const networthRequests = new Map<string, Promise<unknown>>();
let skyhelperPricesPromise: Promise<Record<string, number>> | null = null;
let skyhelperPricesExpiresAt = 0;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function contentHash(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 2_166_136_261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

async function cachedSkyhelperPrices(): Promise<Record<string, number>> {
  if (skyhelperPricesPromise && Date.now() < skyhelperPricesExpiresAt) return skyhelperPricesPromise;
  skyhelperPricesExpiresAt = Date.now() + 5 * 60_000;
  skyhelperPricesPromise = import('skyhelper-networth')
    .then(({ getPrices }) => getPrices(true) as Promise<Record<string, number>>)
    .catch((error) => {
      skyhelperPricesPromise = null;
      skyhelperPricesExpiresAt = 0;
      throw error;
    });
  return skyhelperPricesPromise;
}

export async function POST(request: NextRequest) {
  try {
    const body = record(await request.json());
    const member = record(body?.member);
    const museumPayload = record(body?.museum);
    const playerUuid = typeof body?.playerUuid === 'string' ? body.playerUuid.replaceAll('-', '') : '';
    const profileMuseum = record(museumPayload?.profile);
    const museumMember = record(profileMuseum?.[playerUuid]) ?? {};
    const bank = typeof body?.bank === 'number' && Number.isFinite(body.bank) ? body.bank : 0;
    if (!member || !playerUuid) {
      return NextResponse.json({ error: 'Invalid net-worth input.' }, { status: 400 });
    }

    const cacheKey = `${playerUuid}:${bank}:${contentHash(member)}:${contentHash(museumMember)}`;
    const cached = networthCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return NextResponse.json(cached.value);

    let requestPromise = networthRequests.get(cacheKey);
    if (!requestPromise) {
      requestPromise = (async () => {
        const [{ ProfileNetworthCalculator }, skyhelperPrices] = await Promise.all([
          import('skyhelper-networth'),
          cachedSkyhelperPrices(),
        ]);
        const calculator = new ProfileNetworthCalculator(member, museumMember, bank);
        return calculator.getNetworth({
          prices: skyhelperPrices,
          cachePrices: true,
          onlyNetworth: false,
          includeItemData: false,
          stackItems: true,
        });
      })().finally(() => networthRequests.delete(cacheKey));
      networthRequests.set(cacheKey, requestPromise);
    }
    const result = await requestPromise;
    while (networthCache.size >= MAX_NETWORTH_ENTRIES) {
      const oldest = networthCache.keys().next().value;
      if (typeof oldest !== 'string') break;
      networthCache.delete(oldest);
    }
    networthCache.set(cacheKey, { expiresAt: Date.now() + NETWORTH_TTL_MS, value: result });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Complete net-worth pricing is temporarily unavailable.' }, { status: 502 });
  }
}
