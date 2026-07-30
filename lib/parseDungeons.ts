import { CATACOMBS_XP_TABLE, CATACOMBS_MAX_LEVEL } from './xpTables';

export interface DungeonClassProgress {
  name: string;
  xp: number;
  level: number;
  progressPercent: number;
}

export interface DungeonProgress {
  classes: DungeonClassProgress[];
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

export function parseDungeons(member: any): DungeonProgress {
  const classes = member?.dungeons?.player_classes ?? {};

  return {
    classes: Object.entries(classes).map(([name, data]: any) => {
      const xp = data?.experience ?? 0;
      const { level, progressPercent } = calculateLevel(
        xp,
        CATACOMBS_XP_TABLE,
        CATACOMBS_MAX_LEVEL
      );

      return { name, xp, level, progressPercent };
    }),
  };
}