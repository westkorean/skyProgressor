import { COLLECTION_TIERS, BOSS_COLLECTIONS } from './collectionData';

const VARIANT_NAMES: Record<string, string> = {
  LOG: 'Oak Log',
  'LOG:1': 'Spruce Log',
  'LOG:2': 'Birch Log',
  'LOG:3': 'Jungle Log',
  LOG_2: 'Acacia Log',
  'LOG_2:1': 'Dark Oak Log',
  'INK_SACK:3': 'Cocoa Beans',
  'INK_SACK:4': 'Lapis Lazuli',
  'SAND:1': 'Red Sand',
};

const COLLECTION_CATEGORIES: Record<string, string> = {
  WHEAT: 'Farming',
  CARROT_ITEM: 'Farming',
  POTATO_ITEM: 'Farming',
  SUGAR_CANE: 'Farming',
  COBBLESTONE: 'Mining',
  COAL: 'Mining',
  IRON_INGOT: 'Mining',
  GOLD_INGOT: 'Mining',
  DIAMOND: 'Mining',
  LOG: 'Foraging',
  LOG_2: 'Foraging',
  MUTTON: 'Combat',
  ROTTEN_FLESH: 'Combat',
};

type CollectionEntry = {
  rawKey: string;
  name: string;
  category: string;
  amount: number;
  tier: number;
  maxTier: number;
  nextTierRequirement: number | null;
  remaining: number | null;
  progressPercent: number;
  detail?: string;
};

function getCollectionCategory(key: string) {
  const base = key.replace(/:.*/, '');
  if (base.startsWith('BOSS_')) return 'Boss';
  return COLLECTION_CATEGORIES[base] ?? 'Other';
}

function formatCollectionName(rawKey: string) {
  if (VARIANT_NAMES[rawKey]) return VARIANT_NAMES[rawKey];

  return rawKey
    .replace(/:.*/, '')
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function createCollectionEntry(
  rawKey: string,
  amount: number,
  category: string,
  name: string,
  tiers: number[]
): CollectionEntry {
  let tier = 0;
  let nextTierRequirement: number | null = null;
  let progressPercent = 0;
  let remaining: number | null = null;

  if (tiers.length > 0) {
    tiers.forEach((requirement, index) => {
      if (amount >= requirement) {
        tier = index + 1;
      }
    });

    nextTierRequirement = tiers.find((t) => t > amount) ?? null;
    const previousRequirement = tier > 0 ? tiers[tier - 1] : 0;

    progressPercent = nextTierRequirement
      ? Math.min(
          100,
          Math.round(
            ((amount - previousRequirement) /
              (nextTierRequirement - previousRequirement)) *
              100
          )
        )
      : 100;

    remaining = nextTierRequirement ? nextTierRequirement - amount : null;
  }

  return {
    rawKey,
    name,
    category,
    amount,
    tier,
    maxTier: tiers.length,
    nextTierRequirement,
    remaining,
    progressPercent,
  };
}

function parseBossCollectionEntries(member: any): CollectionEntry[] {
  const tierCompletions =
    member?.dungeons?.dungeon_types?.catacombs?.tier_completions ?? {};

  return BOSS_COLLECTIONS.map((boss) => {
    const kills =
      boss.floor != null ? (tierCompletions[boss.floor.toString()] ?? 0) : 0;
    const tiers = boss.rewards.map((reward) => reward.required);
    const entry = createCollectionEntry(
      `BOSS_${boss.name.toUpperCase()}`,
      kills,
      'Boss',
      boss.name,
      tiers
    );

    if (entry.nextTierRequirement) {
      entry.detail = `Next reward at ${entry.nextTierRequirement} kills`;
    } else {
      entry.detail = 'All rewards unlocked';
    }

    return entry;
  });
}

export function parseCollections(member: any): CollectionEntry[] {
  const collections = member?.collection ?? {};

  const entries = Object.entries(collections).map(([key, value]) => {
    const amount = value as number;
    const lookupKey = key.replace(/:.*/, '');
    const category = getCollectionCategory(key);
    const name = formatCollectionName(key);
    const tiers = COLLECTION_TIERS[lookupKey] ?? [];

    return createCollectionEntry(key, amount, category, name, tiers);
  });

  return [...entries, ...parseBossCollectionEntries(member)].sort((a, b) => {
    if (a.category === 'Boss' && b.category !== 'Boss') return -1;
    if (b.category === 'Boss' && a.category !== 'Boss') return 1;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return b.amount - a.amount;
  });
}
