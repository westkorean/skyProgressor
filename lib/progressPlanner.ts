import type { MarketPrices } from './marketPrices.ts';
import type { BazaarPrices } from './itemPricing.ts';
import { bestAcquisitionPrice } from './pricing/opportunities.ts';
import type { HOTMProgress } from './parseHOTM.ts';
import type { DeterministicRecommendation, DeterministicRecommendationCategory } from './recommendations/index.ts';

export type PlannerGoalStatus = 'completed' | 'current' | 'locked' | 'upcoming';

export interface ProgressPlannerGoal {
  id: string;
  category: DeterministicRecommendationCategory;
  title: string;
  reason: string;
  estimatedTime: string;
  estimatedCost: string;
  estimatedCostCoins: number | null;
  prerequisiteIds: string[];
  prerequisites: string[];
  expectedReward: string;
  progressPercent: number;
  status: PlannerGoalStatus;
}

export interface ProgressPlanner {
  goals: ProgressPlannerGoal[];
  currentGoalId: string | null;
  completedGoals: number;
  overallProgressPercent: number;
  cheapestProgressionGoal: { id: string; title: string; estimatedCostCoins: number } | null;
  generatedBy: 'deterministic-progress-planner' | 'ai-progress-planner';
}

export interface ProgressPlannerInput {
  hotm: HOTMProgress;
  magicalPower: number;
  ownedItemIds: readonly string[];
  marketPrices: MarketPrices;
  bazaarPrices: BazaarPrices;
  recommendations: readonly DeterministicRecommendation[];
}

type GoalSeed = Omit<ProgressPlannerGoal, 'status' | 'prerequisites'>;

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
const DIVAN_ARMOR = ['DIVAN_HELMET', 'DIVAN_CHESTPLATE', 'DIVAN_LEGGINGS', 'DIVAN_BOOTS'] as const;
const PLANNER_CATEGORIES: readonly DeterministicRecommendationCategory[] = ['accessories', 'pets', 'hotm', 'hotf', 'collections', 'dungeons', 'garden', 'fishing', 'crimson', 'rift', 'skills', 'slayers'];

function coinEstimate(ids: readonly string[], marketPrices: MarketPrices, bazaarPrices: BazaarPrices): { label: string; coins: number | null } {
  if (ids.length === 0) return { label: 'Complete', coins: 0 };
  const values = ids.map((id) => bestAcquisitionPrice(id, marketPrices, bazaarPrices)?.price ?? null);
  if (values.some((value) => value === null)) return { label: 'Market estimate unavailable', coins: null };
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return { label: `${Math.round(total).toLocaleString()} coins estimated acquisition cost`, coins: total };
}

function recommendationProgress(recommendation: DeterministicRecommendation, magicalPower: number): number {
  if (recommendation.id === 'low-magical-power') return clamp(magicalPower / 400 * 100);
  const progress = recommendation.evidence.find((entry) => entry.label.toLowerCase() === 'progress')?.value;
  if (typeof progress === 'string') return clamp(Number.parseFloat(progress));
  const level = recommendation.evidence.find((entry) => entry.label.toLowerCase().includes('level'))?.value;
  if (typeof level === 'number') return clamp(level / 50 * 100);
  return clamp(100 - recommendation.priority);
}

