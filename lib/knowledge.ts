import foraging from '@/data/foraging.json';
import mining from '@/data/mining.json';
import combat from '@/data/combat.json';
import farming from '@/data/farming.json';
import dungeons from '@/data/dungeons.json';
import slayers from '@/data/slayers.json';
import gear from '@/data/gear.json';
import pets from '@/data/pets.json';
import progression from '@/data/progression.json';
import collections from '@/data/collections.generated.json';
import setups from '@/data/setupKnowledge.json';

export type KnowledgeCategory = 'skills' | 'slayers' | 'collections' | 'pets' | 'dungeons' | 'gear' | 'progression';
export interface KnowledgeChunk { id: string; category: KnowledgeCategory; topic: string; content: string; tags: string[]; sources?: string[]; reviewedAt?: string }
type RawChunk = { id: string; topic: string; content: string; tags: string[]; sources?: string[]; reviewedAt?: string };
const tagged = (category: KnowledgeCategory, entries: RawChunk[]): KnowledgeChunk[] => entries.map((entry) => ({ ...entry, category }));

const collectionChunks: KnowledgeChunk[] = Object.values(collections.items).map((item) => ({
  id: `collection_${item.id.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
  category: 'collections',
  topic: `${item.name} collection`,
  content: `${item.name} has ${item.maxTiers ?? 'unknown'} tiers. ${item.tiers.map((tier) => `Tier ${tier.tier}: ${tier.amountRequired}${tier.unlocks.length ? ` (${tier.unlocks.join(', ')})` : ''}`).join('; ')}.`,
  tags: ['collection', item.id.toLowerCase(), ...item.name.toLowerCase().split(/\s+/)],
}));

export const knowledgeBase: KnowledgeChunk[] = [
  ...tagged('skills', [...foraging, ...mining, ...combat, ...farming]),
  ...tagged('dungeons', dungeons),
  ...tagged('slayers', slayers),
  ...tagged('gear', gear),
  ...tagged('pets', pets),
  ...tagged('progression', progression),
  ...tagged('gear', setups),
  ...collectionChunks,
];
