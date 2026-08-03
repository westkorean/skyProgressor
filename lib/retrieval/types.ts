import type { ManagedKnowledgeCategory, ManagedKnowledgeEntry } from '../../knowledge/schema.ts';

export type RelevantSystem = ManagedKnowledgeCategory;

export interface RetrievedProfileEvidence {
  system: RelevantSystem;
  label: string;
  value: string | number | boolean;
}

export interface RetrievalTokenMetrics {
  before: number;
  after: number;
  saved: number;
  reductionPercent: number;
}

export interface RetrievalPipelineResult {
  systems: RelevantSystem[];
  knowledge: ManagedKnowledgeEntry[];
  profileEvidence: RetrievedProfileEvidence[];
  context: string;
  tokenMetrics: RetrievalTokenMetrics;
}
