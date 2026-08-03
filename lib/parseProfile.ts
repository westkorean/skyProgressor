import {
  SKILL_XP_TABLE,
  SKILL_MAX_LEVELS,
  CATACOMBS_XP_TABLE,
  CATACOMBS_MAX_LEVEL,
  SLAYER_XP_TABLE,
  TOTAL_FAIRY_SOULS,
} from './xpTables.ts';
export { parseCollections } from './parseCollections.ts';

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

export interface SkyblockLevelProgress {
  level: number;
  progressPercent: number;
  currentXp: number;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
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
    nextThreshold != null
      ? Math.min(
          100,
          Math.round(
            ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100
          )
        )
      : 100;

  return { level, xpForNextLevel: nextThreshold, progressPercent };
}

export function parseSkills(member: unknown): SkillProgress[] {
  const experience = record(record(record(member)?.player_data)?.experience) ?? {};
  const skillKeys = Object.keys(experience).filter((key) =>
    key.startsWith('SKILL_')
  );

  return skillKeys.map((key) => {
    const skillName = key.replace('SKILL_', '').toLowerCase();
    const xp = number(experience[key]);
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

export function parseSlayers(member: unknown): SlayerProgress[] {
  const bosses = record(record(record(member)?.slayer)?.slayer_bosses) ?? {};

  return Object.keys(bosses).map((slayerName) => {
    const xp = number(record(bosses[slayerName])?.xp);
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

export function parseCatacombs(member: unknown): CatacombsProgress {
  const dungeonTypes = record(record(record(member)?.dungeons)?.dungeon_types);
  const xp = number(record(dungeonTypes?.catacombs)?.experience);
  const { level, xpForNextLevel, progressPercent } = calculateLevel(
    xp,
    CATACOMBS_XP_TABLE,
    CATACOMBS_MAX_LEVEL
  );

  return { level, currentXp: xp, xpForNextLevel, progressPercent };
}

export function parseFairySouls(member: unknown): FairySoulProgress {
  const collected = number(record(record(member)?.fairy_soul)?.total_collected);
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

export function parseSkyblockLevel(member: unknown): SkyblockLevelProgress {
  const xp = number(record(record(member)?.leveling)?.experience);
  const level = Math.floor(xp / 100);
  const progressPercent = Math.round(xp % 100);

  return { level, progressPercent, currentXp: xp };
}
