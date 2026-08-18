import {
  SKILL_XP_TABLE,
  SKILL_MAX_LEVELS,
  SKILL_BASE_LEVEL_CAPS,
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
  maxLevel?: number;
  absoluteMaxLevel?: number;
  overflowXp?: number;
  overflowLevel?: number;
  capUpgradeCount?: number;
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
  const memberRecord = record(member);
  const experience = record(record(memberRecord?.player_data)?.experience) ?? {};
  const farmingUpgrades = Math.min(10, number(record(record(memberRecord?.jacobs_contest)?.perks)?.farming_level_cap));
  const sacrificedPets = record(record(memberRecord?.pets_data)?.pet_care)?.pet_types_sacrificed;
  const tamingUpgrades = Math.min(10, new Set(Array.isArray(sacrificedPets) ? sacrificedPets.filter((pet): pet is string => typeof pet === 'string') : []).size);
  const collections = record(memberRecord?.collection) ?? {};
  const collectionForagingUpgrades = Number(number(collections.FIG_LOG) >= 150_000) + Number(number(collections.MANGROVE_LOG) >= 150_000);
  const foragingCore = record(memberRecord?.foraging_core);
  const rawForagingCap = number(
    foragingCore?.foraging_level_cap
      ?? foragingCore?.level_cap
      ?? experience.SKILL_FORAGING_EXTRA_LEVEL_CAP,
  );
  const foragingUpgrades = rawForagingCap > 0
    ? Math.min(4, rawForagingCap >= 50 ? rawForagingCap - 50 : rawForagingCap)
    : collectionForagingUpgrades;
  const skillKeys = Object.keys(experience).filter((key) => {
    if (!key.startsWith('SKILL_')) return false;
    const skillName = key.slice('SKILL_'.length).toLowerCase();
    return Object.hasOwn(SKILL_MAX_LEVELS, skillName);
  });

  return skillKeys.map((key) => {
    const skillName = key.replace('SKILL_', '').toLowerCase();
    const xp = number(experience[key]);
    const absoluteMaxLevel = SKILL_MAX_LEVELS[skillName] ?? 50;
    const baseLevelCap = SKILL_BASE_LEVEL_CAPS[skillName] ?? absoluteMaxLevel;
    const capUpgradeCount = skillName === 'farming' ? farmingUpgrades : skillName === 'taming' ? tamingUpgrades : skillName === 'foraging' ? foragingUpgrades : 0;
    const maxLevel = Math.min(absoluteMaxLevel, baseLevelCap + capUpgradeCount);
    const { level, xpForNextLevel, progressPercent } = calculateLevel(
      xp,
      SKILL_XP_TABLE,
      maxLevel
    );
    const overflowLevel = calculateLevel(xp, SKILL_XP_TABLE, absoluteMaxLevel).level;
    const overflowXp = Math.max(0, xp - (SKILL_XP_TABLE[maxLevel] ?? 0));

    return {
      skill: skillName,
      level,
      currentXp: xp,
      xpForNextLevel,
      progressPercent,
      maxLevel,
      absoluteMaxLevel,
      overflowXp,
      overflowLevel,
      capUpgradeCount,
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
