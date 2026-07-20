import { SkillProgress, SlayerProgress, CatacombsProgress } from './parseProfile';

export interface Suggestion {
  category: 'skill' | 'slayer' | 'catacombs';
  name: string;
  level: number;
  progressPercent: number;
  message: string;
}

export function getTopSuggestions(
  skills: SkillProgress[],
  slayers: SlayerProgress[],
  catacombs: CatacombsProgress
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Skills closest to leveling up
  skills.forEach((s) => {
    if (s.xpForNextLevel !== null) {
      suggestions.push({
        category: 'skill',
        name: s.skill,
        level: s.level,
        progressPercent: s.progressPercent,
        message: `${capitalize(s.skill)} is ${s.progressPercent}% to Level ${s.level + 1}`,
      });
    }
  });

  // Slayers closest to leveling up
  slayers.forEach((s) => {
    if (s.xpForNextLevel !== null) {
      suggestions.push({
        category: 'slayer',
        name: s.slayer,
        level: s.level,
        progressPercent: s.progressPercent,
        message: `${capitalize(s.slayer)} slayer is ${s.progressPercent}% to Level ${s.level + 1}`,
      });
    }
  });

  // Catacombs
  if (catacombs.xpForNextLevel !== null) {
    suggestions.push({
      category: 'catacombs',
      name: 'catacombs',
      level: catacombs.level,
      progressPercent: catacombs.progressPercent,
      message: `Catacombs is ${catacombs.progressPercent}% to Level ${catacombs.level + 1}`,
    });
  }

  // Sort by closest to leveling up (highest progress %) — the "quick win" angle
  suggestions.sort((a, b) => b.progressPercent - a.progressPercent);

  // Return top 3
  return suggestions.slice(0, 3);
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}