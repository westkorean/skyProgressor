import generated from '../data/museum.generated.json' with { type: 'json' };
import type { BazaarPrices } from './itemPricing';
import { bestAcquisitionPrice } from './pricing/opportunities.ts';
import type { MarketPrices } from './marketPrices.ts';
import { asRecord } from './parserUtils.ts';

export interface MuseumDonation { id: string; name: string; category: string | null; donationXp: number | null }
export interface MuseumProgress {
  available: boolean;
  donatedItems: MuseumDonation[];
  missingDonations: MuseumDonation[];
  museumValue: number | null;
  skyblockXp: number;
  cheapestNextDonation: (MuseumDonation & { estimatedCost: number; priceSource: string }) | null;
  pricingAvailable: boolean;
}

const catalog = generated.items as Record<string, MuseumDonation>;
const record = asRecord;

export function parseMuseum(payload: unknown, playerUuid: string, prices: BazaarPrices = {}, marketPrices: MarketPrices = {}): MuseumProgress {
  const root = record(payload);
  const profile = record(root?.profile);
  const normalized = playerUuid.replaceAll('-', '');
  const member = record(profile?.[playerUuid]) ?? record(profile?.[normalized]);
  if (root?.success !== true || !member) {
    return { available: false, donatedItems: [], missingDonations: [], museumValue: null, skyblockXp: 0, cheapestNextDonation: null, pricingAvailable: false };
  }
  const itemMap = record(member.items) ?? {};
  const donatedIds = new Set(Object.keys(itemMap));
  if (Array.isArray(member.special)) {
    for (const id of member.special) if (typeof id === 'string') donatedIds.add(id);
  }
  const donatedItems = [...donatedIds].map((id) => catalog[id] ?? { id, name: id, category: null, donationXp: null });
  const missingDonations = Object.values(catalog).filter((item) => !donatedIds.has(item.id));
  const pricedMissing = missingDonations.flatMap((item) => {
    const acquisition = bestAcquisitionPrice(item.id, marketPrices, prices);
    return acquisition === null ? [] : [{ ...item, estimatedCost: acquisition.price, priceSource: acquisition.source ?? 'unknown' }];
  }).sort((a, b) => a.estimatedCost - b.estimatedCost || a.name.localeCompare(b.name));
  return {
    available: true,
    donatedItems: donatedItems.sort((a, b) => a.name.localeCompare(b.name)),
    missingDonations: missingDonations.sort((a, b) => a.name.localeCompare(b.name)),
    museumValue: typeof member.value === 'number' && Number.isFinite(member.value) ? member.value : null,
    skyblockXp: donatedItems.reduce((sum, item) => sum + (item.donationXp ?? 0), 0),
    cheapestNextDonation: pricedMissing[0] ?? null,
    pricingAvailable: Object.keys(prices).length > 0 || Object.keys(marketPrices).length > 0,
  };
}
