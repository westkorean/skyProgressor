import type { DeterministicRecommendationCategory, EstimatedEffort } from '../recommendations/index.ts';

export const EVALUATION_FEEDBACK = ['helpful', 'incorrect', 'outdated', 'too-generic'] as const;
export type EvaluationFeedback = typeof EVALUATION_FEEDBACK[number];

export interface EvaluatedRecommendation {
  id: string;
  title: string;
  category: DeterministicRecommendationCategory;
  priority: number;
  explanation: string;
  evidence: Array<{ label: string; value: string | number }>;
  expectedBenefit: string;
  estimatedEffort: EstimatedEffort;
  suggestedAction: string;
}

export interface RecommendationEvaluation {
  id: string;
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
  question: string;
  playerProfileHash: string;
  retrievedKnowledgeIds: string[];
  finalRecommendation: EvaluatedRecommendation;
  confidence: number;
  userFeedback: EvaluationFeedback;
}

export interface EvaluationRepository {
  list(): RecommendationEvaluation[];
  find(profileHash: string, recommendationId: string): RecommendationEvaluation | null;
  save(evaluation: RecommendationEvaluation): void;
  remove(id: string): void;
}
