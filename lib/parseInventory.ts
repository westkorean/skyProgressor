import { parse, type Compound, type NBT, type Tags, TagType } from 'prismarine-nbt';

export type InventorySectionName =
  | 'armor'
  | 'equipment'
  | 'inventory'
  | 'enderChest'
  | 'wardrobe'
  | 'accessoryBag';

export interface NormalizedEnchantment { id: string; level: number }

export type SkyBlockRarity =
  | 'COMMON'
  | 'UNCOMMON'
  | 'RARE'
  | 'EPIC'
  | 'LEGENDARY'
  | 'MYTHIC'
  | 'DIVINE'
  | 'SPECIAL'
  | 'VERY SPECIAL';

export interface InventoryItem {
  index: number;
  slot: number | null;
  id: number | string | null;
  count: number | null;
  damage: number | null;
  skyblockId: string | null;
  textureHash: string | null;
  displayName: string | null;
  lore: string[];
  rawDisplayName: string | null;
  rawLore: string[];
  rarity: SkyBlockRarity | null;
  reforge: string | null;
  stars: number;
  dungeonLevel: number | null;
  gemstones: Record<string, unknown>;
  enchantments: NormalizedEnchantment[];
  dungeonStats: Record<string, number | string>;
  nbt: Compound;
}

export interface InventorySection {
  name: InventorySectionName;
  sourcePath: string;
  available: boolean;
  encodedData: string | null;
  nbt: NBT | null;
  items: InventoryItem[];
  error: string | null;
}

export interface InventoryData {
  armor: InventorySection;
  equipment: InventorySection;
  inventory: InventorySection;
  enderChest: InventorySection;
  wardrobe: InventorySection;
  accessoryBag: InventorySection;
}

type UnknownRecord = Record<string, unknown>;

const SECTION_PATHS: Record<InventorySectionName, readonly (readonly string[])[]> = {
  armor: [['inventory', 'inv_armor'], ['inv_armor']],
  equipment: [['inventory', 'equipment_contents'], ['equipment_contents'], ['equippment_contents']],
  inventory: [['inventory', 'inv_contents'], ['inv_contents']],
  enderChest: [['inventory', 'ender_chest_contents'], ['ender_chest_contents']],
  wardrobe: [['inventory', 'wardrobe_contents'], ['wardrobe_contents']],
  accessoryBag: [['inventory', 'bag_contents', 'talisman_bag'], ['talisman_bag']],
};

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function valueAtPath(value: unknown, path: readonly string[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    const currentRecord = record(current);
    if (!currentRecord) return undefined;
    current = currentRecord[key];
  }
  return current;
}

function inventoryBlob(
  member: unknown,
  paths: readonly (readonly string[])[]
): { data: string | null; path: readonly string[] } {
  for (const path of paths) {
    const container = record(valueAtPath(member, path));
    if (typeof container?.data === 'string' && container.data.trim()) {
      return { data: container.data, path };
    }
  }
  return { data: null, path: paths[0] };
}

function normalizeBase64(value: string): string | null {
  const normalized = value.replace(/\s/g, '');
  if (!normalized || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) return null;
  const unpadded = normalized.replace(/=+$/, '');
  if (unpadded.length % 4 === 1) return null;
  return unpadded.padEnd(Math.ceil(unpadded.length / 4) * 4, '=');
}

function tag<T extends TagType>(
  value: Tags[TagType] | undefined,
  type: T
): Tags[T] | null {
  return value?.type === type ? (value as Tags[T]) : null;
}

function numberTag(value: Tags[TagType] | undefined): number | null {
  if (
    value?.type === TagType.Byte ||
    value?.type === TagType.Short ||
    value?.type === TagType.Int ||
    value?.type === TagType.Float ||
    value?.type === TagType.Double
  ) {
    return value.value;
  }
  return null;
}

function stringTag(value: Tags[TagType] | undefined): string | null {
  return value?.type === TagType.String ? value.value : null;
}

function nestedCompound(
  parent: Compound,
  key: string
): Compound | null {
  return tag(parent.value[key], TagType.Compound);
}

function stringList(parent: Compound | null, key: string): string[] {
  if (!parent) return [];
  const list = tag(parent.value[key], TagType.List);
  if (!list || list.value.type !== TagType.String || !Array.isArray(list.value.value)) return [];
  return list.value.value.filter((value): value is string => typeof value === 'string');
}

function plainTag(value: Tags[TagType] | undefined): unknown {
  if (!value) return null;
  if (value.type === TagType.Compound) {
    return Object.fromEntries(Object.entries(value.value).map(([key, child]) => [key, plainTag(child)]));
  }
  if (value.type === TagType.List) {
    return Array.isArray(value.value.value)
      ? value.value.value.map((child) => typeof child === 'object' && child !== null && 'type' in child ? plainTag(child as Tags[TagType]) : child)
      : [];
  }
  return value.value;
}

