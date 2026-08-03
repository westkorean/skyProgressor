export const KNOWLEDGE_CATEGORIES = [
  'combat', 'dungeons', 'foraging', 'mining', 'farming', 'pets',
  'accessories', 'rift', 'garden', 'hotm',
] as const;

export type ManagedKnowledgeCategory = typeof KNOWLEDGE_CATEGORIES[number];

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
  tags: string[];
  source: KnowledgeSource;
  lastVerified: string;
  confidence: number;
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