function topologicalOrder(seeds: readonly GoalSeed[]): GoalSeed[] {
  const byId = new Map(seeds.map((goal) => [goal.id, goal]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: GoalSeed[] = [];
  const visit = (goal: GoalSeed) => {
    if (visited.has(goal.id)) return;
    if (visiting.has(goal.id)) throw new Error(`Progress planner dependency cycle at ${goal.id}`);
    visiting.add(goal.id);
    for (const prerequisite of goal.prerequisiteIds) { const dependency = byId.get(prerequisite); if (dependency) visit(dependency); }
    visiting.delete(goal.id); visited.add(goal.id); result.push(goal);
  };
  seeds.forEach(visit);
  return result;
}

export function createProgressPlanner(input: ProgressPlannerInput): ProgressPlanner {
  const owned = new Set(input.ownedItemIds.map((id) => id.toUpperCase()));
  const divanPieces = DIVAN_ARMOR.filter((id) => owned.has(id)).length;
  const hotmProgress = input.hotm.available ? clamp(input.hotm.level / 7 * 100) : 0;
  const powderTarget = 2_000_000;
  const powderProgress = input.hotm.available ? clamp(input.hotm.totalPowderSpent / powderTarget * 100) : 0;
  const divanCost = coinEstimate(DIVAN_ARMOR.filter((id) => !owned.has(id)), input.marketPrices, input.bazaarPrices);
  const seeds: GoalSeed[] = input.hotm.available ? [
    { id: 'planner-hotm-7', category: 'hotm', title: 'Reach HOTM 7', reason: 'HOTM 7 is the prerequisite for the core gemstone-mining progression sequence.', estimatedTime: input.hotm.level >= 7 ? 'Complete' : `${7 - input.hotm.level} HOTM tier${7 - input.hotm.level === 1 ? '' : 's'} remaining`, estimatedCost: 'No fixed coin cost', estimatedCostCoins: 0, prerequisiteIds: [], expectedReward: 'Core mining tree access and progression toward stronger mining perks.', progressPercent: hotmProgress },
    { id: 'planner-mining-fortune', category: 'hotm', title: 'Upgrade Mining Fortune', reason: 'Powder investment improves mining output before committing to expensive armor.', estimatedTime: powderProgress >= 100 ? 'Complete' : 'Several powder-mining sessions', estimatedCost: 'Uses earned powder', estimatedCostCoins: 0, prerequisiteIds: ['planner-hotm-7'], expectedReward: 'Higher ore and gemstone yield from Mining Fortune perks.', progressPercent: powderProgress },
    { id: 'planner-divan-armor', category: 'hotm', title: 'Unlock Divan Armor', reason: 'A complete Divan set is a major equipment step for dedicated gemstone mining.', estimatedTime: divanPieces === 4 ? 'Complete' : 'Depends on Forge slots and acquisition method', estimatedCost: divanCost.label, estimatedCostCoins: divanCost.coins, prerequisiteIds: ['planner-hotm-7', 'planner-mining-fortune'], expectedReward: 'A dedicated mining armor set with gemstone and mining-stat progression.', progressPercent: clamp(divanPieces / DIVAN_ARMOR.length * 100) },
    { id: 'planner-mine-gemstones', category: 'hotm', title: 'Establish Gemstone Mining', reason: 'After the prerequisite tree, powder, and armor steps, gemstone mining becomes the repeatable activity.', estimatedTime: 'Ongoing activity', estimatedCost: 'Uses the preceding mining setup', estimatedCostCoins: 0, prerequisiteIds: ['planner-divan-armor'], expectedReward: 'Repeatable gemstone collection and mining progression.', progressPercent: clamp((hotmProgress + powderProgress + divanPieces / 4 * 100) / 3) },
  ] : [];

  const existingIds = new Set(seeds.map((goal) => goal.id));
  for (const recommendation of input.recommendations) {
    if (recommendation.category === 'hotm' || existingIds.has(`planner-${recommendation.id}`)) continue;
    const effortTime = recommendation.estimatedEffort === 'Low' ? 'One short session' : recommendation.estimatedEffort === 'Medium' ? 'Several sessions' : 'Long-term goal';
    seeds.push({ id: `planner-${recommendation.id}`, category: recommendation.category, title: recommendation.title, reason: recommendation.explanation, estimatedTime: effortTime, estimatedCost: recommendation.category === 'accessories' ? 'Varies by selected accessory upgrade' : 'No fixed coin cost', estimatedCostCoins: recommendation.category === 'accessories' ? null : 0, prerequisiteIds: [], expectedReward: recommendation.expectedBenefit, progressPercent: recommendationProgress(recommendation, input.magicalPower) });
  }

  const ordered = topologicalOrder(seeds);
  const completed = new Set(ordered.filter((goal) => goal.progressPercent >= 100).map((goal) => goal.id));
  const current = ordered.find((goal) => goal.progressPercent < 100 && goal.prerequisiteIds.every((id) => completed.has(id))) ?? null;
  const titleById = new Map(ordered.map((goal) => [goal.id, goal.title]));
  const goals: ProgressPlannerGoal[] = ordered.map((goal) => ({
    ...goal,
    prerequisites: goal.prerequisiteIds.map((id) => titleById.get(id) ?? id),
    status: goal.progressPercent >= 100 ? 'completed' : goal.id === current?.id ? 'current' : goal.prerequisiteIds.some((id) => !completed.has(id)) ? 'locked' : 'upcoming',
  }));
  const cheapest = goals.filter((goal) => goal.status !== 'completed' && goal.status !== 'locked' && goal.estimatedCostCoins !== null).sort((a, b) => (a.estimatedCostCoins ?? 0) - (b.estimatedCostCoins ?? 0))[0];
  return { goals, currentGoalId: current?.id ?? null, completedGoals: completed.size, overallProgressPercent: goals.length ? clamp(goals.reduce((sum, goal) => sum + goal.progressPercent, 0) / goals.length) : 100, cheapestProgressionGoal: cheapest ? { id: cheapest.id, title: cheapest.title, estimatedCostCoins: cheapest.estimatedCostCoins ?? 0 } : null, generatedBy: 'deterministic-progress-planner' };
}

export interface CuratedGoalInput {
  category: DeterministicRecommendationCategory;
  title: string;
  reason: string;
  estimatedTime: string;
  estimatedCost: string;
  expectedReward: string;
  progressPercent: number;
  prerequisiteGoalNumbers: number[];
}

/** Converts untrusted model output into a safe, dependency-ordered planner. */
export function createCuratedProgressPlanner(value: unknown): ProgressPlanner {
  if (!Array.isArray(value)) throw new Error('The advisor did not return a goal list.');
  const rawGoals = value.slice(0, 8);
  if (rawGoals.length < 3) throw new Error('The advisor returned too few usable goals.');
  const clean = (text: unknown, fallback: string) => typeof text === 'string' && text.trim() ? text.trim().slice(0, 240) : fallback;
  const goals: ProgressPlannerGoal[] = rawGoals.map((raw, index) => {
    const goal = raw !== null && typeof raw === 'object' ? raw as Partial<CuratedGoalInput> : {};
    const category = typeof goal.category === 'string' && PLANNER_CATEGORIES.includes(goal.category as DeterministicRecommendationCategory) ? goal.category as DeterministicRecommendationCategory : 'skills';
    const prerequisiteIndexes = Array.isArray(goal.prerequisiteGoalNumbers)
      ? [...new Set(goal.prerequisiteGoalNumbers.filter((number): number is number => Number.isInteger(number) && number >= 1 && number <= index))]
      : [];
    const progressPercent = clamp(Number(goal.progressPercent));
    return {
      id: `ai-planner-goal-${index + 1}`,
      category,
      title: clean(goal.title, `Progress goal ${index + 1}`),
      reason: clean(goal.reason, 'Recommended from the loaded profile and stated priorities.'),
      estimatedTime: clean(goal.estimatedTime, 'Time varies'),
      estimatedCost: clean(goal.estimatedCost, 'Cost varies'),
      estimatedCostCoins: null,
      prerequisiteIds: prerequisiteIndexes.map((number) => `ai-planner-goal-${number}`),
      prerequisites: prerequisiteIndexes.map((number) => clean((rawGoals[number - 1] as Partial<CuratedGoalInput> | undefined)?.title, `Goal ${number}`)),
      expectedReward: clean(goal.expectedReward, 'Improved profile progression.'),
      progressPercent,
      status: 'upcoming',
    };
  });
  const completed = new Set(goals.filter((goal) => goal.progressPercent >= 100).map((goal) => goal.id));
  const current = goals.find((goal) => goal.progressPercent < 100 && goal.prerequisiteIds.every((id) => completed.has(id))) ?? null;
  for (const goal of goals) goal.status = goal.progressPercent >= 100 ? 'completed' : goal.id === current?.id ? 'current' : goal.prerequisiteIds.some((id) => !completed.has(id)) ? 'locked' : 'upcoming';
  return {
    goals,
    currentGoalId: current?.id ?? null,
    completedGoals: completed.size,
    overallProgressPercent: clamp(goals.reduce((sum, goal) => sum + goal.progressPercent, 0) / goals.length),
    cheapestProgressionGoal: null,
    generatedBy: 'ai-progress-planner',
  };
}
