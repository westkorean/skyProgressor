export interface GardenCropMilestone {
  crop: string;
  name: string;
  amount: number;
  level: number;
  maxLevel: number;
  amountToNextLevel: number | null;
  progressPercent: number;
}

export interface GardenVisitorProgress {
  completed: number;
  unique: number;
  milestone: number;
  nextMilestone: number | null;
  progressPercent: number;
}

export interface GardenComposter {
  organicMatter: number;
  fuel: number;
  compost: number;
  upgrades: Record<string, number>;
}

export interface GardenProgress {
  available: boolean;
  level: number;
  maxLevel: number;
  currentXp: number;
  xpToNextLevel: number | null;
  progressPercent: number;
  visitors: GardenVisitorProgress;
  cropMilestones: GardenCropMilestone[];
  contestMedals: { bronze: number; silver: number; gold: number };
  composter: GardenComposter;
  plotUnlocks: string[];
  farmingFortune: number | null;
  bonusFortune: number;
}

const rec = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const num = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
const optionalNum = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : null;

// Cumulative XP thresholds. Garden starts at level 1 with zero XP.
const GARDEN_LEVEL_XP = [0, 70, 170, 310, 550, 1_150, 2_650, 4_650, 7_150, 10_150, 14_150, 19_150, 25_150, 32_150, 40_150];

// Per-tier crop requirements from the maintained SkyHanni Garden repository.
// Tiers are cumulative in game, so parseGarden converts these increments first.
const WHEAT_CURVE = [30,50,80,200,350,700,1500,2500,3500,5000,6500,8000,10000,20000,35000,50000,75000,100000,175000,250000,325000,400000,500000,650000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000];
const ROOT_CURVE = [100,150,250,500,1000,2000,4500,9000,12000,15000,20000,25000,35000,70000,120000,180000,250000,350000,600000,850000,1100000,1400000,1800000,2200000,2600000,2600000,2600000,2600000,2600000,2600000,2600000,2600000,2600000,2600000,2600000,2600000,2600000,2600000,2600000,2600000,2600000,2600000,2600000,2600000,2600000,2600000];
const MELON_CURVE = [150,250,400,1000,1800,3500,7500,12500,17500,25000,32500,40000,50000,100000,175000,250000,375000,500000,875000,1200000,1600000,2000000,2500000,3200000,4000000,4000000,4000000,4000000,4000000,4000000,4000000,4000000,4000000,4000000,4000000,4000000,4000000,4000000,4000000,4000000,4000000,4000000,4000000,4000000,4000000,4000000];
const CANE_CURVE = [60,100,160,400,700,1400,3000,5000,7000,10000,13000,16000,20000,40000,70000,100000,150000,200000,350000,500000,650000,800000,1000000,1300000,1600000,1600000,1600000,1600000,1600000,1600000,1600000,1600000,1600000,1600000,1600000,1600000,1600000,1600000,1600000,1600000,1600000,1600000,1600000,1600000,1600000,1600000];
const WART_CURVE = [90,150,250,500,1000,2000,4000,7500,10000,15000,20000,25000,30000,50000,100000,150000,200000,300000,500000,750000,1000000,1300000,1600000,2000000,2400000,2400000,2400000,2400000,2400000,2400000,2400000,2400000,2400000,2400000,2400000,2400000,2400000,2400000,2400000,2400000,2400000,2400000,2400000,2400000,2400000,2400000];
const MOONFLOWER_CURVE = [30,50,80,200,700,700,1500,2500,3500,5000,6500,8000,10000,20000,35000,50000,75000,100000,175000,250000,325000,400000,500000,650000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000,800000];

const CROP_DATA: Record<string, { name: string; curve: number[] }> = {
  WHEAT: { name: 'Wheat', curve: WHEAT_CURVE },
  CARROT_ITEM: { name: 'Carrot', curve: ROOT_CURVE },
  CARROT: { name: 'Carrot', curve: ROOT_CURVE },
  POTATO_ITEM: { name: 'Potato', curve: ROOT_CURVE },
  POTATO: { name: 'Potato', curve: ROOT_CURVE },
  PUMPKIN: { name: 'Pumpkin', curve: WHEAT_CURVE },
  MELON: { name: 'Melon', curve: MELON_CURVE },
  SUGAR_CANE: { name: 'Sugar Cane', curve: CANE_CURVE },
  CACTUS: { name: 'Cactus', curve: CANE_CURVE },
  'INK_SACK:3': { name: 'Cocoa Beans', curve: WART_CURVE },
  COCOA_BEANS: { name: 'Cocoa Beans', curve: WART_CURVE },
  MUSHROOM_COLLECTION: { name: 'Mushroom', curve: WHEAT_CURVE },
  MUSHROOM: { name: 'Mushroom', curve: WHEAT_CURVE },
  NETHER_STALK: { name: 'Nether Wart', curve: WART_CURVE },
  NETHER_WART: { name: 'Nether Wart', curve: WART_CURVE },
  DOUBLE_PLANT: { name: 'Moonflower', curve: MOONFLOWER_CURVE },
  MOONFLOWER: { name: 'Moonflower', curve: MOONFLOWER_CURVE },
  SUNFLOWER: { name: 'Sunflower', curve: WHEAT_CURVE },
  WILD_ROSE: { name: 'Wild Rose', curve: CANE_CURVE },
};

