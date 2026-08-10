import type { InventoryData, InventoryItem, InventorySectionName, SkyBlockRarity } from './parseInventory';

export interface InventoryOwnershipItem {
  section: InventorySectionName;
  slot: number;
  skyblockId: string | null;
  name: string | null;
  count: number;
  rarity: SkyBlockRarity | null;
  stars: number;
  reforge: string | null;
  dungeonLevel: number | null;
  lore: string[];
}

export interface InventoryOwnershipSection {
  available: boolean;
  error: boolean;
  totalSlots: number;
  occupiedSlots: number;
}

export interface InventoryOwnershipSummary {
  sections: Record<InventorySectionName, InventoryOwnershipSection>;
  items: InventoryOwnershipItem[];
}

export function inventoryMetadataKey(item: Pick<InventoryOwnershipItem, 'section' | 'slot' | 'skyblockId'>): string {
  return (item.skyblockId ?? `NBT_${item.section}_${item.slot}`).toUpperCase();
}

function isOccupied(item: InventoryItem): boolean {
  return item.skyblockId !== null || item.displayName !== null || item.id !== null;
}

export function createInventoryOwnershipSummary(inventory: InventoryData): InventoryOwnershipSummary {
  const sectionNames: InventorySectionName[] = [
    'armor', 'equipment', 'equipmentWardrobe', 'inventory', 'enderChest', 'wardrobe', 'accessoryBag',
  ];
  const items: InventoryOwnershipItem[] = [];
  const sections = {} as Record<InventorySectionName, InventoryOwnershipSection>;

  for (const sectionName of sectionNames) {
    const section = inventory[sectionName];
    const occupiedItems = section.items.filter(isOccupied);
    sections[sectionName] = {
      available: section.available,
      error: section.error !== null,
      totalSlots: section.items.length,
      occupiedSlots: occupiedItems.length,
    };
    for (const item of occupiedItems) {
      items.push({
        section: sectionName,
        slot: item.slot ?? item.index,
        skyblockId: item.skyblockId,
        name: item.displayName,
        count: item.count ?? 1,
        rarity: item.rarity,
        stars: item.stars,
        reforge: item.reforge,
        dungeonLevel: item.dungeonLevel,
        lore: item.lore.slice(0, 12),
      });
    }
  }

  return { sections, items };
}
