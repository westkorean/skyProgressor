import fs from 'fs';
import path from 'path';
import type { PatchKnowledgeEntry } from '../schema.ts';

function loadPatchCatalog(): PatchKnowledgeEntry[] {
  const directory = path.join(process.cwd(), 'knowledge', 'patches');
  try {
    return fs.readdirSync(directory)
      .filter((fileName) => /^\d{4}-\d{2}\.json$/.test(fileName))
      .flatMap((fileName) => {
        try {
          const raw = fs.readFileSync(path.join(directory, fileName), 'utf8');
          const parsed = JSON.parse(raw) as unknown;
          return Array.isArray(parsed) ? parsed as PatchKnowledgeEntry[] : [];
        } catch {
          return [];
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

export const patchKnowledgeCatalog = loadPatchCatalog();
