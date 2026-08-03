import { asRecord, nonNegativeNumber } from './parserUtils.ts';

export interface TrophyFishProgress {
  caught: number;
  unique: number;
  totalTypes: number;
  tiers: Record<string, number>;
}

export interface CrimsonProgress {
  available: boolean;
  mageReputation: number;
  barbarianReputation: number;
  faction: string | null;
  kuudraCompletions: Record<string, number>;
  trophyFish: TrophyFishProgress;
  attributes: Record<string, number>;
  importantUnlocks: string[];
}

const TROPHY_TIERS = ['bronze', 'silver', 'gold', 'diamond'] as const;

export function parseCrimson(member: unknown): CrimsonProgress {
  const player = asRecord(member);
  const crimson = asRecord(player?.nether_island_player_data);
  const kuudra = asRecord(crimson?.kuudra_completed_tiers)
    ?? asRecord(crimson?.kuudra_completions)
    ?? {};
  const trophyFish = asRecord(player?.trophy_fish) ?? {};
  const fish = Object.entries(trophyFish)
    .filter(([, value]) => typeof value === 'number' && !/rewards|total_caught/i.test(String(value)));
  const attributes = asRecord(crimson?.attributes) ?? asRecord(player?.attributes) ?? {};
  const quests = asRecord(crimson?.quests) ?? {};

  return {
    available: crimson !== null,
    mageReputation: nonNegativeNumber(crimson?.mages_reputation ?? crimson?.mage_reputation),
    barbarianReputation: nonNegativeNumber(crimson?.barbarians_reputation ?? crimson?.barbarian_reputation),
    faction: typeof crimson?.selected_faction === 'string'
      ? crimson.selected_faction
      : typeof crimson?.faction === 'string' ? crimson.faction : null,
    kuudraCompletions: Object.fromEntries(
      Object.entries(kuudra).map(([id, value]) => [id, nonNegativeNumber(value)]),
    ),
    trophyFish: {
      caught: nonNegativeNumber(
        trophyFish.total_caught ?? fish.reduce((sum, [, value]) => sum + nonNegativeNumber(value), 0),
      ),
      unique: new Set(fish.map(([id]) => id.replace(/_(bronze|silver|gold|diamond)$/i, ''))).size,
      totalTypes: 18,
      tiers: Object.fromEntries(TROPHY_TIERS.map((tier) => [
        tier,
        fish.filter(([id]) => id.endsWith(`_${tier}`)).reduce((sum, [, value]) => sum + nonNegativeNumber(value), 0),
      ])),
    },
    attributes: Object.fromEntries(
      Object.entries(attributes)
        .filter(([, value]) => typeof value === 'number')
        .map(([id, value]) => [id, nonNegativeNumber(value)]),
    ),
    importantUnlocks: Object.entries(quests).filter(([, value]) => Boolean(value)).map(([id]) => id),
  };
}
