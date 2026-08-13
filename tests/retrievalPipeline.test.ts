import assert from 'node:assert/strict';
import test from 'node:test';
import { determineRelevantSystems, retrieveLocalKnowledge, retrievePatchHistory, runRetrievalPipeline } from '../lib/retrieval/index.ts';

const playerData = {
  profileSummary: {
    skills: [{ skill: 'mining', level: 42 }, { skill: 'combat', level: 31 }],
    hotm: { level: 6, totalPowderSpent: 125_000 },
    accessories: { magicalPower: 280 },
  },
  recommendations: [
    { id: 'missing-hotm-progression', category: 'hotm', priority: 88, title: 'Missing HOTM Progression', explanation: 'HOTM is below 7.', evidence: [{ label: 'HOTM', value: 6 }], expectedBenefit: 'Mining unlocks', estimatedEffort: 'High', confidence: 98, suggestedAction: 'Complete commissions.', knowledgeReferences: ['mining_hotm'] },
    { id: 'low-magical-power', category: 'accessories', priority: 80, title: 'Low Magical Power', evidence: [{ label: 'Magical Power', value: 280 }] },
  ],
};

test('determines relevant systems from the question before recommendation fallbacks', () => {
  const systems = determineRelevantSystems('How should I spend HOTM powder?', playerData);
  assert.equal(systems[0], 'hotm');
  assert.ok(systems.includes('mining'));
  assert.ok(systems.includes('accessories'));
});

test('local retrieval returns entries only from selected systems', () => {
  const entries = retrieveLocalKnowledge('Garden visitors', ['garden']);
  assert.ok(entries.length > 0);
  assert.ok(entries.every((entry) => entry.category === 'garden'));
});

test('pipeline constructs bounded relevant context and measures token reduction', () => {
  const result = runRetrievalPipeline('What should I do with HOTM powder?', playerData);
  assert.ok(result.knowledge.every((entry) => result.systems.includes(entry.category)));
  assert.ok(Array.isArray(result.patches));
  assert.ok(result.profileEvidence.some((entry) => entry.label === 'HOTM level' && entry.value === 6));
  assert.ok(result.context.includes('missing-hotm-progression'));
  assert.equal(result.context.includes('garden.advance-milestones-and-visitors'), false);
  assert.ok(result.tokenMetrics.before > result.tokenMetrics.after);
  assert.equal(result.tokenMetrics.saved, result.tokenMetrics.before - result.tokenMetrics.after);
  assert.ok(result.tokenMetrics.reductionPercent > 0);
});

test('patch retrieval returns relevant historical meta context without full patch database', () => {
  const patches = retrievePatchHistory('Is old foraging advice still good after Galatea?', ['foraging', 'hotf']);
  assert.ok(patches.length > 0);
  assert.ok(patches.some((patch) => patch.extractedKnowledge.some((change) => change.topic === 'foraging' || change.topic === 'hotf')));
});
