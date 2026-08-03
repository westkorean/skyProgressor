import type { InventoryData, InventoryItem, SkyBlockRarity } from './parseInventory';

export interface AccessorySummaryItem { id: string; name: string; rarity: SkyBlockRarity | null; count: number; recombobulated: boolean; enrichment: string | null; family: string }
export interface AccessoryOpportunity { id: string; itemId: string | null; title: string; reason: string; estimatedPrice: number | null; priceSource: 'craft' | 'bazaar' | 'auction-median' | 'auction-bin' | 'npc' | null }
export interface AccessoriesData { available: boolean; magicalPower: number; bagUpgrades: number; activePower: string | null; duplicates: AccessorySummaryItem[]; missingAccessories: string[]; missingRarityUpgrades: string[]; recombobulatedCount: number; enrichments: Record<string, number>; missingFamilies: string[]; opportunities: AccessoryOpportunity[] }

const rec = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const family = (id: string) => id.replace(/_(TALISMAN|RING|ARTIFACT|RELIC)$/, '').replace(/_(COMMON|UNCOMMON|RARE|EPIC|LEGENDARY|MYTHIC)$/, '');
const raw = (item: InventoryItem) => JSON.stringify(item.nbt);
const ACCESSORY_UPGRADES: Record<string, string> = {
  FEATHER_TALISMAN: 'FEATHER_RING', FEATHER_RING: 'FEATHER_ARTIFACT',
  POTION_AFFINITY_TALISMAN: 'POTION_AFFINITY_RING', POTION_AFFINITY_RING: 'POTION_AFFINITY_ARTIFACT',
  SEA_CREATURE_TALISMAN: 'SEA_CREATURE_RING', SEA_CREATURE_RING: 'SEA_CREATURE_ARTIFACT',
  HEALING_TALISMAN: 'HEALING_RING', CANDY_TALISMAN: 'CANDY_RING', CANDY_RING: 'CANDY_ARTIFACT', CANDY_ARTIFACT: 'CANDY_RELIC',
  BAT_TALISMAN: 'BAT_RING', BAT_RING: 'BAT_ARTIFACT', ZOMBIE_TALISMAN: 'ZOMBIE_RING', ZOMBIE_RING: 'ZOMBIE_ARTIFACT',
  SPIDER_TALISMAN: 'SPIDER_RING', SPIDER_RING: 'SPIDER_ARTIFACT', WOLF_TALISMAN: 'WOLF_RING',
};

export function parseAccessories(member: unknown, inventory?: InventoryData): AccessoriesData {
  const storage = rec(rec(member)?.accessory_bag_storage);
  const items = inventory?.accessoryBag.items ?? [];
  const counts = new Map<string, AccessorySummaryItem>();
  for (const item of items) {
    if (!item.skyblockId) continue;
    const text = raw(item);
    const enrichment = /talisman_enrichment[^A-Z0-9]+([A-Z_]+)/i.exec(text)?.[1] ?? null;
    const existing = counts.get(item.skyblockId);
    if (existing) existing.count += item.count ?? 1;
    else counts.set(item.skyblockId, { id: item.skyblockId, name: item.displayName ?? item.skyblockId.replace(/_/g, ' '), rarity: item.rarity, count: item.count ?? 1, recombobulated: /rarity_upgrades[^0-9]+[1-9]/i.test(text), enrichment, family: family(item.skyblockId) });
  }
  const all = [...counts.values()];
  const owned = new Set(all.map((item) => item.id));
  const enrichments: Record<string, number> = {};
  all.forEach((item) => { if (item.enrichment) enrichments[item.enrichment] = (enrichments[item.enrichment] ?? 0) + 1; });
  const duplicates = all.filter((item) => item.count > 1);
  const upgrades: AccessoryOpportunity[] = all.flatMap((item) => {
    const next = ACCESSORY_UPGRADES[item.id];
    return next && !owned.has(next) ? [{ id: `upgrade-${next}`, itemId: next, title: `Upgrade to ${next.replace(/_/g, ' ')}`, reason: `The owned ${item.name} has a higher family tier available.`, estimatedPrice: null, priceSource: null }] : [];
  });
  return {
    available: storage !== null || Boolean(inventory?.accessoryBag.available),
    magicalPower: typeof storage?.highest_magical_power === 'number' ? storage.highest_magical_power : 0,
    bagUpgrades: typeof storage?.bag_upgrades_purchased === 'number' ? storage.bag_upgrades_purchased : 0,
    activePower: typeof storage?.selected_power === 'string' ? storage.selected_power : typeof storage?.selected_power_stone === 'string' ? storage.selected_power_stone : null,
    duplicates, missingAccessories: [], missingRarityUpgrades: upgrades.flatMap((item) => item.itemId ? [item.itemId] : []),
    recombobulatedCount: all.filter((item) => item.recombobulated).length, enrichments, missingFamilies: [],
    opportunities: [...upgrades, ...duplicates.map((item): AccessoryOpportunity => ({ id: `duplicate-${item.id}`, itemId: item.id, title: `Review duplicate ${item.name}`, reason: `${item.count} copies are in the accessory bag. Only the strongest family member normally contributes Magical Power.`, estimatedPrice: null, priceSource: null }))],
  };
}
