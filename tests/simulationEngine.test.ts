import assert from 'node:assert/strict';
import test from 'node:test';
import { simulateProfileChange, type SimulationProfile } from '../lib/simulation/index.ts';

const profile = (): SimulationProfile => ({ magicalPower: 382, skills: { foraging: 12 }, pets: [] });

test('simulates Magical Power scaling and tuning points without mutating the profile', () => {
  const live = profile();
  const snapshot = structuredClone(live);
  const result = simulateProfileChange(live, { type: 'set-magical-power', target: 700 });
  assert.deepEqual(live, snapshot);
  assert.equal(result.simulatedProfile.magicalPower, 700);
  assert.equal(result.impacts.find((entry) => entry.id === 'tuning-points')?.delta, 32);
  assert.ok((result.impacts.find((entry) => entry.id === 'power-scaling')?.delta ?? 0) > 0);
});

test('simulates Foraging progression and reports only newly crossed unlock thresholds', () => {
  const live: SimulationProfile = { magicalPower: 0, skills: { foraging: 0 }, pets: [] };
  const result = simulateProfileChange(live, { type: 'set-skill-level', skill: 'foraging', target: 3 });
  assert.equal(result.impacts.find((entry) => entry.id === 'foraging-fortune')?.delta, 12);
  assert.deepEqual(result.unlocks.filter((entry) => entry.newlyUnlocked).map((entry) => entry.title), ['Birch Park', 'Spruce Woods', 'Savanna Woodland']);
  assert.equal(live.skills.foraging, 0);
});

test('uses profile-specific skill caps when evaluating skill goals', () => {
  const live: SimulationProfile = { magicalPower: 0, skills: { foraging: 50, enchanting: 45 }, skillCaps: { foraging: { current: 50, absolute: 54 }, enchanting: { current: 60, absolute: 60 } }, pets: [] };
  const upgradeGoal = simulateProfileChange(live, { type: 'set-skill-level', skill: 'foraging', target: 54 });
  assert.equal(upgradeGoal.simulatedProfile.skills.foraging, 54);
  assert.match(upgradeGoal.warnings.join(' '), /currently capped at 50/i);

  const impossibleGoal = simulateProfileChange(live, { type: 'set-skill-level', skill: 'enchanting', target: 70 });
  assert.equal(impossibleGoal.simulatedProfile.skills.enchanting, 60);
});

test('simulates a Legendary Elephant at its selected level and avoids duplicate benefit', () => {
  const first = simulateProfileChange(profile(), { type: 'acquire-pet', petType: 'ELEPHANT', tier: 'LEGENDARY', level: 100 });
  assert.equal(first.impacts[0].after, 150);
  assert.equal(first.unlocks[0].title, 'Trunk Efficiency perk');
  const owned: SimulationProfile = { ...profile(), pets: [{ type: 'ELEPHANT', tier: 'LEGENDARY', level: 100 }] };
  const duplicate = simulateProfileChange(owned, { type: 'acquire-pet', petType: 'ELEPHANT', tier: 'LEGENDARY', level: 100 });
  assert.equal(duplicate.applied, false);
  assert.equal(duplicate.impacts[0].delta, 0);
  assert.equal(owned.pets.length, 1);
});
