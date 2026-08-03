import assert from 'node:assert/strict';
import test from 'node:test';
import { buildComparisonProfile } from '../lib/profileComparisonData.ts';
import { parseGarden } from '../lib/parseGarden.ts';

test('comparison profile parsing is deterministic and safe for missing data', () => {
  const garden = parseGarden(null);
  const first = buildComparisonProfile(undefined, garden);
  const second = buildComparisonProfile(undefined, garden);

  assert.deepEqual(first, second);
  assert.ok(Number.isFinite(first.progressionScore.score));
  assert.ok(first.progressionScore.score >= 0 && first.progressionScore.score <= 100);
  assert.equal(first.garden, garden);
});

test('comparison score uses the shared seven-category formula', () => {
  const member = {
    player_data: { experience: { SKILL_COMBAT: 0, SKILL_FISHING: 0 } },
    accessory_bag_storage: { highest_magical_power: 600 },
  };
  const garden = { ...parseGarden(null), maxLevel: 15, level: 15 };
  const result = buildComparisonProfile(member, garden);

  assert.equal(result.accessories.magicalPower, 600);
  assert.ok(result.progressionScore.score >= 14);
  assert.ok(result.progressionScore.score <= 100);
});