const cumulative = (increments: number[]) => {
  let total = 0;
  return [0, ...increments.map(value => total += value)];
};

const levelFrom = (value: number, thresholds: number[]) => {
  let level = 0;
  for (let index = 1; index < thresholds.length; index += 1) {
    if (value >= thresholds[index]) level = index;
    else break;
  }
  return level;
};

export function parseGarden(payload: unknown, member?: unknown): GardenProgress {
  const root = rec(payload);
  const garden = rec(root?.garden) ?? (root?.uuid ? root : null);
  const resources = rec(garden?.resources_collected) ?? {};
  const xp = num(garden?.garden_experience ?? garden?.experience);
  const levelIndex = levelFrom(xp, GARDEN_LEVEL_XP);
  const level = levelIndex + 1;
  const next = GARDEN_LEVEL_XP[levelIndex + 1] ?? null;
  const prior = GARDEN_LEVEL_XP[levelIndex] ?? 0;

  const cropMilestones = Object.entries(resources)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]))
    .map(([crop, value]): GardenCropMilestone => {
      const amount = num(value);
      const data = CROP_DATA[crop];
      const thresholds = cumulative(data?.curve ?? WHEAT_CURVE);
      const cropLevel = levelFrom(amount, thresholds);
      const cropNext = thresholds[cropLevel + 1] ?? null;
      const cropPrior = thresholds[cropLevel] ?? 0;
      return {
        crop,
        name: data?.name ?? crop.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase()),
        amount,
        level: cropLevel,
        maxLevel: thresholds.length - 1,
        amountToNextLevel: cropNext === null ? null : Math.max(0, cropNext - amount),
        progressPercent: cropNext === null ? 100 : Math.min(100, Math.round((amount - cropPrior) / Math.max(1, cropNext - cropPrior) * 100)),
      };
    })
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));

  const commissionData = rec(garden?.commission_data);
  const unique = num(commissionData?.unique_npcs_served);
  const completed = num(commissionData?.total_completed);
  const visitorTargets = [0,1,5,10,20,30,50,75,150,250,400,650,1_000,1_500,2_000,2_500,3_000,3_500,4_000,4_500,5_000];
  const milestone = levelFrom(completed, visitorTargets);
  const visitorNext = visitorTargets[milestone + 1] ?? null;
  const visitorPrior = visitorTargets[milestone] ?? 0;

  const composter = rec(garden?.composter_data ?? garden?.composter) ?? {};
  const upgrades = rec(composter.upgrades) ?? {};
  const player = rec(member);
  const jacob = rec(rec(player?.jacobs_contest)?.medals_inv) ?? rec(garden?.contest_medals) ?? {};
  const perks = rec(rec(player?.perks)?.farming) ?? rec(garden?.farming_stats) ?? {};
  const plotRecord = rec(garden?.unlocked_plots_ids ?? garden?.plot_unlocks);
  const plotUnlocks = Array.isArray(garden?.unlocked_plots_ids)
    ? garden.unlocked_plots_ids.map(String)
    : Object.entries(plotRecord ?? {}).filter(([, value]) => Boolean(value)).map(([id]) => id);
  const explicitFortune = perks.farming_fortune ?? garden?.farming_fortune;

  return {
    available: garden !== null,
    level,
    maxLevel: GARDEN_LEVEL_XP.length,
    currentXp: xp,
    xpToNextLevel: next === null ? null : Math.max(0, next - xp),
    progressPercent: next === null ? 100 : Math.min(100, Math.round((xp - prior) / Math.max(1, next - prior) * 100)),
    cropMilestones,
    visitors: {
      completed,
      unique,
      milestone,
      nextMilestone: visitorNext,
      progressPercent: visitorNext === null ? 100 : Math.min(100, Math.round((completed - visitorPrior) / Math.max(1, visitorNext - visitorPrior) * 100)),
    },
    contestMedals: { bronze: num(jacob.bronze), silver: num(jacob.silver), gold: num(jacob.gold) },
    composter: {
      organicMatter: num(composter.organic_matter),
      fuel: num(composter.fuel_units ?? composter.fuel),
      compost: num(composter.compost_items ?? composter.compost_units),
      upgrades: Object.fromEntries(Object.entries(upgrades).map(([key, value]) => [key, num(value)])),
    },
    plotUnlocks,
    // Total Farming Fortune is not currently exposed by Hypixel. Preserve null instead of inventing zero.
    farmingFortune: optionalNum(explicitFortune),
    bonusFortune: Object.values(rec(garden?.crop_upgrade_levels) ?? {}).reduce<number>((sum, value) => sum + num(value) * 5, 0),
  };
}
