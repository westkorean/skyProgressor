import type { DeterministicRecommendation, DeterministicRecommendationCategory } from './recommendations';

export type RoadmapTrackId = 'overall' | 'combat' | 'mining' | 'foraging' | 'farming' | 'fishing' | 'islands' | 'completion';
export interface RoadmapGoal {
  id: string;
  category: DeterministicRecommendationCategory;
  goal: string;
  reason: string;
  estimatedTime: string;
  estimatedCost: string;
  expectedBenefit: string;
  recommendedActivity: string;
  progressPercent: number;
}
export interface RoadmapTrack {
  id: RoadmapTrackId;
  name: string;
  description: string;
  current: RoadmapGoal | null;
  next: RoadmapGoal | null;
  future: RoadmapGoal[];
}
export interface ProgressionRoadmap {
  current: RoadmapGoal | null;
  next: RoadmapGoal | null;
  future: RoadmapGoal[];
  tracks: RoadmapTrack[];
}

const TRACKS: ReadonlyArray<{ id: RoadmapTrackId; name: string; description: string; categories: DeterministicRecommendationCategory[] }> = [
  { id: 'overall', name: 'Main', description: 'Highest-impact goals across the entire profile.', categories: [] },
  { id: 'combat', name: 'Combat', description: 'Combat power, pets, Slayers, accessories, and Dungeons.', categories: ['skills', 'slayers', 'pets', 'accessories', 'dungeons'] },
  { id: 'mining', name: 'Mining', description: 'Heart of the Mountain, powder, and mining progression.', categories: ['hotm'] },
  { id: 'foraging', name: 'Foraging', description: 'Heart of the Forest and foraging progression.', categories: ['hotf'] },
  { id: 'farming', name: 'Farming', description: 'Garden levels, visitors, and crop progression.', categories: ['garden'] },
  { id: 'fishing', name: 'Fishing', description: 'Fishing levels, trophy fish, and sea creatures.', categories: ['fishing'] },
  { id: 'islands', name: 'Islands', description: 'Crimson Isle and Rift progression.', categories: ['crimson', 'rift'] },
  { id: 'completion', name: 'Completion', description: 'Collections and broad completion goals.', categories: ['collections'] },
];

function recommendationProgress(recommendation: DeterministicRecommendation, index: number): number {
  const explicit = recommendation.evidence.find(entry => entry.label.toLowerCase() === 'progress')?.value;
  if (typeof explicit === 'string') {
    const parsed = Number.parseFloat(explicit);
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, parsed));
  }
  const baseline = recommendation.evidence.find(entry => entry.label.toLowerCase() === 'baseline')?.value;
  const current = recommendation.evidence.find(entry => entry.label.toLowerCase() !== 'baseline' && typeof entry.value === 'number')?.value;
  if (typeof baseline === 'number' && typeof current === 'number' && baseline > 0) return Math.max(0, Math.min(100, Math.round(current / baseline * 100)));
  const level = recommendation.evidence.find(entry => entry.label.toLowerCase().includes('level') || ['hotm', 'hotf', 'catacombs'].includes(entry.label.toLowerCase()))?.value;
  if (typeof level === 'number') {
    const target = recommendation.category === 'hotm' ? 7 : recommendation.category === 'hotf' ? 7 : recommendation.category === 'dungeons' ? 50 : 60;
    return Math.max(0, Math.min(100, Math.round(level / target * 100)));
  }
  return Math.max(5, Math.min(90, 100 - recommendation.priority + index * 3));
}

const goalFromRecommendation = (recommendation: DeterministicRecommendation, index: number): RoadmapGoal => ({
  id: recommendation.id,
  category: recommendation.category,
  goal: recommendation.title,
  reason: recommendation.explanation,
  estimatedTime: recommendation.category === 'collections' ? 'Short session' : recommendation.priority >= 85 ? '1–3 sessions' : 'Several sessions',
  estimatedCost: recommendation.category === 'accessories' ? 'Unknown — pricing not enabled' : 'No fixed coin cost',
  expectedBenefit: recommendation.suggestedAction,
  recommendedActivity: recommendation.suggestedAction,
  progressPercent: recommendationProgress(recommendation, index),
});

const sequence = (goals: RoadmapGoal[]) => ({ current: goals[0] ?? null, next: goals[1] ?? null, future: goals.slice(2) });

export function createProgressionRoadmap(recommendations: readonly DeterministicRecommendation[]): ProgressionRoadmap {
  const goals = recommendations.map(goalFromRecommendation);
  const tracks = TRACKS.map(({ id, name, description, categories }): RoadmapTrack => {
    const trackGoals = id === 'overall' ? goals : goals.filter(goal => categories.includes(goal.category));
    return { id, name, description, ...sequence(trackGoals) };
  });
  return { ...sequence(goals), tracks };
}
