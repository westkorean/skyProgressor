import generated from '@/data/bestiary.generated.json';

export interface BestiaryFamilyProgress {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  mobIds?: string[];
  kills: number;
  tier: number;
  maxTier: number;
  nextTierKills: number | null;
  remainingKills: number | null;
  progressPercent: number;
}

export interface BestiaryProgress {
  available: boolean;
  families: BestiaryFamilyProgress[];
  totalKills: number;
  unlockedFamilies: number;
  totalFamilies: number;
  missingFamilies: BestiaryFamilyProgress[];
  bestiaryLevel: number;
  milestoneTiers: number;
  skyblockXp: number;
  closestMilestone: BestiaryFamilyProgress | null;
}

type FamilyMetadata = { name: string; cap: number; mobs: string[]; bracket: number };
type CategoryMetadata = { name: string; mobs: FamilyMetadata[] };
const categories = generated.categories as Record<string, CategoryMetadata>;
const brackets = generated.brackets as Record<string, number[]>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function cleanDisplayName(value: string): string {
  return value.replace(/(?:§|Â§)./g, '').trim();
}

export function parseBestiary(member: unknown): BestiaryProgress {
  const bestiary = record(record(member)?.bestiary);
  const kills = record(bestiary?.kills);
  if (!kills) {
    return { available: false, families: [], totalKills: 0, unlockedFamilies: 0, totalFamilies: 0, missingFamilies: [], bestiaryLevel: 0, milestoneTiers: 0, skyblockXp: 0, closestMilestone: null };
  }

  const families: BestiaryFamilyProgress[] = [];
  for (const [categoryId, category] of Object.entries(categories)) {
    for (const family of category.mobs) {
      const totalKills = family.mobs.reduce((sum, id) => sum + safeNumber(kills[id]), 0);
      const thresholds = (brackets[String(family.bracket)] ?? []).filter((value) => value <= family.cap);
      const tier = thresholds.filter((value) => totalKills >= value).length;
      const nextTierKills = thresholds.find((value) => totalKills < value) ?? null;
      const previousKills = tier > 0 ? thresholds[tier - 1] : 0;
      const progressPercent = nextTierKills === null
        ? 100
        : Math.round(((totalKills - previousKills) / (nextTierKills - previousKills)) * 100);
      families.push({
        id: `${categoryId}:${family.name}`,
        categoryId,
        categoryName: category.name,
        name: cleanDisplayName(family.name),
        mobIds: [...family.mobs],
        kills: totalKills,
        tier,
        maxTier: thresholds.length,
        nextTierKills,
        remainingKills: nextTierKills === null ? null : nextTierKills - totalKills,
        progressPercent: Math.max(0, Math.min(100, progressPercent)),
      });
    }
  }

  const milestoneTiers = families.reduce((sum, family) => sum + family.tier, 0);
  const incomplete = families.filter((family) => family.remainingKills !== null);
  return {
    available: true,
    families,
    totalKills: families.reduce((sum, family) => sum + family.kills, 0),
    unlockedFamilies: families.filter((family) => family.kills > 0).length,
    totalFamilies: families.length,
    missingFamilies: families.filter((family) => family.kills === 0),
    bestiaryLevel: milestoneTiers / 10,
    milestoneTiers,
    // Each family tier grants 1 SkyBlock XP (equivalent to +10 every 10 tiers).
    skyblockXp: milestoneTiers,
    closestMilestone: [...incomplete].sort(
      (a, b) => (a.remainingKills ?? Infinity) - (b.remainingKills ?? Infinity) || a.name.localeCompare(b.name)
    )[0] ?? null,
  };
}
