import { SKILL_XP_TABLE, SKILL_MAX_LEVELS, CATACOMBS_XP_TABLE, CATACOMBS_MAX_LEVEL, SLAYER_XP_TABLE, TOTAL_FAIRY_SOULS } from './xpTables';

export interface SkillProgress {
  skill: string;
  level: number;
  currentXp: number;
  xpForNextLevel: number | null;
  progressPercent: number;
}

export interface SlayerProgress {
  slayer: string;
  level: number;
  currentXp: number;
  xpForNextLevel: number | null;
  progressPercent: number;
}

export interface CatacombsProgress {
  level: number;
  currentXp: number;
  xpForNextLevel: number | null;
  progressPercent: number;
}

export interface FairySoulProgress {
  collected: number;
  total: number;
  progressPercent: number;
  remaining: number;
}

function calculateLevel(xp: number, xpTable: number[], maxLevel: number) {
  let level = 0;
  for (let i = 1; i <= maxLevel; i++) {
    if (xp >= xpTable[i]) {
      level = i;
    } else {
      break;
    }
  }

  const currentThreshold = xpTable[level] ?? 0;
  const nextThreshold = level < maxLevel ? xpTable[level + 1] : null;

  const progressPercent =
    nextThreshold !== null
      ? Math.min(
          100,
          Math.round(
            ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100
          )
        )
      : 100;

  return { level, xpForNextLevel: nextThreshold, progressPercent };
}

export function parseSkills(member: any): SkillProgress[] {
  const experience = member?.player_data?.experience ?? {};
  const skillKeys = Object.keys(experience).filter((key) =>
    key.startsWith('SKILL_')
  );

  return skillKeys.map((key) => {
    const skillName = key.replace('SKILL_', '').toLowerCase();
    const xp = experience[key];
    const maxLevel = SKILL_MAX_LEVELS[skillName] ?? 50;
    const { level, xpForNextLevel, progressPercent } = calculateLevel(
      xp,
      SKILL_XP_TABLE,
      maxLevel
    );

    return {
      skill: skillName,
      level,
      currentXp: xp,
      xpForNextLevel,
      progressPercent,
    };
  });
}

export function parseSlayers(member: any): SlayerProgress[] {
  const bosses = member?.slayer?.slayer_bosses ?? {};

  return Object.keys(bosses).map((slayerName) => {
    const xp = bosses[slayerName]?.xp ?? 0;
    const { level, xpForNextLevel, progressPercent } = calculateLevel(
      xp,
      SLAYER_XP_TABLE,
      9
    );

    return {
      slayer: slayerName,
      level,
      currentXp: xp,
      xpForNextLevel,
      progressPercent,
    };
  });
}

export function parseCatacombs(member: any): CatacombsProgress {
  const xp = member?.dungeons?.dungeon_types?.catacombs?.experience ?? 0;
  const { level, xpForNextLevel, progressPercent } = calculateLevel(
    xp,
    CATACOMBS_XP_TABLE,
    CATACOMBS_MAX_LEVEL
  );

  return { level, currentXp: xp, xpForNextLevel, progressPercent };
}

export function parseFairySouls(member: any): FairySoulProgress {
  const collected = member?.fairy_soul?.total_collected ?? 0;
  const progressPercent = Math.min(
    100,
    Math.round((collected / TOTAL_FAIRY_SOULS) * 100)
  );

  return {
    collected,
    total: TOTAL_FAIRY_SOULS,
    progressPercent,
    remaining: Math.max(0, TOTAL_FAIRY_SOULS - collected),
  };
}

export interface SkyblockLevelProgress {
  level: number;
  progressPercent: number;
  currentXp: number;
}

export function parseSkyblockLevel(member: any): SkyblockLevelProgress {
  const xp = member?.leveling?.experience ?? 0;
  const level = Math.floor(xp / 100);
  const progressPercent = Math.round(xp % 100);

  return { level, progressPercent, currentXp: xp };
}