import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getProgressionIssues,
  getProgressionRecommendations,
  type RecommendationProfile,
} from '../lib/recommendationEngine.ts';

const profile: RecommendationProfile = {
  skills: [
    { skill: 'combat', level: 40, currentXp: 0, xpForNextLevel: 1, progressPercent: 0 },
    { skill: 'mining', level: 10, currentXp: 0, xpForNextLevel: 1, progressPercent: 0 },
  ],
  slayers: [
    { slayer: 'zombie', level: 2, currentXp: 0, xpForNextLevel: 1, progressPercent: 0 },
  ],
  catacombs: { level: 10, currentXp: 0, xpForNextLevel: 1, progressPercent: 0 },
  fairySouls: { collected: 100, total: 273, remaining: 173, progressPercent: 37 },
  skyblockLevel: { level: 120, currentXp: 0, progressPercent: 0 },
  accessories: { magicalPower: 100 },
  collections: [{
    rawKey: 'BONE', name: 'Bone', category: 'Combat', amount: 9_000, tier: 7,
    maxTier: 10, nextTierRequirement: 10_000, remaining: 1_000,
    progressPercent: 90, nextReward: 'Test reward',
  }],
};

test('orders recommendations deterministically by descending priority', () => {
  const first = getProgressionRecommendations(profile);
  const second = getProgressionRecommendations(profile);

  assert.deepEqual(first, second);
  assert.ok(first.length > 1);
  assert.deepEqual(first.map((entry) => entry.priority), [...first.map((entry) => entry.priority)].sort((a, b) => b - a));
  assert.equal(first[0].id, 'increase-magical-power');
  assert.equal(first[0].evidence.find((entry) => entry.label === 'Magical Power')?.value, 100);
});

test('derives conversational issues from ranked engine output', () => {
  const recommendations = getProgressionRecommendations(profile);
  const issues = getProgressionIssues(profile);

  assert.deepEqual(issues.map((issue) => issue.priority), recommendations.map((entry) => entry.priority));
  assert.ok(issues.every((issue) => issue.suggestedActions.length > 0));
});

test('flags weak equipped armor using explicit dungeon-readiness evidence', () => {
  const recommendations = getProgressionRecommendations({
    ...profile,
    inventory: {
      armor: {
        available: true,
        items: [
          { skyblockId: 'GLACITE_BOOTS', displayName: 'Glacite Boots', stars: 0, dungeonLevel: null, lore: ['EPIC BOOTS'] },
          { skyblockId: 'GLACITE_LEGGINGS', displayName: 'Glacite Leggings', stars: 0, dungeonLevel: null, lore: ['EPIC LEGGINGS'] },
        ],
      },
    } as unknown as NonNullable<RecommendationProfile['inventory']>,
  });

  const recommendation = recommendations.find((entry) => entry.id === 'improve-dungeon-gear');
  assert.ok(recommendation);
  assert.equal(recommendation.evidence.find((entry) => entry.label === 'Equipped armor pieces')?.value, 2);
  assert.equal(recommendation.evidence.find((entry) => entry.label === 'Dungeon-ready pieces')?.value, 0);
});

test('does not flag dungeon gear when a complete starred wardrobe set is owned', () => {
  const wardrobeItems = ['HELMET', 'CHESTPLATE', 'LEGGINGS', 'BOOTS'].map((piece, index) => ({
    index,
    slot: index,
    skyblockId: `SHADOW_ASSASSIN_${piece}`,
    displayName: `Shadow Assassin ${piece}`,
    stars: 5,
    dungeonLevel: 5,
    lore: [`LEGENDARY DUNGEON ${piece}`],
  }));
  const recommendations = getProgressionRecommendations({
    ...profile,
    inventory: {
      armor: { available: true, items: [] },
      equipment: { available: true, items: [] },
      inventory: { available: true, items: [] },
      enderChest: { available: true, items: [] },
      wardrobe: { available: true, items: wardrobeItems },
      accessoryBag: { available: true, items: [] },
    } as unknown as NonNullable<RecommendationProfile['inventory']>,
  });

  assert.equal(recommendations.some((entry) => entry.id === 'improve-dungeon-gear'), false);
});

test('ignores cosmetic skills and gates Blaze Slayer until the profile is ready', () => {
  const recommendations = getProgressionRecommendations({
    ...profile,
    skills: [
      { skill: 'combat', level: 30, currentXp: 0, xpForNextLevel: 1, progressPercent: 0 },
      { skill: 'mining', level: 28, currentXp: 0, xpForNextLevel: 1, progressPercent: 0 },
      { skill: 'runecrafting', level: 1, currentXp: 0, xpForNextLevel: 1, progressPercent: 0 },
    ],
    slayers: [
      { slayer: 'zombie', level: 5, currentXp: 0, xpForNextLevel: 1, progressPercent: 0 },
      { slayer: 'blaze', level: 0, currentXp: 0, xpForNextLevel: 1, progressPercent: 0 },
    ],
    skyblockLevel: { level: 75, currentXp: 0, progressPercent: 0 },
    catacombs: { level: 12, currentXp: 0, xpForNextLevel: 1, progressPercent: 0 },
    accessories: { magicalPower: 180 },
  });

  assert.equal(recommendations.some((entry) => entry.id === 'improve-runecrafting'), false);
  assert.equal(recommendations.some((entry) => entry.id.includes('blaze')), false);
});

test('does not prioritize Bestiary for a non-late-game profile even when a kill milestone is close', () => {
  const recommendations = getProgressionRecommendations({
    ...profile,
    bestiary: {
      available: true,
      families: [],
      totalKills: 100,
      unlockedFamilies: 5,
      totalFamilies: 100,
      missingFamilies: [],
      bestiaryLevel: 2,
      milestoneTiers: 2,
      skyblockXp: 20,
      closestMilestone: {
        id: 'zombie', categoryId: 'hub', categoryName: 'Hub', name: 'Zombie', kills: 9,
        tier: 1, maxTier: 10, nextTierKills: 10, remainingKills: 1, progressPercent: 90,
      },
    },
  });

  assert.equal(recommendations.some((entry) => entry.category === 'bestiary'), false);
});
