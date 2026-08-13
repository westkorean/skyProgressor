import { managedKnowledgeCatalog } from '../../knowledge/catalog.ts';
import type { ManagedKnowledgeEntry } from '../../knowledge/schema.ts';
import type { RelevantSystem } from './types.ts';

const tokens = (value: string) => new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? []);

export function retrieveLocalKnowledge(question: string, systems: readonly RelevantSystem[], limit = 5): ManagedKnowledgeEntry[] {
  const query = tokens(question);
  const allowed = new Set(systems);
  return managedKnowledgeCatalog
    .filter((entry) => allowed.has(entry.category))
    .map((entry) => {
      const searchable = tokens(`${entry.title} ${entry.summary} ${entry.recommendation} ${entry.tags.join(' ')} ${entry.relatedSystems.join(' ')}`);
      const relatedBoost = entry.relatedSystems.some((system) => allowed.has(system)) ? 0.5 : 0;
      const score = [...query].reduce((sum, token) => sum + (searchable.has(token) ? 1 : 0), 0) + (systems.indexOf(entry.category) === 0 ? 1 : 0) + relatedBoost;
      return { entry, score };
    })
    .sort((a, b) => b.score - a.score || b.entry.confidenceScore - a.entry.confidenceScore || a.entry.id.localeCompare(b.entry.id))
    .slice(0, Math.max(1, Math.min(8, limit)))
    .map(({ entry }) => entry);
}
