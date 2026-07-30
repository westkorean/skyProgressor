import { SKILL_XP_TABLE, SKILL_MAX_LEVELS, CATACOMBS_XP_TABLE, CATACOMBS_MAX_LEVEL, SLAYER_XP_TABLE, TOTAL_FAIRY_SOULS } from './xpTables';
import { COLLECTION_TIERS } from './collectionTiers';
import { BOSS_COLLECTIONS } from './bossCollections';

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

export interface CollectionEntry {
  rawKey: string;
  name: string;
  category: string;
  amount: number;

  tier: number;
  maxTier: number;

  nextTierRequirement: number | null;
  remaining: number | null;

  progressPercent: number;
}

export interface CollectionMilestone {
  key: string; 
  name: string;
  current: number;
  nextTier: number | null;
  remaining: number | null;
  maxed: boolean;
}

export interface BossCollectionProgress {
  boss: string;
  kills: number;
  nextReward: string | null;
  remaining: number | null;
}

export interface SkyblockLevelProgress {
  level: number;
  progressPercent: number;
  currentXp: number;
}

const VARIANT_NAMES: Record<string, string> = {
  'LOG': 'Oak Log',
  'LOG:1': 'Spruce Log',
  'LOG:2': 'Birch Log',
  'LOG:3': 'Jungle Log',
  'LOG_2': 'Acacia Log',
  'LOG_2:1': 'Dark Oak Log',
  'INK_SACK:3': 'Cocoa Beans',
  'INK_SACK:4': 'Lapis Lazuli',
  'SAND:1': 'Red Sand',
};

const COLLECTION_CATEGORIES: Record<string, string> = {
  WHEAT: "Farming",
  CARROT_ITEM: "Farming",
  POTATO_ITEM: "Farming",
  SUGAR_CANE: "Farming",

  COBBLESTONE: "Mining",
  COAL: "Mining",
  IRON_INGOT: "Mining",
  GOLD_INGOT: "Mining",
  DIAMOND: "Mining",

  LOG: "Foraging",
  LOG_2: "Foraging",

  MUTTON: "Combat",
  ROTTEN_FLESH: "Combat"
};


function getCollectionCategory(key:string){

  const base = key.replace(/:.*/, '');

  return COLLECTION_CATEGORIES[base] ?? "Other";

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

export function parseSkyblockLevel(member: any): SkyblockLevelProgress {
  const xp = member?.leveling?.experience ?? 0;
  const level = Math.floor(xp / 100);
  const progressPercent = Math.round(xp % 100);

  return { level, progressPercent, currentXp: xp };
}

export function parseCollections(member:any): CollectionEntry[] {

  const collections = member?.collection ?? {};

  return Object.entries(collections)
    .map(([key,value])=>{

      const amount = value as number;

      const lookupKey = key.replace(/:.*/, '');

      const tiers = COLLECTION_TIERS[lookupKey] ?? [];


      let tier = 0;

      tiers.forEach((requirement,index)=>{

        if(amount >= requirement){
          tier = index + 1;
        }

      });


      const nextTierRequirement =
        tiers.find(t=>t > amount) ?? null;


      const previousRequirement =
        tier > 0
        ? tiers[tier-1]
        : 0;


      const progressPercent =
        nextTierRequirement
        ? Math.min(
            100,
            Math.round(
              ((amount - previousRequirement) /
              (nextTierRequirement - previousRequirement))
              * 100
            )
          )
        : 100;


      return {

        rawKey:key,

        name:formatCollectionName(key),

        amount,

        category:getCollectionCategory(key),


        tier,

        maxTier:tiers.length,


        nextTierRequirement,

        remaining:
          nextTierRequirement
          ? nextTierRequirement - amount
          : null,


        progressPercent

      };

    })
    .sort((a,b)=>b.amount-a.amount);

}

function formatCollectionName(rawKey: string): string {
  if (VARIANT_NAMES[rawKey]) return VARIANT_NAMES[rawKey];

  return rawKey
    .replace(/:.*/, '')
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export function getCollectionMilestones(collections: CollectionEntry[]): CollectionMilestone[] {
  return collections
    .map((c) => {
      const lookupKey = c.rawKey.replace(/:.*/, '');
      const tiers = COLLECTION_TIERS[lookupKey];
      if (!tiers) return null;

      const nextTier = tiers.find((t) => t > c.amount) ?? null;

      return {
        key: c.rawKey,
        name: c.name,
        current: c.amount,
        nextTier,
        remaining: nextTier !== null ? nextTier - c.amount : null,
      };
    })
    .filter((m): m is CollectionMilestone => m != null);
}

export function parseBossCollections(member: any): BossCollectionProgress[] {
  const tierCompletions = member?.dungeons?.dungeon_types?.catacombs?.tier_completions ?? {};

  return BOSS_COLLECTIONS.filter((b) => b.floor != null).map((boss) => {
    const kills = tierCompletions[boss.floor!.toString()] ?? 0;
    const next = boss.rewards.find((r) => r.required > kills) ?? null;

    return {
      boss: boss.name,
      kills,
      nextReward: next?.name ?? null,
      remaining: next ? next.required - kills : null,
    };
  });
}