import type { InventoryData, InventoryItem } from '@/lib/parseInventory';
import type { OwnedItemMetadata } from '@/lib/ownedItemMetadata';
import { inventoryMetadataKey } from '@/lib/inventoryContext';
import InventoryItemImage from '@/components/InventoryItemImage';
import PixelLock from '@/components/PixelLock';

type EquipmentSlot = {
  label: string;
  item: InventoryItem | null;
};

const ARMOR_SLOTS = ['Boots', 'Leggings', 'Chestplate', 'Helmet'] as const;
const EQUIPMENT_SLOTS = ['Necklace', 'Cloak', 'Belt', 'Gloves'] as const;

function itemAt(items: InventoryItem[], index: number): InventoryItem | null {
  const item = items.find((entry) => entry.slot === index) ?? items.find((entry) => entry.index === index);
  return item && (item.skyblockId || item.displayName) ? item : null;
}

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

function gemstoneSummary(gemstones: Record<string, unknown>): string[] {
  return Object.entries(gemstones).map(([slot, value]) => {
    if (typeof value === 'string' || typeof value === 'number') return `${titleCase(slot)}: ${String(value)}`;
    return titleCase(slot);
  });
}

function EquipmentItemCard({ slot, metadata, section }: { slot: EquipmentSlot; metadata: Record<string, OwnedItemMetadata>; section: 'armor' | 'equipment' }) {
  const { item } = slot;
  const gems = item ? gemstoneSummary(item.gemstones) : [];
  const enriched = item ? metadata[inventoryMetadataKey({ section, slot: item.slot ?? item.index, skyblockId: item.skyblockId })] : undefined;

  return (
    <article data-item-slot={item ? true : undefined} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 min-h-44">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{slot.label}</div>
      {!item ? (
        <div className="mt-3 text-sm text-neutral-600">Empty</div>
      ) : (
        <>
          <div className="mt-2 flex items-center gap-3">
            <InventoryItemImage item={item} metadata={enriched} className="h-14 w-14 shrink-0" />
            <h3 className="font-semibold text-neutral-100">{item.displayName || titleCase(item.skyblockId ?? 'Unknown item')}</h3>
          </div>
          <div className="mt-1 text-xs text-neutral-400">{item.rarity ?? 'Unknown rarity'}</div>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <span className="text-neutral-500">Stars</span><span>{item.stars || 'None'}</span>
            <span className="text-neutral-500">Reforge</span><span>{item.reforge ? titleCase(item.reforge) : 'None'}</span>
            <span className="text-neutral-500">Dungeon level</span><span>{item.dungeonLevel ?? 'None'}</span>
          </div>
          <div className="mt-3 text-xs">
            <span className="text-neutral-500">Gemstones: </span>
            <span className="text-neutral-300">{gems.length ? gems.join(', ') : 'None'}</span>
          </div>
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer text-neutral-400 hover:text-neutral-200">Enchantments ({item.enchantments.length})</summary>
            <div className="mt-2 space-y-1 text-neutral-300">
              {item.enchantments.length
                ? item.enchantments.map((enchantment) => <div key={enchantment.id}>{titleCase(enchantment.id)} {enchantment.level}</div>)
                : <div>None</div>}
            </div>
          </details>
        </>
      )}
    </article>
  );
}

export default function EquipmentSection({ inventory, metadata }: { inventory: InventoryData; metadata: Record<string, OwnedItemMetadata> }) {
  const slots: Array<EquipmentSlot & { section: 'armor' | 'equipment' }> = [
    ...ARMOR_SLOTS.map((label, index) => ({ label, item: itemAt(inventory.armor.items, index), section: 'armor' as const })).reverse(),
    ...EQUIPMENT_SLOTS.map((label, index) => ({ label, item: itemAt(inventory.equipment.items, index), section: 'equipment' as const })),
  ];

  const unavailable = !inventory.armor.available && !inventory.equipment.available;

  return (
    <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="text-xl font-semibold">Equipment</h2>
      <p className="mt-1 mb-4 text-sm text-neutral-500">Current armor and wearable equipment</p>
      {unavailable ? (
        <div className="flex items-center gap-3 text-sm text-neutral-500"><PixelLock reason="Enable Inventory API access in Hypixel SkyBlock settings, then refresh this profile." />Equipment data is unavailable.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {slots.map((slot) => <EquipmentItemCard key={slot.label} slot={slot} section={slot.section} metadata={metadata} />)}
        </div>
      )}
    </section>
  );
}
