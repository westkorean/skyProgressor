'use client';

import { useState } from 'react';
import type { InventoryData, InventoryItem, InventorySection } from '@/lib/parseInventory';
import type { OwnedItemMetadata } from '@/lib/ownedItemMetadata';
import PixelLock from '@/components/PixelLock';
import { inventoryMetadataKey } from '@/lib/inventoryContext';
import InventoryItemImage from '@/components/InventoryItemImage';
import { displayItemId, isMaxedEnchantment, RARITY_BORDER, RARITY_TEXT } from '@/lib/itemPresentation';

type StorageGroup = { label: string; section: InventorySection };

function occupied(items: readonly InventoryItem[]): InventoryItem[] {
  return items.filter((item) => item.skyblockId !== null || item.displayName !== null || item.id !== null);
}

function itemName(item: InventoryItem): string {
  if (item.displayName) return item.displayName;
  if (item.skyblockId) return displayItemId(item.skyblockId);
  return 'Unknown item';
}

function ItemSlot({ item, section, metadata }: { item: InventoryItem; section: InventorySection; metadata: Record<string, OwnedItemMetadata> }) {
  const enriched = metadata[inventoryMetadataKey({
    section: section.name,
    slot: item.slot ?? item.index,
    skyblockId: item.skyblockId,
  })];
  const name = enriched?.name ?? itemName(item);

  return (
    <article data-item-slot tabIndex={0} className={`group relative flex aspect-square min-h-16 items-center justify-center rounded-lg border bg-neutral-900 p-2 outline-none hover:z-30 hover:border-emerald-500/70 hover:bg-neutral-800 focus:z-30 focus:border-emerald-500/70 ${item.rarity ? RARITY_BORDER[item.rarity] : 'border-neutral-700'}`}>
      {item.rarity && <span aria-hidden="true" className={`absolute left-1 top-1 text-[7px] ${RARITY_TEXT[item.rarity]}`}>◆</span>}
      <InventoryItemImage item={item} metadata={enriched} />
      {(item.count ?? 1) > 1 && <span className="absolute bottom-1 right-1 text-[10px] font-bold text-white drop-shadow">{item.count}</span>}
      <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-40 hidden w-72 -translate-x-1/2 rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-left shadow-2xl group-hover:block group-focus:block">
        <div className="text-sm font-semibold text-neutral-100">{name}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-neutral-400">
          {item.rarity && <span className={RARITY_TEXT[item.rarity]}>{item.rarity}</span>}
          <span>Slot {item.slot ?? item.index}</span>
          {item.stars > 0 && <span>{item.stars} stars</span>}
        </div>
        <div className="mt-1 text-xs text-amber-300">Primary value: {enriched?.marketPrice == null ? 'Unavailable' : `${Math.round(enriched.marketPrice * Math.max(1, item.count ?? 1)).toLocaleString()} coins${(item.count ?? 1) > 1 ? ` (${Math.round(enriched.marketPrice).toLocaleString()} each)` : ''}`}</div>
        <div className="text-[11px] text-neutral-500">Raw craft: {enriched?.rawCraftCost == null ? 'N/A' : `${Math.round(enriched.rawCraftCost).toLocaleString()} coins`} · Lowest BIN: {enriched?.lowestBinPrice == null ? 'N/A' : `${Math.round(enriched.lowestBinPrice).toLocaleString()} coins`}</div>
        {item.reforge && <div className="mt-1 text-xs text-neutral-400">Reforge: {item.reforge}</div>}
        {item.enchantments.length > 0 && <div className="mt-1 flex flex-wrap gap-x-1 text-xs text-neutral-500">Enchantments: {item.enchantments.map((value) => <span key={value.id} className={isMaxedEnchantment(value) ? 'max-enchantment-glow rounded px-1' : ''}>{displayItemId(value.id)} {value.level}</span>)}</div>}
        {item.lore.length > 0 && <div className="mt-2 max-h-52 overflow-hidden whitespace-pre-line border-t border-neutral-800 pt-2 text-xs text-neutral-400">{item.lore.join('\n')}</div>}
        {enriched?.wikiSummary && <p className="mt-2 line-clamp-3 text-xs text-neutral-500">{enriched.wikiSummary}</p>}
      </div>
      <span className="sr-only">{name}</span>
    </article>
  );
}

function EmptySlot({ slot }: { slot: number }) {
  return <div aria-label={`Empty slot ${slot}`} className="aspect-square min-h-12 rounded-md border border-neutral-800 bg-neutral-900/45 shadow-[inset_1px_1px_0_rgba(255,255,255,0.04)]" />;
}

