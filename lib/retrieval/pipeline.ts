import { managedKnowledgeCatalog } from '../../knowledge/catalog.ts';
import { constructRetrievalContext } from './constructContext.ts';
import { determineRelevantSystems } from './determineSystems.ts';
import { retrieveLocalKnowledge } from './retrieveLocalKnowledge.ts';
import { retrieveProfileEvidence } from './retrieveProfileEvidence.ts';
import type { RetrievalPipelineResult } from './types.ts';

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
export const estimateTokenCount = (value: string): number => Math.ceil(value.length / 4);

export function runRetrievalPipeline(question: string, playerData: unknown): RetrievalPipelineResult {
  const systems = determineRelevantSystems(question, playerData);
  const knowledge = retrieveLocalKnowledge(question, systems);
  const profileEvidence = retrieveProfileEvidence(playerData, systems);
  const data = record(playerData);
  const recommendations = Array.isArray(data?.recommendations)
    ? data.recommendations.filter((value) => {
        const category = record(value)?.category;
        return typeof category === 'string' && systems.some((system) => category === system || (category === 'slayers' && system === 'combat') || (category === 'hotf' && system === 'foraging'));
      })
    : [];
  const planner = record(data?.planner);
  const plannerGoals = Array.isArray(planner?.goals) ? planner.goals.filter((value) => {
    const category = record(value)?.category;
    return typeof category === 'string' && systems.some((system) => category === system || (category === 'slayers' && system === 'combat') || (category === 'hotf' && system === 'foraging'));
  }) : [];
  const context = constructRetrievalContext(question, systems, knowledge, profileEvidence, recommendations, plannerGoals);
  const before = estimateTokenCount(JSON.stringify({ knowledge: managedKnowledgeCatalog, profile: playerData }));
  const after = estimateTokenCount(context);
  return { systems, knowledge, profileEvidence, context, tokenMetrics: { before, after, saved: Math.max(0, before - after), reductionPercent: before > 0 ? Math.max(0, Math.round((1 - after / before) * 100)) : 0 } };
}
