import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSkills } from '../lib/parseProfile.ts';
import { SKILL_XP_TABLE } from '../lib/xpTables.ts';

const skill = (member: unknown, name: string) => {
  const parsed = parseSkills(member).find((entry) => entry.skill === name);
  assert.ok(parsed);
  return parsed;
};

test('keeps taming at the purchased cap while reporting banked overflow', () => {
  const taming = skill({
    player_data: { experience: { SKILL_TAMING: SKILL_XP_TABLE[57] } },
    pets_data: { pet_care: { pet_types_sacrificed: ['RIFT_FERRET', 'SLUG', 'SLUG'] } },
  }, 'taming');

  assert.equal(taming.maxLevel, 52);
  assert.equal(taming.level, 52);
  assert.equal(taming.absoluteMaxLevel, 60);
  assert.equal(taming.overflowLevel, 57);
  assert.equal(taming.overflowXp, SKILL_XP_TABLE[57] - SKILL_XP_TABLE[52]);
});

test('uses Anita farming cap purchases and stops calling an upgradeable cap the game maximum', () => {
  const farming = skill({
    player_data: { experience: { SKILL_FARMING: SKILL_XP_TABLE[55] } },
    jacobs_contest: { perks: { farming_level_cap: 3 } },
  }, 'farming');

  assert.equal(farming.level, 53);
  assert.equal(farming.maxLevel, 53);
  assert.equal(farming.absoluteMaxLevel, 60);
  assert.equal(farming.overflowLevel, 55);
});

test('recognizes current foraging collection cap upgrades', () => {
  const foraging = skill({
    player_data: { experience: { SKILL_FORAGING: SKILL_XP_TABLE[53] } },
    collection: { FIG_LOG: 150_000, MANGROVE_LOG: 150_000 },
  }, 'foraging');

  assert.equal(foraging.level, 52);
  assert.equal(foraging.maxLevel, 52);
  assert.equal(foraging.absoluteMaxLevel, 54);
  assert.equal(foraging.overflowLevel, 53);
});

test('uses the foraging cap metadata without displaying it as a skill', () => {
  const parsed = parseSkills({
    player_data: {
      experience: {
        SKILL_FORAGING: SKILL_XP_TABLE[53],
        SKILL_FORAGING_EXTRA_LEVEL_CAP: 2,
      },
    },
  });

  assert.deepEqual(parsed.map((entry) => entry.skill), ['foraging']);
  assert.equal(parsed[0]?.maxLevel, 52);
  assert.equal(parsed[0]?.level, 52);
});