function InGameStorageGrid({ items, section, metadata, slotOffset = 0, minimumSlots: requestedMinimum }: { items: InventoryItem[]; section: InventorySection; metadata: Record<string, OwnedItemMetadata>; slotOffset?: number; minimumSlots?: number }) {
  const bySlot = new Map(items.map((item) => [(item.slot ?? item.index) - slotOffset, item]));
  const highestSlot = Math.max(-1, ...items.map((item) => (item.slot ?? item.index) - slotOffset));
  const minimumSlots = requestedMinimum ?? (section.name === 'inventory' ? 36 : 9);
  const slotCount = Math.max(minimumSlots, Math.ceil((highestSlot + 1) / 9) * 9);
  const naturalOrder = Array.from({ length: slotCount }, (_, slot) => slot);
  const displayOrder = section.name === 'inventory' && slotCount >= 36
    ? [...naturalOrder.slice(9, 36), ...naturalOrder.slice(0, 9), ...naturalOrder.slice(36)]
    : naturalOrder;

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-9 gap-1.5 rounded-xl border-2 border-neutral-700 bg-neutral-950 p-2.5 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.025)]">
      {displayOrder.map((slot, displayIndex) => {
        const item = bySlot.get(slot);
        const hotbarRow = section.name === 'inventory' && displayIndex >= 27 && displayIndex < 36;
        return (
          <div key={slot} className={hotbarRow ? 'mt-2' : ''}>
            {item ? <ItemSlot item={item} section={section} metadata={metadata} /> : <EmptySlot slot={slot} />}
          </div>
        );
      })}
    </div>
  );
}

function EnderChestPages({ items, section, metadata }: { items: InventoryItem[]; section: InventorySection; metadata: Record<string, OwnedItemMetadata> }) {
  const highestSlot = Math.max(0, ...groupSlots(section).map(item => item.slot ?? item.index));
  const pageCount = Math.max(1, Math.ceil((highestSlot + 1) / 45));
  return <div className="space-y-2">{Array.from({ length: pageCount }, (_, page) => {
    const start = page * 45;
    const pageItems = items.filter(item => (item.slot ?? item.index) >= start && (item.slot ?? item.index) < start + 45);
    return <details key={page} className="rounded-lg border border-neutral-800 bg-neutral-900/50" open={page === 0}>
      <summary className="flex cursor-pointer list-none justify-between p-3 text-sm"><span>Ender Chest Page {page + 1}</span><span className="text-neutral-500">{pageItems.length} items</span></summary>
      <div className="border-t border-neutral-800 p-3"><InGameStorageGrid items={pageItems} section={section} metadata={metadata} slotOffset={start} minimumSlots={45} /></div>
    </details>;
  })}</div>;
}

function groupSlots(section: InventorySection): InventoryItem[] {
  return occupied(section.items);
}

const WARDROBE_SLOT_LABELS = ['Helmet', 'Chestplate', 'Leggings', 'Boots'] as const;
const EQUIPMENT_WARDROBE_SLOT_LABELS = ['Necklace', 'Cloak', 'Belt', 'Gloves'] as const;

