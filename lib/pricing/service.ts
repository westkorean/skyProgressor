import 'server-only';
import { fetchUpstreamJson } from '../fetchUpstreamJson';
import { parseBazaarPrices } from '../itemPricing.ts';
import { parseMarketPrices } from '../marketPrices.ts';
import { AsyncTTLCache } from './cache.ts';
import type { PricingSnapshot } from './types.ts';

const bazaarCache = new AsyncTTLCache<unknown>(60_000);
const auctionCache = new AsyncTTLCache<unknown>(120_000);

async function loadBazaar(): Promise<unknown> {
  const response = await fetchUpstreamJson('https://api.hypixel.net/v2/skyblock/bazaar', { next: { revalidate: 60 } }, 15_000);
  if (!response.ok) throw new Error('Bazaar pricing unavailable');
  return response.data;
}

async function loadAuctions(): Promise<unknown> {
  const [lowestBin, recent] = await Promise.all([
    fetchUpstreamJson('https://sky.coflnet.com/api/prices/neu', { next: { revalidate: 120 } }, 15_000),
    fetchUpstreamJson('https://sky.coflnet.com/api/prices/change', { next: { revalidate: 120 } }, 15_000),
  ]);
  if (!lowestBin.ok && !recent.ok) throw new Error('Auction pricing unavailable');
  return { lowestBin: lowestBin.ok ? lowestBin.data : {}, recent: recent.ok ? recent.data : {} };
}

export async function getPricingSnapshot(): Promise<PricingSnapshot> {
  const [bazaar, auctions] = await Promise.all([bazaarCache.get(loadBazaar), auctionCache.get(loadAuctions)]);
  return {
    marketPrices: parseMarketPrices(bazaar.value, auctions.value),
    bazaarPrices: parseBazaarPrices(bazaar.value),
    cachedAt: new Date(Math.min(bazaar.cachedAt, auctions.cachedAt)).toISOString(),
    expiresAt: new Date(Math.min(bazaar.expiresAt, auctions.expiresAt)).toISOString(),
    stale: bazaar.stale || auctions.stale,
  };
}

export function clearPricingCachesForTests(): void { bazaarCache.clear(); auctionCache.clear(); }
