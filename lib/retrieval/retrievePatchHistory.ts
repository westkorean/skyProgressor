import { patchKnowledgeCatalog } from '../../knowledge/patches/catalog.ts';
import type { PatchKnowledgeEntry } from '../../knowledge/schema.ts';
import type { RelevantSystem } from './types.ts';

const tokens = (value: string) => new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? []);

export function retrievePatchHistory(question: string, systems: readonly RelevantSystem[], limit = 4): PatchKnowledgeEntry[] {
  const query = tokens(question);
  const allowed = new Set<string>(systems);
  return patchKnowledgeCatalog
    .map((patch) => {
      const relevantChange = patch.extractedKnowledge.some((change) => allowed.has(change.topic));
      const searchable = tokens(`${patch.title} ${patch.patchVersion} ${patch.majorAdditions.join(' ')} ${patch.balanceChanges.join(' ')} ${patch.progressionImpact.join(' ')} ${patch.metaImpact.join(' ')} ${patch.extractedKnowledge.map((change) => `${change.topic} ${change.change} ${change.currentMeta ?? ''}`).join(' ')}`);
      const score = [...query].reduce((sum, token) => sum + (searchable.has(token) ? 1 : 0), 0) + (relevantChange ? 2 : 0);
      return { patch, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.patch.date.localeCompare(a.patch.date))
    .slice(0, Math.max(1, Math.min(6, limit)))
    .map(({ patch }) => patch);
}
