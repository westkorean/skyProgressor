import generatedCollections from '../data/collections.generated.json' with { type: 'json' };
import { BOSS_COLLECTIONS } from './collectionData.ts';

export const COLLECTION_CATEGORY_ORDER = [
  'Farming',
  'Mining',
  'Combat',
  'Fishing',
  'Foraging',
  'Rift',
  'Crimson Isle',
  'Other',
] as const;

export type CollectionCategory = (typeof COLLECTION_CATEGORY_ORDER)[number];

export interface CollectionEntry {
  rawKey: string;
  name: string;
  category: CollectionCategory;
  amount: number;
  tier: number | null;
  maxTier: number | null;
  nextTierRequirement: number | null;
  remaining: number | null;
  progressPercent: number;
  nextReward: string | null;
}

type CollectionTier = {
  tier: number;
  amountRequired: number;
  unlocks: string[];
};

type CollectionMetadata = {
  id: string;
  name: string;
  category: string;
  maxTiers: number | null;
  tiers: CollectionTier[];
};

const metadata = generatedCollections.items as Record<string, CollectionMetadata>;

const CRIMSON_ISLE_COLLECTIONS = new Set([
  'BLAZE_ROD',
  'CHILI_PEPPER',
  'GHAST_TEAR',
  'GLOWSTONE_DUST',
  'MAGMA_CREAM',
  'MAGMA_FISH',
  'MYCEL',
  'NETHERRACK',
  'QUARTZ',
  'SAND:1',
  'SULPHUR',
  'SULPHUR_ORE',
]);

const CATEGORY_NAMES: Record<string, CollectionCategory> = {
  FARMING: 'Farming',
  MINING: 'Mining',
  COMBAT: 'Combat',
  FISHING: 'Fishing',
  FORAGING: 'Foraging',
  RIFT: 'Rift',
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function categoryFor(id: string, sourceCategory?: string): CollectionCategory {
  if (CRIMSON_ISLE_COLLECTIONS.has(id)) return 'Crimson Isle';
  return (sourceCategory && CATEGORY_NAMES[sourceCategory]) || 'Other';
}

function displayName(id: string): string {
  return id
    .replace(/:.*/, '')
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function createEntry(
  id: string,
  amount: number,
  itemMetadata?: CollectionMetadata
): CollectionEntry {
  const tiers = Array.isArray(itemMetadata?.tiers)
    ? [...itemMetadata.tiers].sort((a, b) => a.tier - b.tier)
    : [];
  const achieved = [...tiers]
    .reverse()
    .find((candidate) => amount >= candidate.amountRequired);
  const nextTier = tiers.find((candidate) => candidate.amountRequired > amount);
  const previousRequirement = achieved?.amountRequired ?? 0;
  const progressPercent = nextTier
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((amount - previousRequirement) /
              (nextTier.amountRequired - previousRequirement)) *
              100
          )
        )
      )
    : tiers.length > 0
      ? 100
      : 0;

  return {
    rawKey: id,
    name: itemMetadata?.name ?? displayName(id),
    category: categoryFor(id, itemMetadata?.category),
    amount,
    tier: achieved?.tier ?? null,
    maxTier: itemMetadata?.maxTiers ?? (tiers.length || null),
    nextTierRequirement: nextTier?.amountRequired ?? null,
    remaining: nextTier ? Math.max(0, nextTier.amountRequired - amount) : null,
    progressPercent,
    nextReward: nextTier?.unlocks.length ? nextTier.unlocks.join(', ') : null,
  };
}

function bossEntries(member: unknown): CollectionEntry[] {
  const memberRecord = record(member);
  const dungeons = record(memberRecord?.dungeons);
  const dungeonTypes = record(dungeons?.dungeon_types);
  const catacombs = record(dungeonTypes?.catacombs);
  const completions = record(catacombs?.tier_completions);

  return BOSS_COLLECTIONS.map((boss) => {
    const rawKills = boss.floor === null ? 0 : completions?.[String(boss.floor)];
    const amount = typeof rawKills === 'number' ? rawKills : 0;
    const tiers = boss.rewards.map((reward, index) => ({
      tier: index + 1,
      amountRequired: reward.required,
      unlocks: [reward.name],
    }));
    return createEntry(`BOSS_${boss.name.toUpperCase()}`, amount, {
      id: `BOSS_${boss.name.toUpperCase()}`,
      name: `${boss.name} Collection`,
      category: 'OTHER',
      maxTiers: tiers.length,
      tiers,
    });
  });
}

export function parseCollections(member: unknown): CollectionEntry[] {
  const memberRecord = record(member);
  const profileAmounts = record(memberRecord?.collection) ?? {};
  const allIds = new Set([...Object.keys(metadata), ...Object.keys(profileAmounts)]);
  const entries = [...allIds].map((id) => {
    const rawAmount = profileAmounts[id];
    return createEntry(id, typeof rawAmount === 'number' ? rawAmount : 0, metadata[id]);
  });

  return [...entries, ...bossEntries(member)];
}
