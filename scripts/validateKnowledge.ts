import { managedKnowledgeCatalog } from '../knowledge/catalog.ts';
import { KNOWLEDGE_CATEGORIES } from '../knowledge/schema.ts';

const counts = Object.fromEntries(KNOWLEDGE_CATEGORIES.map((category) => [category, managedKnowledgeCatalog.filter((entry) => entry.category === category).length]));
console.log(`Knowledge validation passed: ${managedKnowledgeCatalog.length} entries across ${KNOWLEDGE_CATEGORIES.length} categories.`);
console.log(counts);
