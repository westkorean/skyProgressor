import type { ManagedKnowledgeEntry, PatchKnowledgeEntry } from '../../knowledge/schema.ts';
import type { RelevantSystem, RetrievedProfileEvidence } from './types.ts';

export function constructRetrievalContext(_question: string, systems: readonly RelevantSystem[], knowledge: readonly ManagedKnowledgeEntry[], patches: readonly PatchKnowledgeEntry[], evidence: readonly RetrievedProfileEvidence[], recommendations: readonly unknown[], plannerGoals: readonly unknown[] = []): string {
  return JSON.stringify({
    relevantSystems: systems,
    rankedRecommendations: recommendations.slice(0, 5),
    deterministicPlannerGoals: plannerGoals.slice(0, 6),
    profileEvidence: evidence,
    localKnowledge: knowledge.map((entry) => ({
      id: entry.id, category: entry.category, title: entry.title, summary: entry.summary,
      recommendation: entry.recommendation, requirements: entry.requirements, relatedSystems: entry.relatedSystems,
      sources: entry.sources, patchVersion: entry.patchVersion, lastVerified: entry.lastVerified,
      confidence: entry.confidence, confidenceScore: entry.confidenceScore, historical: entry.historical,
    })),
    patchHistory: patches.map((patch) => ({
      id: patch.id, date: patch.date, patchVersion: patch.patchVersion, title: patch.title,
      source: patch.source, progressionImpact: patch.progressionImpact, metaImpact: patch.metaImpact,
      balanceChanges: patch.balanceChanges, extractedKnowledge: patch.extractedKnowledge,
      manualReviewRequired: patch.manualReviewRequired,
    })),
  });
}
