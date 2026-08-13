export const KNOWLEDGE_CATEGORIES = [
  'combat', 'farming', 'foraging', 'mining', 'fishing', 'dungeons',
  'slayers', 'pets', 'accessories', 'collections', 'hotm', 'hotf',
  'garden', 'rift', 'crimson', 'museum', 'economy',
] as const;

export type ManagedKnowledgeCategory = typeof KNOWLEDGE_CATEGORIES[number];
export type KnowledgeConfidence = 'High' | 'Medium' | 'Low';

export interface KnowledgeSource {
  title: string;
  url: string;
}

export interface ManagedKnowledgeEntry {
  id: string;
  category: ManagedKnowledgeCategory;
  title: string;
  summary: string;
  recommendation: string;
  requirements: string[];
  relatedSystems: ManagedKnowledgeCategory[];
  tags: string[];
  sources: KnowledgeSource[];
  /** @deprecated Use sources. Preserved for older deterministic references. */
  source: KnowledgeSource;
  patchVersion: string;
  lastVerified: string;
  confidence: KnowledgeConfidence;
  confidenceScore: number;
  historical?: {
    previousMeta?: string;
    currentMeta?: string;
    changedInPatch?: string;
    deprecated?: boolean;
  };
}

export interface PatchKnowledgeChange {
  topic: ManagedKnowledgeCategory | 'general';
  change: string;
  previousMeta?: string;
  currentMeta?: string;
  reason?: string;
  confidence: KnowledgeConfidence;
}

export interface PatchKnowledgeEntry {
  id: string;
  date: string;
  patchVersion: string;
  title: string;
  source: KnowledgeSource;
  majorAdditions: string[];
  majorRemovals: string[];
  balanceChanges: string[];
  progressionImpact: string[];
  metaImpact: string[];
  itemChanges: string[];
  newSystems: string[];
  removedMechanics: string[];
  extractedKnowledge: PatchKnowledgeChange[];
  manualReviewRequired: boolean;
}

export interface KnowledgeValidationIssue {
  path: string;
  message: string;
}

export interface KnowledgeValidationResult {
  valid: boolean;
  entries: ManagedKnowledgeEntry[];
  issues: KnowledgeValidationIssue[];
}
