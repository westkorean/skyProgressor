import { estimateRecipeCost, type BazaarPrices } from '../itemPricing.ts';
import { marketPriceFor, type MarketPrices } from '../marketPrices.ts';
import type { AccessoryOpportunity } from '../parseAccessories.ts';
import type { PricedOpportunity } from './types.ts';

export function bestAcquisitionPrice(id: string, marketPrices: MarketPrices, bazaarPrices: BazaarPrices): { price: number; source: PricedOpportunity['priceSource'] } | null {
  const craft = estimateRecipeCost(id, bazaarPrices);
  const market = marketPriceFor(id, marketPrices);
  const candidates = [
    craft === null ? null : { price: craft, source: 'craft' as const },
    market ? { price: market.unitPrice, source: market.source === 'bazaar' ? 'bazaar' as const : market.source } : null,
  ].filter((value): value is NonNullable<typeof value> => value !== null && Number.isFinite(value.price) && value.price >= 0);
  return candidates.sort((a, b) => a.price - b.price)[0] ?? null;
}

export function priceAccessoryOpportunities(opportunities: readonly AccessoryOpportunity[], marketPrices: MarketPrices, bazaarPrices: BazaarPrices): AccessoryOpportunity[] {
  return opportunities.map((opportunity) => {
    const itemId = opportunity.itemId ?? opportunity.id.replace(/^(missing|upgrade|duplicate)-/, '');
    const price = bestAcquisitionPrice(itemId, marketPrices, bazaarPrices);
    return { ...opportunity, estimatedPrice: price?.price ?? null, priceSource: price?.source ?? null };
  }).sort((a, b) => (a.estimatedPrice ?? Number.POSITIVE_INFINITY) - (b.estimatedPrice ?? Number.POSITIVE_INFINITY) || a.title.localeCompare(b.title));
}
