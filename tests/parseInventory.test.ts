import assert from 'node:assert/strict';
import test from 'node:test';
import nbt from 'prismarine-nbt';
import type { NBT } from 'prismarine-nbt';
import { parseInventory } from '../lib/parseInventory.ts';
import { createInventoryOwnershipSummary } from '../lib/inventoryContext.ts';

const { byte, comp, int, list, short, string, writeUncompressed } = nbt;

function inventoryBlob(): string {
  const item = comp({
    id: short(397),
    Count: byte(1),
    Damage: short(0),
    tag: comp({
      display: comp({
        Name: string('§6Ancient Test Helmet'),
        Lore: list(string(['§6LEGENDARY HELMET'])),
      }),
      ExtraAttributes: comp({
        id: string('TEST_HELMET'),
        modifier: string('ancient'),
        upgrade_level: int(5),
        dungeon_item_level: int(8),
        gems: comp({ JASPER_0: string('FINE') }),
        enchantments: comp({ protection: int(6) }),
      }),
    }),
  });
  const root = comp({ i: list(comp([item.value])) }, '');
  return writeUncompressed(root as unknown as NBT).toString('base64');
}

test('decodes raw compound-list entries without dropping items', async () => {
  const data = inventoryBlob();
  const parsed = await parseInventory({
    wardrobe_contents: { type: 0, data },
    inventory: {
      inv_armor: { type: 0, data },
      equipment_contents: { type: 0, data },
      bag_contents: { talisman_bag: { type: 0, data } },
    },
  });

  assert.equal(parsed.armor.error, null);
  assert.equal(parsed.armor.items.length, 1);
  assert.equal(parsed.armor.items[0].skyblockId, 'TEST_HELMET');
  assert.equal(parsed.armor.items[0].displayName, 'Ancient Test Helmet');
  assert.equal(parsed.armor.items[0].rawDisplayName, '§6Ancient Test Helmet');
  assert.deepEqual(parsed.armor.items[0].lore, ['LEGENDARY HELMET']);
  assert.deepEqual(parsed.armor.items[0].rawLore, ['§6LEGENDARY HELMET']);
  assert.equal(parsed.armor.items[0].rarity, 'LEGENDARY');
  assert.equal(parsed.armor.items[0].stars, 5);
  assert.equal(parsed.armor.items[0].dungeonLevel, 8);
  assert.deepEqual(parsed.armor.items[0].gemstones, { JASPER_0: 'FINE' });
  assert.deepEqual(parsed.armor.items[0].enchantments, [{ id: 'protection', level: 6 }]);
  assert.equal(parsed.equipment.items.length, 1);
  assert.equal(parsed.accessoryBag.items.length, 1);
  assert.equal(parsed.accessoryBag.sourcePath, 'inventory.bag_contents.talisman_bag');

  const ownership = createInventoryOwnershipSummary(parsed);
  assert.equal(ownership.sections.armor.occupiedSlots, 1);
  assert.equal(ownership.sections.wardrobe.available, true);
  assert.equal(parsed.wardrobe.sourcePath, 'wardrobe_contents');
  assert.ok(ownership.items.some((item) => item.section === 'accessoryBag' && item.skyblockId === 'TEST_HELMET'));
});

test('handles malformed and non-object inventory responses safely', async () => {
  const malformed = await parseInventory({ inventory: { inv_contents: { data: 'not base64!' } } });
  assert.equal(malformed.inventory.items.length, 0);
  assert.equal(malformed.inventory.error, 'Invalid Base64 inventory data');

  const missing = await parseInventory(null);
  assert.equal(missing.armor.available, false);
  assert.equal(missing.accessoryBag.error, null);
});

test('decodes the current armor loadout wardrobe format in set order', async () => {
  const data = inventoryBlob();
  const parsed = await parseInventory({
    loadout: {
      armor: {
        sets: [
          { helmet: { data }, chestplate: {}, leggings: {}, boots: {} },
          { helmet: {}, chestplate: { data }, leggings: {}, boots: {} },
        ],
      },
    },
  });

  assert.equal(parsed.wardrobe.available, true);
  assert.equal(parsed.wardrobe.error, null);
  assert.equal(parsed.wardrobe.sourcePath, 'loadout.armor.sets');
  assert.deepEqual(parsed.wardrobe.items.map((item) => item.slot), [0, 5]);
  assert.deepEqual(parsed.wardrobe.items.map((item) => item.skyblockId), ['TEST_HELMET', 'TEST_HELMET']);
});

test('decodes numeric raw Hypixel armor loadout keys', async () => {
  const data = inventoryBlob();
  const parsed = await parseInventory({
    loadout: {
      armor: {
        equipped_set: 3,
        '2': { id: 'empty' },
        '3': { id: 'used', HELMET: { type: 0, data }, BOOTS: { type: 0, data } },
      },
    },
  });

  assert.equal(parsed.wardrobe.available, true);
  assert.equal(parsed.wardrobe.sourcePath, 'loadout.armor');
  assert.deepEqual(parsed.wardrobe.items.map((item) => item.slot), [8, 11]);
});
