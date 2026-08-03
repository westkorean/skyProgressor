import type { BazaarPrices } from '../itemPricing.ts';
import type { MarketPrices } from '../marketPrices.ts';

export interface PricingSnapshot {
  marketPrices: MarketPrices;
  bazaarPrices: BazaarPrices;
  cachedAt: string;
  expiresAt: string;
  stale: boolean;
}

export interface PricedOpportunity {
  id: string;
  title: string;
  reason: string;
  estimatedPrice: number | null;
  priceSource: 'craft' | 'bazaar' | 'auction-median' | 'auction-bin' | 'npc' | null;
}
