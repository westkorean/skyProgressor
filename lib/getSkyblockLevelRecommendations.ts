export interface LevelRecommendation {
  title: string;
  detail: string;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function getSkyblockLevelRecommendations(
  member: unknown,
  slayers: { slayer: string; level: number; progressPercent: number }[]
): LevelRecommendation[] {
  const recommendations: LevelRecommendation[] = [];
  const dungeonTypes = record(record(record(member)?.dungeons)?.dungeon_types);
  const tierCompletions = record(record(dungeonTypes?.catacombs)?.tier_completions) ?? {};
  let nextFloor: number | null = null;
  for (let floor = 0; floor <= 7; floor++) {
    if (!tierCompletions[String(floor)]) { nextFloor = floor; break; }
  }
  if (nextFloor !== null) recommendations.push({ title: `Complete Catacombs Floor ${nextFloor}`, detail: 'First-time floor completions grant a one-time SkyBlock XP bonus.' });

  const target = slayers.filter((slayer) => slayer.level < 9).sort((a, b) => b.progressPercent - a.progressPercent)[0];
  if (target) recommendations.push({ title: `Level up your ${capitalize(target.slayer)} Slayer`, detail: `You're ${target.progressPercent}% to the next tier — slayer tier-ups grant SkyBlock XP.` });
  recommendations.push({ title: "Complete Jacob's Farming Contests & daily quests", detail: 'Contests, quests, and other one-time achievements are reliable ongoing sources of SkyBlock XP.' });
  return recommendations.slice(0, 3);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
