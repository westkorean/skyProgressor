import generated from '@/data/museum.generated.json';
import { estimateRecipeCost, type BazaarPrices } from './itemPricing';

export interface MuseumDonation { id: string; name: string; category: string | null; donationXp: number | null }
export interface MuseumProgress {
  available: boolean;
  donatedItems: MuseumDonation[];
  missingDonations: MuseumDonation[];
  museumValue: number | null;
  skyblockXp: number;
  cheapestNextDonation: (MuseumDonation & { estimatedCost: number }) | null;
  pricingAvailable: boolean;
}

const catalog = generated.items as Record<string, MuseumDonation>;
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

export function parseMuseum(payload: unknown, playerUuid: string, prices: BazaarPrices = {}): MuseumProgress {
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
    const estimatedCost = estimateRecipeCost(item.id, prices);
    return estimatedCost === null ? [] : [{ ...item, estimatedCost }];
  }).sort((a, b) => a.estimatedCost - b.estimatedCost || a.name.localeCompare(b.name));
  return {
    available: true,
    donatedItems: donatedItems.sort((a, b) => a.name.localeCompare(b.name)),
    missingDonations: missingDonations.sort((a, b) => a.name.localeCompare(b.name)),
    museumValue: typeof member.value === 'number' && Number.isFinite(member.value) ? member.value : null,
    skyblockXp: donatedItems.reduce((sum, item) => sum + (item.donationXp ?? 0), 0),
    cheapestNextDonation: pricedMissing[0] ?? null,
    pricingAvailable: Object.keys(prices).length > 0,
  };
}
