import combat from './combat/entries.json' with { type: 'json' };
import farming from './farming/entries.json' with { type: 'json' };
import foraging from './foraging/entries.json' with { type: 'json' };
import mining from './mining/entries.json' with { type: 'json' };
import fishing from './fishing/entries.json' with { type: 'json' };
import dungeons from './dungeons/entries.json' with { type: 'json' };
import slayers from './slayers/entries.json' with { type: 'json' };
import pets from './pets/entries.json' with { type: 'json' };
import accessories from './accessories/entries.json' with { type: 'json' };
import collections from './collections/entries.json' with { type: 'json' };
import hotm from './hotm/entries.json' with { type: 'json' };
import hotf from './hotf/entries.json' with { type: 'json' };
import garden from './garden/entries.json' with { type: 'json' };
import rift from './rift/entries.json' with { type: 'json' };
import crimson from './crimson/entries.json' with { type: 'json' };
import museum from './museum/entries.json' with { type: 'json' };
import economy from './economy/entries.json' with { type: 'json' };
import { assertValidKnowledgeCatalog } from './validation.ts';

export const managedKnowledgeCatalog = assertValidKnowledgeCatalog({ combat, farming, foraging, mining, fishing, dungeons, slayers, pets, accessories, collections, hotm, hotf, garden, rift, crimson, museum, economy });

export const managedKnowledgeById = new Map(managedKnowledgeCatalog.map((entry) => [entry.id, entry]));
