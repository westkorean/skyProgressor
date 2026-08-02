import assert from 'node:assert/strict';
import test from 'node:test';
import { recommendationKnowledgeReferences, summarizePlayerData } from '../lib/chatContext.ts';
import { rankKnowledge, selectKnowledgeByIds } from '../lib/scoreKnowledge.ts';

const chunks = [
  { id: 'mining_progression', category: 'skills', topic: 'Mining progression', content: 'Progress through HOTM.', tags: ['mining', 'hotm'] },
  { id: 'combat_progression', category: 'skills', topic: 'Combat progression', content: 'Improve combat gear.', tags: ['combat'] },
  { id: 'gear_upgrade_logic', category: 'gear', topic: 'Gear upgrades', content: 'Choose efficient upgrades.', tags: ['gear'] },
];

test('retrieves only scored chunks for the user question and respects limits', () => {
  const results = rankKnowledge(chunks, 'How should I progress mining and HOTM?', {
    categories: ['skills'],
    limit: 2,
  });

  assert.ok(results.length > 0 && results.length <= 2);
  assert.ok(results.every((chunk) => chunk.category === 'skills' && chunk.score > 0));
  assert.ok(results.some((chunk) => chunk.id === 'mining_hotm' || chunk.id === 'mining_progression'));
});

test('resolves exact deterministic knowledge references without adding extras', () => {
  const results = selectKnowledgeByIds(chunks, ['combat_progression', 'gear_upgrade_logic', 'missing_id']);
  assert.deepEqual(results.map((chunk) => chunk.id), ['combat_progression', 'gear_upgrade_logic']);
});

test('builds a bounded player summary and extracts engine references', () => {
  const pets = Array.from({ length: 25 }, (_, index) => ({
    type: `PET_${index}`,
    displayName: `Pet ${index}`,
    tier: 'COMMON',
    level: index,
    active: index === 20,
    heldItem: null,
    ignoredLargeField: 'do-not-send',
  }));
  const playerData = {
    pets,
    recommendations: [{ knowledgeReferences: ['combat_progression', 'gear_upgrade_logic'] }],
    progressionIssues: [],
    skills: [],
    slayers: [],
    collections: [],
    inventory: {
      sections: { inventory: { available: true, totalSlots: 36, occupiedSlots: 1 } },
      items: [{ section: 'inventory', slot: 0, skyblockId: 'ASPECT_OF_THE_END', name: 'Aspect of the End' }],
    },
  };

  const summary = summarizePlayerData(playerData);
  const parsed = JSON.parse(summary) as { activeAndTopPets: Array<Record<string, unknown>>; inventoryOwnership: { items: Array<Record<string, unknown>> } };
  assert.equal(parsed.activeAndTopPets.length, 10);
  assert.equal(parsed.activeAndTopPets[0].active, true);
  assert.equal(summary.includes('ignoredLargeField'), false);
  assert.equal(parsed.inventoryOwnership.items[0].skyblockId, 'ASPECT_OF_THE_END');
  assert.deepEqual(recommendationKnowledgeReferences(playerData), ['combat_progression', 'gear_upgrade_logic']);
});

test('keeps large inventory context below the model request limit', () => {
  const items = Array.from({ length: 750 }, (_, index) => ({
    section: 'enderChest',
    slot: index,
    skyblockId: `ITEM_${index}`,
    name: `Item ${index}`,
    lore: Array(12).fill('A long line of item lore that should not be sent to the model.'),
  }));
  const itemMetadata = Object.fromEntries(items.map((item) => [item.skyblockId, {
    id: item.skyblockId,
    name: item.name,
    wikiSummary: 'A very long wiki summary that should not be included. '.repeat(20),
    imageUrl: 'https://example.com/a-very-long-image-url.png',
  }]));

  const summary = summarizePlayerData({ inventory: { sections: {}, items }, itemMetadata });
  const parsed = JSON.parse(summary) as { inventoryOwnership: { items: unknown[]; metadata: Record<string, unknown> } };

  assert.equal(parsed.inventoryOwnership.items.length, 150);
  assert.equal(Object.keys(parsed.inventoryOwnership.metadata).length, 100);
  assert.equal(summary.includes('long line of item lore'), false);
  assert.equal(summary.includes('very long wiki summary'), false);
  assert.ok(summary.length <= 18_029);
});
