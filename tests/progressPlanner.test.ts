import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgressPlanner } from '../lib/progressPlanner.ts';
import { parseHOTM } from '../lib/parseHOTM.ts';

test('planner creates the deterministic mining dependency sequence with profile-derived progress and cost', () => {
  const hotm = parseHOTM({ mining_core: { experience: 302_040, nodes: {}, powder_spent_mithril: 600_000, powder_spent_gemstone: 400_000 } });
  const prices = Object.fromEntries(['DIVAN_HELMET', 'DIVAN_CHESTPLATE', 'DIVAN_LEGGINGS', 'DIVAN_BOOTS'].map((id) => [id, { unitPrice: 10_000_000, source: 'auction-median' as const }]));
  const planner = createProgressPlanner({ hotm, magicalPower: 500, ownedItemIds: [], marketPrices: prices, bazaarPrices: {}, recommendations: [] });
  assert.deepEqual(planner.goals.slice(0, 4).map((goal) => goal.title), ['Reach HOTM 7', 'Upgrade Mining Fortune', 'Unlock Divan Armor', 'Establish Gemstone Mining']);
  assert.deepEqual(planner.goals[2].prerequisites, ['Reach HOTM 7', 'Upgrade Mining Fortune']);
  assert.equal(planner.goals[2].estimatedCost, '40,000,000 coins estimated acquisition cost');
  assert.equal(planner.goals[0].status, 'current');
  assert.equal(planner.goals[1].status, 'locked');
  assert.equal(planner.generatedBy, 'deterministic-progress-planner');
  assert.equal(planner.cheapestProgressionGoal?.id, 'planner-hotm-7');
});

test('planner marks owned Divan pieces and never mutates caller-owned arrays', () => {
  const hotm = parseHOTM({ mining_core: { experience: 2_000_000, nodes: {}, powder_spent_mithril: 2_000_000 } });
  const owned = ['DIVAN_HELMET', 'DIVAN_CHESTPLATE'];
  const snapshot = [...owned];
  const planner = createProgressPlanner({ hotm, magicalPower: 500, ownedItemIds: owned, marketPrices: {}, bazaarPrices: {}, recommendations: [] });
  assert.deepEqual(owned, snapshot);
  assert.equal(planner.goals.find((goal) => goal.id === 'planner-divan-armor')?.progressPercent, 50);
});
