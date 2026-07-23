export interface LevelRecommendation {
  title: string;
  detail: string;
}

export function getSkyblockLevelRecommendations(
  member: any,
  slayers: { slayer: string; level: number; progressPercent: number }[]
): LevelRecommendation[] {
  const recommendations: LevelRecommendation[] = [];

  // 1. Next uncompleted dungeon floor
  const tierCompletions = member?.dungeons?.dungeon_types?.catacombs?.tier_completions ?? {};
  let nextFloor: number | null = null;
  for (let i = 0; i <= 7; i++) {
    if (!tierCompletions[i.toString()]) {
      nextFloor = i;
      break;
    }
  }
  if (nextFloor !== null) {
    recommendations.push({
      title: `Complete Catacombs Floor ${nextFloor}`,
      detail: 'First-time floor completions grant a one-time SkyBlock XP bonus.',
    });
  }

  // 2. Slayer closest to next tier (lowest level, or highest progress if tied)
  const incompleteSlayers = slayers.filter((s) => s.level < 9);
  if (incompleteSlayers.length > 0) {
    const target = [...incompleteSlayers].sort(
      (a, b) => b.progressPercent - a.progressPercent
    )[0];
    recommendations.push({
      title: `Level up your ${capitalize(target.slayer)} Slayer`,
      detail: `You're ${target.progressPercent}% to the next tier — slayer tier-ups grant SkyBlock XP.`,
    });
  }

  // 3. General catch-all
  recommendations.push({
    title: 'Complete Jacob\'s Farming Contests & daily quests',
    detail: 'Contests, quests, and other one-time achievements are reliable ongoing sources of SkyBlock XP.',
  });

  return recommendations.slice(0, 3);
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}