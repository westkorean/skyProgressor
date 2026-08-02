import { CATACOMBS_XP_TABLE, CATACOMBS_MAX_LEVEL } from './xpTables';

export interface DungeonClassProgress {
  name: string;
  xp: number;
  level: number;
  progressPercent: number;
}

export interface DungeonProgress {
  classes: DungeonClassProgress[];
  catacombs: { xp: number; level: number; progressPercent: number };
  floors: DungeonFloorProgress[];
  masterMode: DungeonFloorProgress[];
  secrets: number | null;
  bossCollections: DungeonBossCollection[];
}

export interface DungeonFloorProgress {
  floor: number;
  name: string;
  completions: number;
  fastestTimeMs: number | null;
  fastestSPlusTimeMs: number | null;
}

export interface DungeonBossCollection {
  name: string;
  completions: number;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

const numberAt = (source: Record<string, unknown> | null, key: string): number =>
  typeof source?.[key] === 'number' && Number.isFinite(source[key]) ? Math.max(0, source[key] as number) : 0;

function floors(data: unknown, master = false): DungeonFloorProgress[] {
  const type = record(data);
  const completions = record(type?.tier_completions);
  const fastest = record(type?.fastest_time);
  const fastestSPlus = record(type?.fastest_time_s_plus);
  const maxFloor = master ? 7 : 7;
  return Array.from({ length: maxFloor + (master ? 0 : 1) }, (_, index) => {
    const floor = master ? index + 1 : index;
    const key = String(floor);
    return {
      floor,
      name: master ? `Master Mode ${floor}` : floor === 0 ? 'Entrance' : `Floor ${floor}`,
      completions: numberAt(completions, key),
      fastestTimeMs: fastest && typeof fastest[key] === 'number' ? fastest[key] as number : null,
      fastestSPlusTimeMs: fastestSPlus && typeof fastestSPlus[key] === 'number' ? fastestSPlus[key] as number : null,
    };
  });
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

  return { level, progressPercent };
}

export function parseDungeons(member: unknown): DungeonProgress {
  const dungeons = record(record(member)?.dungeons);
  const classes = record(dungeons?.player_classes) ?? {};
  const dungeonTypes = record(dungeons?.dungeon_types);
  const catacombsData = record(dungeonTypes?.catacombs);
  const masterData = record(dungeonTypes?.master_catacombs);
  const catacombsXp = typeof catacombsData?.experience === 'number' ? catacombsData.experience : 0;
  const catacombsLevel = calculateLevel(catacombsXp, CATACOMBS_XP_TABLE, CATACOMBS_MAX_LEVEL);
  const normalFloors = floors(catacombsData);

  return {
    classes: Object.entries(classes).map(([name, value]) => {
      const data = record(value);
      const xp = typeof data?.experience === 'number' ? data.experience : 0;
      const { level, progressPercent } = calculateLevel(
        xp,
        CATACOMBS_XP_TABLE,
        CATACOMBS_MAX_LEVEL
      );

      return { name, xp, level, progressPercent };
    }),
    catacombs: { xp: catacombsXp, level: catacombsLevel.level, progressPercent: catacombsLevel.progressPercent },
    floors: normalFloors,
    masterMode: floors(masterData, true),
    secrets: typeof dungeons?.secrets === 'number' ? dungeons.secrets : null,
    bossCollections: normalFloors.filter((floor) => floor.floor > 0).map((floor) => ({ name: `${floor.name} Boss`, completions: floor.completions })),
  };
}
