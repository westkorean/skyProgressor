import combat from './combat/entries.json' with { type: 'json' };
import dungeons from './dungeons/entries.json' with { type: 'json' };
import foraging from './foraging/entries.json' with { type: 'json' };
import mining from './mining/entries.json' with { type: 'json' };
import farming from './farming/entries.json' with { type: 'json' };
import pets from './pets/entries.json' with { type: 'json' };
import accessories from './accessories/entries.json' with { type: 'json' };
import rift from './rift/entries.json' with { type: 'json' };
import garden from './garden/entries.json' with { type: 'json' };
import hotm from './hotm/entries.json' with { type: 'json' };
import { assertValidKnowledgeCatalog } from './validation.ts';

export const managedKnowledgeCatalog = assertValidKnowledgeCatalog({ combat, dungeons, foraging, mining, farming, pets, accessories, rift, garden, hotm });

export const managedKnowledgeById = new Map(managedKnowledgeCatalog.map((entry) => [entry.id, entry]));
