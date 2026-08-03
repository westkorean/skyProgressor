export type MarketPriceSource = 'bazaar' | 'auction-median' | 'auction-bin' | 'npc';
export interface MarketPrice { unitPrice: number; source: MarketPriceSource; lowestBinPrice?: number; recentMedianPrice?: number }
export type MarketPrices = Record<string, MarketPrice>;

const rec = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const price = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

export function parseAuctionPrices(payload: unknown): MarketPrices {
  const root = rec(payload);
  if (!root) return {};
  const lowestBins = rec(root.lowestBin) ?? root;
  const recent = rec(root.recent) ?? {};
  const result: MarketPrices = {};
  for (const [id, value] of Object.entries(lowestBins)) {
    const amount = price(value);
    if (amount !== null) result[id.toUpperCase()] = { unitPrice: amount, source: 'auction-bin', lowestBinPrice: amount };
  }
  for (const [id, value] of Object.entries(recent)) {
    const row = rec(value);
    const median = price(row?.recent);
    if (median === null) continue;
    const normalized = id.toUpperCase();
    result[normalized] = { unitPrice: median, source: 'auction-median', recentMedianPrice: median, lowestBinPrice: result[normalized]?.lowestBinPrice };
  }
  return result;
}

export function parseMarketPrices(bazaarPayload: unknown, auctionPayload: unknown): MarketPrices {
  const result = parseAuctionPrices(auctionPayload);
  const products = rec(rec(bazaarPayload)?.products) ?? {};
  for (const [id, value] of Object.entries(products)) {
    const status = rec(rec(value)?.quick_status);
    // sellPrice is the lowest active sell-order side: what a buyer currently pays.
    const amount = price(status?.sellPrice) ?? price(status?.buyPrice);
    if (amount !== null) result[id.toUpperCase()] = { unitPrice: amount, source: 'bazaar' };
  }
  return result;
}

export function marketPriceFor(id: string | null | undefined, prices: MarketPrices, npcSellPrice?: number | null): MarketPrice | null {
  if (id) {
    const normalized = id.toUpperCase();
    if (prices[normalized]) return prices[normalized];
    // Vanilla damage-value IDs sometimes use a colon while market feeds use a dash.
    const alternate = normalized.replace(':', '-');
    if (prices[alternate]) return prices[alternate];
  }
  return typeof npcSellPrice === 'number' && Number.isFinite(npcSellPrice) && npcSellPrice >= 0
    ? { unitPrice: npcSellPrice, source: 'npc' }
    : null;
}

export function petMarketKey(type: string, tier: string): string {
  const rarityIndex: Record<string, number> = { COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4, MYTHIC: 5, DIVINE: 6, SPECIAL: 7, VERY_SPECIAL: 8 };
  return `${type.toUpperCase()};${rarityIndex[tier.toUpperCase()] ?? 0}`;
}
