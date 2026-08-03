import type { CollectionEntry } from './parseCollections.ts';

export type SkyProgressorAchievementCategory = 'accessories' | 'dungeons' | 'farming' | 'collections' | 'meta';

export interface AchievementCriterion {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  weight: number;
  completionPercent: number;
}

export interface SkyProgressorAchievement {
  id: string;
  title: string;
  category: SkyProgressorAchievementCategory;
  description: string;
  completionPercent: number;
  completed: boolean;
  criteria: AchievementCriterion[];
}

export interface SkyProgressorAchievementSummary {
  achievements: SkyProgressorAchievement[];
  completed: number;
  total: number;
  overallCompletionPercent: number;
  source: 'skyprogressor-custom';
}

export interface SkyProgressorAchievementInput {
  uniqueAccessoryCount: number;
  magicalPower: number;
  catacombsLevel: number;
  farmingLevel: number;
  gardenLevel: number;
  gardenMaxLevel: number;
  collections: readonly CollectionEntry[];
}

const clamp = (value: number) => {
  const normalized = Number.isFinite(value) ? Math.round(value * 1_000_000) / 1_000_000 : 0;
  return Math.max(0, Math.min(100, Math.round(normalized)));
};
const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

function criterion(id: string, label: string, current: number, target: number, unit: string, weight: number): AchievementCriterion {
  const boundedTarget = Math.max(1, safe(target));
  const boundedCurrent = safe(current);
  return { id, label, current: boundedCurrent, target: boundedTarget, unit, weight, completionPercent: clamp(boundedCurrent / boundedTarget * 100) };
}

function achievement(id: string, title: string, category: SkyProgressorAchievementCategory, description: string, criteria: AchievementCriterion[]): SkyProgressorAchievement {
  const totalWeight = criteria.reduce((sum, item) => sum + item.weight, 0) || 1;
  const completionPercent = clamp(criteria.reduce((sum, item) => sum + item.completionPercent * item.weight, 0) / totalWeight);
  return { id, title, category, description, completionPercent, completed: criteria.length > 0 && criteria.every((item) => item.completionPercent >= 100), criteria };
}

export function generateSkyProgressorAchievements(input: SkyProgressorAchievementInput): SkyProgressorAchievementSummary {
  const collectionCurrent = input.collections.reduce((sum, entry) => sum + safe(entry.tier ?? 0), 0);
  const collectionTarget = input.collections.reduce((sum, entry) => sum + safe(entry.maxTier ?? 0), 0);
  const primary = [
    achievement('accessory-collector', 'Accessory Collector', 'accessories', 'Build a broad accessory collection and a strong Magical Power foundation.', [criterion('unique-accessories', 'Unique accessories', input.uniqueAccessoryCount, 75, 'accessories', 60), criterion('magical-power', 'Magical Power', input.magicalPower, 600, 'MP', 40)]),
    achievement('dungeon-expert', 'Dungeon Expert', 'dungeons', 'Reach an advanced Catacombs progression milestone.', [criterion('catacombs-level', 'Catacombs level', input.catacombsLevel, 30, 'levels', 100)]),
    achievement('master-farmer', 'Master Farmer', 'farming', 'Develop both the Farming skill and the Garden progression system.', [criterion('farming-level', 'Farming level', input.farmingLevel, 40, 'levels', 60), criterion('garden-level', 'Garden level', input.gardenLevel, Math.max(1, input.gardenMaxLevel), 'levels', 40)]),
    achievement('collection-completionist', 'Collection Completionist', 'collections', 'Complete every currently represented collection tier.', [criterion('collection-tiers', 'Collection tiers', collectionCurrent, Math.max(1, collectionTarget), 'tiers', 100)]),
  ];
  const primaryAverage = primary.reduce((sum, item) => sum + item.completionPercent, 0) / primary.length;
  const meta = achievement('achievement-hunter', 'Achievement Hunter', 'meta', 'Complete the full set of SkyProgressor profile achievements.', [criterion('custom-achievement-progress', 'Custom achievement progress', primaryAverage, 100, '%', 100)]);
  const achievements = [...primary, meta];
  return { achievements, completed: achievements.filter((item) => item.completed).length, total: achievements.length, overallCompletionPercent: clamp(achievements.reduce((sum, item) => sum + item.completionPercent, 0) / achievements.length), source: 'skyprogressor-custom' };
}
