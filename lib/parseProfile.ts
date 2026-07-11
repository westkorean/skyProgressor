import { SKILL_XP_TABLE, SKILL_MAX_LEVELS } from './xpTables';

export interface SkillProgress {
  skill: string;
  level: number;
  currentXp: number;
  xpForNextLevel: number | null;
  progressPercent: number;
}

function calculateSkillLevel(xp: number, maxLevel: number): SkillProgress['level'] extends never ? never : {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
} {
  let level = 0;
  for (let i = 1; i <= maxLevel; i++) {
    if (xp >= SKILL_XP_TABLE[i]) {
      level = i;
    } else {
      break;
    }
  }
  const xpForNextLevel = level < maxLevel ? SKILL_XP_TABLE[level + 1] : null;
  const xpIntoLevel = xp - SKILL_XP_TABLE[level];
  return { level, xpIntoLevel, xpForNextLevel };
}

export function parseSkills(member: any): SkillProgress[] {
  const skillKeys = Object.keys(member).filter((key) =>
    key.startsWith('experience_skill_')
  );

  return skillKeys.map((key) => {
    const skillName = key.replace('experience_skill_', '');
    const xp = member[key];
    const maxLevel = SKILL_MAX_LEVELS[skillName] ?? 50;
    const { level, xpForNextLevel } = calculateSkillLevel(xp, maxLevel);

    const currentThreshold = SKILL_XP_TABLE[level];
    const nextThreshold = xpForNextLevel ?? currentThreshold;
    const progressPercent =
      xpForNextLevel !== null
        ? Math.round(
            ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100
          )
        : 100;

    return {
      skill: skillName,
      level,
      currentXp: xp,
      xpForNextLevel,
      progressPercent,
    };
  });
}