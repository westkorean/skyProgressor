import generated from '@/data/minions.generated.json';
import { estimateRecipeCost, type BazaarPrices } from './itemPricing';

export interface MinionFamilyProgress {
  id: string;
  name: string;
  craftedTiers: number[];
  highestTier: number;
  maxTier: number;
  missingTiers: number[];
  progressPercent: number;
}

export interface MinionUpgradeCandidate {
  id: string;
  name: string;
  tier: number;
  estimatedCost: number | null;
}

export interface MinionProgress {
  families: MinionFamilyProgress[];
  uniqueCrafts: number;
  totalCrafts: number;
  totalPossibleCrafts: number;
  progressPercent: number;
  estimatedSlots: number;
  craftsUntilNextSlot: number | null;
  closestUnlocks: MinionUpgradeCandidate[];
  cheapestMissingUpgrades: MinionUpgradeCandidate[];
  pricingAvailable: boolean;
}

type FamilyMetadata = { id: string; name: string; maxTier: number };
const catalog = generated.families as Record<string, FamilyMetadata>;
const SLOT_THRESHOLDS = [0, 5, 15, 30, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 350, 400, 450, 500, 550, 600, 650, 700];

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function craftedIds(profileOrMember: unknown): string[] {
  const root = record(profileOrMember);
  const members = record(root?.members);
  const sources = members ? Object.values(members) : [profileOrMember];
  const ids: string[] = [];
  for (const source of sources) {
    const playerData = record(record(source)?.player_data);
    if (!Array.isArray(playerData?.crafted_generators)) continue;
    for (const value of playerData.crafted_generators) {
      if (typeof value === 'string') ids.push(value.toUpperCase());
    }
  }
  return [...new Set(ids)];
}

export function parseMinions(profileOrMember: unknown, prices: BazaarPrices = {}): MinionProgress {
  const crafted = craftedIds(profileOrMember);
  const tiersByFamily = new Map<string, Set<number>>();
  for (const id of crafted) {
    const match = id.match(/^(.*)_(\d+)$/);
    if (!match) continue;
    const tier = Number(match[2]);
    if (!Number.isInteger(tier) || tier < 1) continue;
    const tiers = tiersByFamily.get(match[1]) ?? new Set<number>();
    tiers.add(tier);
    tiersByFamily.set(match[1], tiers);
  }

  const ids = new Set([...Object.keys(catalog), ...tiersByFamily.keys()]);
  const families = [...ids].map((id): MinionFamilyProgress => {
    const tiers = [...(tiersByFamily.get(id) ?? [])].sort((a, b) => a - b);
    const highestTier = tiers.length ? Math.max(...tiers) : 0;
    const maxTier = Math.max(catalog[id]?.maxTier ?? highestTier, highestTier);
    return {
      id,
      name: catalog[id]?.name ?? id.split('_').map((part) => part[0] + part.slice(1).toLowerCase()).join(' '),
      craftedTiers: tiers,
      highestTier,
      maxTier,
      missingTiers: Array.from({ length: maxTier }, (_, index) => index + 1).filter((tier) => !tiers.includes(tier)),
      progressPercent: maxTier ? Math.round((tiers.length / maxTier) * 100) : 0,
    };
  }).sort((a, b) => b.progressPercent - a.progressPercent || a.name.localeCompare(b.name));

  const uniqueCrafts = families.reduce((sum, family) => sum + family.craftedTiers.length, 0);
  const totalPossibleCrafts = families.reduce((sum, family) => sum + family.maxTier, 0);
  const slotIndex = SLOT_THRESHOLDS.findLastIndex((threshold) => uniqueCrafts >= threshold);
  const nextThreshold = SLOT_THRESHOLDS[slotIndex + 1] ?? null;
  const candidates = families
    .filter((family) => family.missingTiers.length > 0)
    .map((family) => ({
      id: `${family.id}_GENERATOR_${family.missingTiers[0]}`,
      name: `${family.name} Minion`,
      tier: family.missingTiers[0],
      estimatedCost: estimateRecipeCost(
        `${family.id}_GENERATOR_${family.missingTiers[0]}`,
        prices,
        family.missingTiers[0] > 1
          ? new Set([`${family.id}_GENERATOR_${family.missingTiers[0] - 1}`])
          : new Set()
      ),
    }));

  return {
    families,
    uniqueCrafts,
    totalCrafts: crafted.length,
    totalPossibleCrafts,
    progressPercent: totalPossibleCrafts ? Math.round((uniqueCrafts / totalPossibleCrafts) * 100) : 0,
    estimatedSlots: 5 + Math.max(0, slotIndex),
    craftsUntilNextSlot: nextThreshold === null ? null : nextThreshold - uniqueCrafts,
    closestUnlocks: [...candidates].sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name)).slice(0, 5),
    cheapestMissingUpgrades: candidates.filter((candidate) => candidate.estimatedCost !== null).sort((a, b) => (a.estimatedCost ?? Infinity) - (b.estimatedCost ?? Infinity) || a.name.localeCompare(b.name)).slice(0, 5),
    pricingAvailable: Object.keys(prices).length > 0,
  };
}
