import type { CollectionEntry } from './parseCollections.ts';
import type { SkillProgress } from './parseProfile.ts';
import { asRecord, nonNegativeNumber } from './parserUtils.ts';

export interface FishingProgress {
  available: boolean;
  level: number;
  currentXp: number;
  xpToNextLevel: number | null;
  progressPercent: number;
  seaCreatureKills: number;
  trophyFish: { total: number; unique: number; tiers: Record<string, number> };
  sharkFestivalKills: number;
  milestones: Array<{ name: string; value: number }>;
  collections: CollectionEntry[];
}

const TROPHY_TIERS = ['bronze', 'silver', 'gold', 'diamond'] as const;
const SEA_CREATURE_PATTERN = /sea_creature|sea_emperor|guardian_emperor|fishing_mob/i;

export function parseFishing(
  member: unknown,
  skills: readonly SkillProgress[] = [],
  collections: readonly CollectionEntry[] = [],
): FishingProgress {
  const player = asRecord(member);
  const skill = skills.find((entry) => entry.skill.toLowerCase() === 'fishing');
  const stats = asRecord(player?.stats) ?? {};
  const trophyFish = asRecord(player?.trophy_fish) ?? {};
  const trophyEntries = Object.entries(trophyFish)
    .filter(([id, value]) => typeof value === 'number' && !/total|reward/i.test(id));
  const bestiary = asRecord(player?.bestiary) ?? {};
  const seaCreatureKills = Object.entries({ ...stats, ...bestiary })
    .filter(([id]) => SEA_CREATURE_PATTERN.test(id))
    .reduce((sum, [, value]) => sum + nonNegativeNumber(value), 0);
  const sharkFestivalKills = Object.entries(stats)
    .filter(([id]) => /shark/i.test(id))
    .reduce((sum, [, value]) => sum + nonNegativeNumber(value), 0);

  return {
    available: Boolean(skill) || player !== null,
    level: skill?.level ?? 0,
    currentXp: skill?.currentXp ?? 0,
    xpToNextLevel: skill?.xpForNextLevel === null
      ? null
      : Math.max(0, (skill?.xpForNextLevel ?? 0) - (skill?.currentXp ?? 0)),
    progressPercent: skill?.progressPercent ?? 0,
    seaCreatureKills,
    trophyFish: {
      total: nonNegativeNumber(
        trophyFish.total_caught
          ?? trophyEntries.reduce((sum, [, value]) => sum + nonNegativeNumber(value), 0),
      ),
      unique: new Set(trophyEntries.map(([id]) => id.replace(/_(bronze|silver|gold|diamond)$/i, ''))).size,
      tiers: Object.fromEntries(TROPHY_TIERS.map((tier) => [
        tier,
        trophyEntries
          .filter(([id]) => id.endsWith(`_${tier}`))
          .reduce((sum, [, value]) => sum + nonNegativeNumber(value), 0),
      ])),
    },
    sharkFestivalKills,
    milestones: Object.entries(stats)
      .filter(([id, value]) => typeof value === 'number' && /fishing|sea_creature|shark/i.test(id))
      .slice(0, 20)
      .map(([name, value]) => ({ name, value: nonNegativeNumber(value) })),
    collections: collections.filter((collection) => collection.category === 'Fishing'),
  };
}
