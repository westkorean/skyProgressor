import assert from 'node:assert/strict';
import test from 'node:test';
import { generateSkyProgressorAchievements } from '../lib/skyProgressorAchievements.ts';
import type { CollectionEntry } from '../lib/parseCollections.ts';

const collection = (tier: number, maxTier: number): CollectionEntry => ({ rawKey: 'TEST', name: 'Test', category: 'Other', amount: 0, tier, maxTier, nextTierRequirement: null, remaining: null, progressPercent: tier / maxTier * 100, nextReward: null });

test('custom achievement engine calculates transparent weighted completion', () => {
  const summary = generateSkyProgressorAchievements({ uniqueAccessoryCount: 75, magicalPower: 300, catacombsLevel: 15, farmingLevel: 20, gardenLevel: 7.5, gardenMaxLevel: 15, collections: [collection(5, 10)] });
  const accessories = summary.achievements.find((item) => item.id === 'accessory-collector');
  assert.equal(accessories?.completionPercent, 80);
  assert.equal(summary.achievements.find((item) => item.id === 'dungeon-expert')?.completionPercent, 50);
  assert.equal(summary.achievements.find((item) => item.id === 'master-farmer')?.completionPercent, 50);
  assert.equal(summary.achievements.find((item) => item.id === 'collection-completionist')?.completionPercent, 50);
  assert.equal(summary.achievements.find((item) => item.id === 'achievement-hunter')?.completionPercent, 58);
  assert.equal(summary.source, 'skyprogressor-custom');
});

test('achievement hunter completes only when every primary custom achievement completes', () => {
  const summary = generateSkyProgressorAchievements({ uniqueAccessoryCount: 100, magicalPower: 700, catacombsLevel: 40, farmingLevel: 50, gardenLevel: 15, gardenMaxLevel: 15, collections: [collection(10, 10)] });
  assert.ok(summary.achievements.every((item) => item.completed));
  assert.equal(summary.completed, 5);
  assert.equal(summary.overallCompletionPercent, 100);
});

test('custom achievements handle unavailable collection and Garden data safely', () => {
  const summary = generateSkyProgressorAchievements({ uniqueAccessoryCount: 0, magicalPower: 0, catacombsLevel: 0, farmingLevel: 0, gardenLevel: 0, gardenMaxLevel: 0, collections: [] });
  assert.equal(summary.achievements.length, 5);
  assert.ok(summary.achievements.every((item) => Number.isFinite(item.completionPercent)));
});