function normalizedCompound(parent: Compound | null): Record<string, unknown> {
  if (!parent) return {};
  return Object.fromEntries(Object.entries(parent.value).map(([key, value]) => [key, plainTag(value)]));
}

function stripMinecraftFormatting(value: string): string {
  return value.replace(/(?:§|Â§)./g, '').trim();
}

function skullTextureHash(itemTag: Compound | null): string | null {
  const skullOwner = itemTag ? nestedCompound(itemTag, 'SkullOwner') : null;
  const properties = skullOwner ? nestedCompound(skullOwner, 'Properties') : null;
  const textures = properties ? tag(properties.value.textures, TagType.List) : null;
  if (!textures || textures.value.type !== TagType.Compound || !Array.isArray(textures.value.value)) return null;

  for (const entry of textures.value.value) {
    const texture = record(entry);
    const encoded = texture ? stringTag(texture.Value as Tags[TagType] | undefined) : null;
    if (!encoded) continue;
    try {
      const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as unknown;
      const textureUrl = record(record(record(decoded)?.textures)?.SKIN)?.url;
      if (typeof textureUrl !== 'string') continue;
      const match = textureUrl.match(/textures\.minecraft\.net\/texture\/([a-f0-9]{32,64})(?:[/?#]|$)/i);
      if (match) return match[1].toLowerCase();
    } catch {
      // Optional malformed texture data must not prevent inventory decoding.
    }
  }
  return null;
}

function rarityFromLore(lore: readonly string[]): SkyBlockRarity | null {
  const rarityPattern = /(?:VERY SPECIAL|SPECIAL|DIVINE|MYTHIC|LEGENDARY|EPIC|RARE|UNCOMMON|COMMON)/i;
  for (let index = lore.length - 1; index >= 0; index -= 1) {
    const match = stripMinecraftFormatting(lore[index]).match(rarityPattern);
    if (match) return match[0].toUpperCase() as SkyBlockRarity;
  }
  return null;
}

function parseItem(item: Compound, index: number): InventoryItem {
  const itemTag = nestedCompound(item, 'tag');
  const extraAttributes = itemTag
    ? nestedCompound(itemTag, 'ExtraAttributes')
    : null;
  const display = itemTag ? nestedCompound(itemTag, 'display') : null;
  const enchantments = extraAttributes ? nestedCompound(extraAttributes, 'enchantments') : null;
  const gems = extraAttributes ? nestedCompound(extraAttributes, 'gems') : null;
  const rawDisplayName = display ? stringTag(display.value.Name) : null;
  const rawLore = stringList(display, 'Lore');
  const lore = rawLore.map(stripMinecraftFormatting);
  const dungeonStats: Record<string, number | string> = {};
  if (extraAttributes) {
    for (const [key, value] of Object.entries(extraAttributes.value)) {
      if (!key.startsWith('dungeon_') && key !== 'baseStatBoostPercentage') continue;
      const normalized = numberTag(value) ?? stringTag(value);
      if (normalized !== null) dungeonStats[key] = normalized;
    }
  }

  return {
    index,
    slot: numberTag(item.value.Slot),
    id: numberTag(item.value.id) ?? stringTag(item.value.id),
    count: numberTag(item.value.Count),
    damage: numberTag(item.value.Damage),
    skyblockId: extraAttributes
      ? stringTag(extraAttributes.value.id)
      : null,
    textureHash: skullTextureHash(itemTag),
    displayName: rawDisplayName ? stripMinecraftFormatting(rawDisplayName) : null,
    lore,
    rawDisplayName,
    rawLore,
    rarity: rarityFromLore(rawLore),
    reforge: extraAttributes ? stringTag(extraAttributes.value.modifier) : null,
    stars: extraAttributes ? numberTag(extraAttributes.value.upgrade_level) ?? 0 : 0,
    dungeonLevel: extraAttributes
      ? numberTag(extraAttributes.value.dungeon_item_level)
      : null,
    gemstones: normalizedCompound(gems),
    enchantments: enchantments
      ? Object.entries(enchantments.value).flatMap(([id, value]) => {
          const level = numberTag(value);
          return level === null ? [] : [{ id, level }];
        })
      : [],
    dungeonStats,
    nbt: item,
  };
}

function itemsFromRoot(root: NBT): InventoryItem[] {
  const itemList = tag(root.value.i, TagType.List);
  if (!itemList || itemList.value.type !== TagType.Compound) return [];
  if (!Array.isArray(itemList.value.value)) return [];

  return itemList.value.value.flatMap((value, index) => {
    const itemValue = record(value);
    if (!itemValue) return [];

    // prismarine-nbt exposes compound-list entries as their raw tag map rather
    // than wrapping every entry in { type: 'compound', value: ... }.
    const item: Compound = {
      type: TagType.Compound,
      value: itemValue as Compound['value'],
    };
    return [parseItem(item, index)];
  });
}

function emptySection(
  name: InventorySectionName,
  sourcePath: string,
  encodedData: string | null,
  error: string | null = null
): InventorySection {
  return {
    name,
    sourcePath,
    available: encodedData !== null,
    encodedData,
    nbt: null,
    items: [],
    error,
  };
}

async function decodeSection(
  member: unknown,
  name: InventorySectionName
): Promise<InventorySection> {
  const blob = inventoryBlob(member, SECTION_PATHS[name]);
  const path = blob.path;
  const sourcePath = path.join('.');
  const encodedData = blob.data;
  if (encodedData === null) return emptySection(name, sourcePath, null);

  try {
    const normalized = normalizeBase64(encodedData);
    if (normalized === null) {
      return emptySection(name, sourcePath, encodedData, 'Invalid Base64 inventory data');
    }
    const buffer = Buffer.from(normalized, 'base64');
    if (buffer.length === 0) {
      return emptySection(name, sourcePath, encodedData, 'Empty decoded inventory data');
    }
    const { parsed } = await parse(buffer, 'big');
    return {
      name,
      sourcePath,
      available: true,
      encodedData,
      nbt: parsed,
      items: itemsFromRoot(parsed),
      error: null,
    };
  } catch (error) {
    return emptySection(
      name,
      sourcePath,
      encodedData,
      error instanceof Error ? error.message : 'Unable to decode inventory NBT'
    );
  }
}

const WARDROBE_PIECES = ['helmet', 'chestplate', 'leggings', 'boots'] as const;

async function decodeWardrobe(member: unknown): Promise<InventorySection> {
  const legacy = inventoryBlob(member, SECTION_PATHS.wardrobe);
  if (legacy.data !== null) {
    const section = await decodeSection(member, 'wardrobe');
    return {
      ...section,
      items: section.items.map((item) => {
        const rawPosition = item.slot ?? item.index;
        const page = Math.floor(rawPosition / 36);
        const positionOnPage = rawPosition % 36;
        const pieceIndex = Math.floor(positionOnPage / 9);
        const column = positionOnPage % 9;
        const normalizedPosition = (page * 9 + column) * WARDROBE_PIECES.length + pieceIndex;
        return { ...item, index: normalizedPosition, slot: normalizedPosition };
      }),
    };
  }

  const armorLoadout = record(valueAtPath(member, ['loadout', 'armor']));
  const typedSets = armorLoadout?.sets;
  const loadoutSourcePath = Array.isArray(typedSets) ? 'loadout.armor.sets' : 'loadout.armor';
  const sets: Array<{ setIndex: number; value: unknown }> = Array.isArray(typedSets)
    ? typedSets.map((value, setIndex) => ({ setIndex, value }))
    : Object.entries(armorLoadout ?? {})
        .filter(([key]) => /^\d+$/.test(key))
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([key, value]) => ({ setIndex: Math.max(0, Number(key) - 1), value }));

  if (!armorLoadout || sets.length === 0) {
    return emptySection('wardrobe', 'loadout.armor.sets', null);
  }

  const decoded: InventoryItem[] = [];
  const errors: string[] = [];
  let suppliedBlobs = 0;

  for (const wardrobeSet of sets) {
    const { setIndex } = wardrobeSet;
    const set = record(wardrobeSet.value);
    if (!set) continue;
    for (let pieceIndex = 0; pieceIndex < WARDROBE_PIECES.length; pieceIndex += 1) {
      const piece = WARDROBE_PIECES[pieceIndex];
      const container = record(set[piece] ?? set[piece.toUpperCase()]);
      if (typeof container?.data !== 'string' || !container.data.trim()) continue;
      suppliedBlobs += 1;
      const syntheticMember = { wardrobe_contents: { data: container.data } };
      const section = await decodeSection(syntheticMember, 'wardrobe');
      if (section.error) {
        errors.push(`set ${setIndex + 1} ${piece}: ${section.error}`);
        continue;
      }
      for (const item of section.items) {
        decoded.push({
          ...item,
          index: setIndex * WARDROBE_PIECES.length + pieceIndex,
          slot: setIndex * WARDROBE_PIECES.length + pieceIndex,
        });
      }
    }
  }

  return {
    name: 'wardrobe',
    sourcePath: loadoutSourcePath,
    available: true,
    encodedData: null,
    nbt: null,
    items: decoded,
    error: suppliedBlobs > 0 && decoded.length === 0 && errors.length > 0 ? errors.join('; ') : null,
  };
}

export async function parseInventory(member: unknown): Promise<InventoryData> {
  const [armor, equipment, inventory, enderChest, wardrobe, accessoryBag] =
    await Promise.all([
      decodeSection(member, 'armor'),
      decodeSection(member, 'equipment'),
      decodeSection(member, 'inventory'),
      decodeSection(member, 'enderChest'),
      decodeWardrobe(member),
      decodeSection(member, 'accessoryBag'),
    ]);

  return { armor, equipment, inventory, enderChest, wardrobe, accessoryBag };
}
