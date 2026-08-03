import type { ManagedKnowledgeEntry } from '../../knowledge/schema.ts';
import type { RelevantSystem, RetrievedProfileEvidence } from './types.ts';

export function constructRetrievalContext(_question: string, systems: readonly RelevantSystem[], knowledge: readonly ManagedKnowledgeEntry[], evidence: readonly RetrievedProfileEvidence[], recommendations: readonly unknown[], plannerGoals: readonly unknown[] = []): string {
  return JSON.stringify({
    relevantSystems: systems,
    rankedRecommendations: recommendations.slice(0, 5),
    deterministicPlannerGoals: plannerGoals.slice(0, 6),
    profileEvidence: evidence,
    localKnowledge: knowledge.map((entry) => ({
      id: entry.id, category: entry.category, title: entry.title, summary: entry.summary,
      recommendation: entry.recommendation, requirements: entry.requirements, source: entry.source,
      lastVerified: entry.lastVerified, confidence: entry.confidence,
    })),
  });
}
