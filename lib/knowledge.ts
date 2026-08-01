import foraging from '@/data/foraging.json';
import mining from '@/data/mining.json';
import combat from '@/data/combat.json';
import farming from '@/data/farming.json';
import dungeons from '@/data/dungeons.json';
import slayers from '@/data/slayers.json';

export const knowledgeBase = [
  ...foraging,
  ...mining,
  ...combat,
  ...farming,
  ...dungeons,
  ...slayers,
];
