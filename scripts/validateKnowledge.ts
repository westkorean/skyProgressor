import { managedKnowledgeCatalog } from '../knowledge/catalog.ts';
import { patchKnowledgeCatalog } from '../knowledge/patches/catalog.ts';
import { KNOWLEDGE_CATEGORIES } from '../knowledge/schema.ts';
import { validatePatchKnowledgeCatalog } from '../knowledge/validation.ts';

const counts = Object.fromEntries(KNOWLEDGE_CATEGORIES.map((category) => [category, managedKnowledgeCatalog.filter((entry) => entry.category === category).length]));
console.log(`Knowledge validation passed: ${managedKnowledgeCatalog.length} entries across ${KNOWLEDGE_CATEGORIES.length} categories.`);
console.log(counts);
const patches = validatePatchKnowledgeCatalog(patchKnowledgeCatalog);
if (!patches.valid) throw new Error(`Patch validation failed:\n${patches.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')}`);
console.log(`Patch validation passed: ${patchKnowledgeCatalog.length} structured patch entries.`);
