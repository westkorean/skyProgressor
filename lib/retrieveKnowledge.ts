import { knowledgeBase, type KnowledgeCategory, type KnowledgeChunk } from './knowledge';
import { rankKnowledge, selectKnowledgeByIds } from './scoreKnowledge';

export interface KnowledgeRetrievalOptions {
  categories?: readonly KnowledgeCategory[];
  limit?: number;
}

export interface RetrievedKnowledge extends KnowledgeChunk { score: number }

export function retrieveKnowledge(query: string, options: KnowledgeRetrievalOptions = {}): RetrievedKnowledge[] {
  return rankKnowledge(knowledgeBase, query, options);
}

export function retrieveKnowledgeByIds(ids: readonly string[], limit = 5): RetrievedKnowledge[] {
  return selectKnowledgeByIds(knowledgeBase, ids, limit);
}
