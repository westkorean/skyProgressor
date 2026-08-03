import type { EvaluationRepository, RecommendationEvaluation } from './types.ts';

const STORAGE_KEY = 'skyprogressor:recommendation-evaluations:v1';
const MAX_RECORDS = 500;

function isEvaluation(value: unknown): value is RecommendationEvaluation {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<RecommendationEvaluation>;
  return entry.schemaVersion === 1 && typeof entry.id === 'string' &&
    typeof entry.playerProfileHash === 'string' && typeof entry.finalRecommendation?.id === 'string' &&
    typeof entry.confidence === 'number' && typeof entry.userFeedback === 'string';
}

export class LocalStorageEvaluationRepository implements EvaluationRepository {
  list(): RecommendationEvaluation[] {
    if (typeof window === 'undefined') return [];
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(isEvaluation).slice(0, MAX_RECORDS) : [];
    } catch { return []; }
  }

  find(profileHash: string, recommendationId: string): RecommendationEvaluation | null {
    return this.list().find((entry) => entry.playerProfileHash === profileHash && entry.finalRecommendation.id === recommendationId) ?? null;
  }

  save(evaluation: RecommendationEvaluation): void {
    if (typeof window === 'undefined') return;
    const records = this.list();
    const next = [evaluation, ...records.filter((entry) => entry.id !== evaluation.id)].slice(0, MAX_RECORDS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  remove(id: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.list().filter((entry) => entry.id !== id)));
  }
}
