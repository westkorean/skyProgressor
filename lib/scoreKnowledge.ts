export interface ScoredKnowledgeChunk {
  id: string;
  category: string;
  topic: string;
  content: string;
  tags: string[];
  score: number;
}

const tokens = (value: string): Set<string> => new Set(
  value.toLowerCase().match(/[a-z0-9_]+/g)?.filter((word) => word.length > 1) ?? []
);

export function rankKnowledge<T extends Omit<ScoredKnowledgeChunk, 'score'>>(
  chunks: readonly T[],
  query: string,
  options: { categories?: readonly string[]; limit?: number } = {}
): Array<T & { score: number }> {
  const queryTokens = tokens(typeof query === 'string' ? query : '');
  if (queryTokens.size === 0) return [];
  const allowed = options.categories ? new Set(options.categories) : null;
  const limit = Math.max(1, Math.min(10, Math.floor(options.limit ?? 5)));

  return chunks
    .filter((chunk) => !allowed || allowed.has(chunk.category))
    .map((chunk) => {
      const tagMatches = chunk.tags.reduce((sum, tag) => sum + (queryTokens.has(tag.toLowerCase()) ? 4 : 0), 0);
      const topicMatches = [...tokens(chunk.topic)].reduce((sum, token) => sum + (queryTokens.has(token) ? 2 : 0), 0);
      const contentMatches = [...tokens(chunk.content)].reduce((sum, token) => sum + (queryTokens.has(token) ? 1 : 0), 0);
      return { ...chunk, score: tagMatches + topicMatches + contentMatches };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function selectKnowledgeByIds<T extends Omit<ScoredKnowledgeChunk, 'score'>>(
  chunks: readonly T[],
  ids: readonly string[],
  limit = 5
): Array<T & { score: number }> {
  const wanted = new Set(ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0));
  const boundedLimit = Math.max(1, Math.min(10, Math.floor(limit)));
  return chunks
    .filter((chunk) => wanted.has(chunk.id))
    .slice(0, boundedLimit)
    .map((chunk) => ({ ...chunk, score: Number.MAX_SAFE_INTEGER }));
}
