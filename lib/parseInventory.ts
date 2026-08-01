import { parse, type Compound, type NBT, type Tags, TagType } from 'prismarine-nbt';

export type InventorySectionName =
  | 'armor'
  | 'equipment'
  | 'inventory'
  | 'enderChest'
  | 'wardrobe';

export interface InventoryItem {
  index: number;
  slot: number | null;
  id: number | string | null;
  count: number | null;
  damage: number | null;
  skyblockId: string | null;
  displayName: string | null;
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
}

type UnknownRecord = Record<string, unknown>;

const SECTION_PATHS: Record<InventorySectionName, readonly string[]> = {
  armor: ['inventory', 'inv_armor'],
  equipment: ['inventory', 'equipment_contents'],
  inventory: ['inventory', 'inv_contents'],
  enderChest: ['inventory', 'ender_chest_contents'],
  wardrobe: ['inventory', 'wardrobe_contents'],
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

function inventoryBlob(member: unknown, path: readonly string[]): string | null {
  const container = record(valueAtPath(member, path));
  return typeof container?.data === 'string' && container.data.trim()
    ? container.data
    : null;
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

function parseItem(item: Compound, index: number): InventoryItem {
  const itemTag = nestedCompound(item, 'tag');
  const extraAttributes = itemTag
    ? nestedCompound(itemTag, 'ExtraAttributes')
    : null;
  const display = itemTag ? nestedCompound(itemTag, 'display') : null;

  return {
    index,
    slot: numberTag(item.value.Slot),
    id: numberTag(item.value.id) ?? stringTag(item.value.id),
    count: numberTag(item.value.Count),
    damage: numberTag(item.value.Damage),
    skyblockId: extraAttributes
      ? stringTag(extraAttributes.value.id)
      : null,
    displayName: display ? stringTag(display.value.Name) : null,
    nbt: item,
  };
}

function itemsFromRoot(root: NBT): InventoryItem[] {
  const itemList = tag(root.value.i, TagType.List);
  if (!itemList || itemList.value.type !== TagType.Compound) return [];
  if (!Array.isArray(itemList.value.value)) return [];

  return itemList.value.value.flatMap((value, index) => {
    const item = tag(value as Tags[TagType], TagType.Compound);
    return item ? [parseItem(item, index)] : [];
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
  const path = SECTION_PATHS[name];
  const sourcePath = path.join('.');
  const encodedData = inventoryBlob(member, path);
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

export async function parseInventory(member: unknown): Promise<InventoryData> {
  const [armor, equipment, inventory, enderChest, wardrobe] =
    await Promise.all([
      decodeSection(member, 'armor'),
      decodeSection(member, 'equipment'),
      decodeSection(member, 'inventory'),
      decodeSection(member, 'enderChest'),
      decodeSection(member, 'wardrobe'),
    ]);

  return { armor, equipment, inventory, enderChest, wardrobe };
}