function LoadoutSets({ items, section, metadata, labels, title }: { items: InventoryItem[]; section: InventorySection; metadata: Record<string, OwnedItemMetadata>; labels: readonly string[]; title: string }) {
  const sets = new Map<number, Map<number, InventoryItem>>();
  for (let setIndex = 0; setIndex < (section.loadoutCount ?? 0); setIndex += 1) sets.set(setIndex, new Map());
  for (const item of items) {
    const position = item.slot ?? item.index;
    const setIndex = Math.floor(position / 4);
    const pieceIndex = position % 4;
    const set = sets.get(setIndex) ?? new Map<number, InventoryItem>();
    set.set(pieceIndex, item);
    sets.set(setIndex, set);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[...sets.entries()].sort(([left], [right]) => left - right).map(([setIndex, set]) => (
        <section key={setIndex} className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-3">
          <h4 className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wide text-neutral-400"><span>{title} {setIndex + 1}</span>{section.selectedSlot === setIndex && <span className="text-emerald-400">Active</span>}</h4>
          <div className="grid grid-cols-4 gap-2">
            {labels.map((label, pieceIndex) => {
              const item = set.get(pieceIndex);
              return item ? (
                <div key={label} className="min-w-0">
                  <ItemSlot item={item} section={section} metadata={metadata} />
                  <div className="mt-1 truncate text-center text-[9px] uppercase tracking-wide text-neutral-600">{label}</div>
                </div>
              ) : (
                <div key={label} className="min-w-0">
                  <div className="flex aspect-square min-h-16 items-center justify-center rounded-lg border border-dashed border-neutral-800 bg-neutral-950/60 text-lg text-neutral-700">—</div>
                  <div className="mt-1 truncate text-center text-[9px] uppercase tracking-wide text-neutral-600">{label}</div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function StorageGroupView({ group, query, metadata }: { group: StorageGroup; query: string; metadata: Record<string, OwnedItemMetadata> }) {
  const allItems = occupied(group.section.items);
  const items = query
    ? allItems.filter((item) => `${itemName(item)} ${item.skyblockId ?? ''}`.toLowerCase().includes(query))
    : allItems;

  return (
    <details className="rounded-xl border border-neutral-800 bg-neutral-950" open={query ? items.length > 0 : undefined}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
        <span className="font-semibold text-neutral-200">{group.label}</span>
        <span className="text-xs text-neutral-500">
          {group.section.available
            ? query ? `${items.length} matching / ${allItems.length} occupied` : `${allItems.length} occupied / ${group.section.items.length} slots`
            : 'Not returned by Hypixel'}
        </span>
      </summary>
      <div className="border-t border-neutral-800 p-4">
        {!group.section.available ? (
          <div className="flex items-center gap-3 text-sm text-neutral-500"><PixelLock reason="Enable Inventory API access in Hypixel SkyBlock settings, then refresh this profile." />This storage section was not returned by Hypixel.</div>
        ) : group.section.error ? (
          <p className="text-sm text-red-400">This inventory payload could not be decoded: {group.section.error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-neutral-500">{query ? 'No matching items.' : 'No occupied slots.'}</p>
        ) : group.section.name === 'wardrobe' ? (
          <LoadoutSets items={items} section={group.section} metadata={metadata} labels={WARDROBE_SLOT_LABELS} title="Armor Set" />
        ) : group.section.name === 'equipmentWardrobe' ? (
          <LoadoutSets items={items} section={group.section} metadata={metadata} labels={EQUIPMENT_WARDROBE_SLOT_LABELS} title="Equipment Set" />
        ) : group.section.name === 'enderChest' ? (
          <EnderChestPages items={items} section={group.section} metadata={metadata} />
        ) : ['inventory', 'enderChest', 'accessoryBag'].includes(group.section.name) ? (
          <InGameStorageGrid items={items} section={group.section} metadata={metadata} />
        ) : (
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-12">
            {items.map((item) => <ItemSlot key={`${group.section.name}-${item.index}`} item={item} section={group.section} metadata={metadata} />)}
          </div>
        )}
      </div>
    </details>
  );
}

export default function InventoryStorageSection({ inventory, metadata }: { inventory: InventoryData; metadata: Record<string, OwnedItemMetadata> }) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const groups: StorageGroup[] = [
    { label: 'Active Armor', section: inventory.armor },
    { label: 'Active Equipment', section: inventory.equipment },
    { label: 'Equipment Wardrobes', section: inventory.equipmentWardrobe },
    { label: 'Main Inventory', section: inventory.inventory },
    { label: 'Ender Chest', section: inventory.enderChest },
    { label: 'Wardrobe', section: inventory.wardrobe },
    { label: 'Accessory Bag', section: inventory.accessoryBag },
  ];
  const occupiedItems = groups.flatMap((group) => occupied(group.section.items));
  const totalQuantity = occupiedItems.reduce((sum, item) => sum + Math.max(0, item.count ?? 1), 0);
  const availableSections = groups.filter((group) => group.section.available).length;

  return (
    <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Inventory Storage</h2>
          <p className="mt-1 text-sm text-neutral-500">Hover an item to inspect its name and details</p>
        </div>
        <div className="text-right text-xs text-neutral-500">
          <div>{occupiedItems.length} occupied slots · {totalQuantity.toLocaleString()} items</div>
          <div>{availableSections} / {groups.length} sections returned by Hypixel</div>
        </div>
      </div>
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search owned items by name or SkyBlock ID"
        aria-label="Search owned inventory items"
        className="my-4 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      />
      <div className="space-y-3">
        {groups.map((group) => <StorageGroupView key={group.section.name} group={group} query={query} metadata={metadata} />)}
      </div>
    </section>
  );
}
