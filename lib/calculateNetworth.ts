import { inventoryMetadataKey, type InventoryOwnershipItem } from './inventoryContext.ts';
import { marketPriceFor, petMarketKey, type MarketPrices } from './marketPrices.ts';
import type { PetProgress } from './parsePets.ts';

export interface NetworthBreakdown {
  source: 'skyhelper' | 'local-fallback';
  skyhelperTopPercent: number | null;
  total: number;
  liquid: number;
  inventory: number;
  pets: number;
  soulboundItems: number;
  purse: number;
  bank: number;
  pricedInventorySlots: number;
  unpricedInventorySlots: number;
  pricedPets: number;
  unpricedPets: number;
  pricedSoulboundSlots: number;
}

interface SkyhelperCategory {
  total?: unknown;
  unsoulboundTotal?: unknown;
  items?: unknown;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function percentValue(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value <= 0) return null;
  if (value <= 1) return Math.round(value * 1000) / 10;
  if (value <= 100) return Math.round(value * 10) / 10;
  return null;
}

function extractSkyhelperTopPercent(payload: unknown): number | null {
  const root = record(payload);
  if (!root) return null;
  const directKeys = [
    'topPercent',
    'top_percentage',
    'networthTopPercent',
    'networth_top_percent',
    'percentile',
    'percentage',
  ];
  for (const key of directKeys) {
    const value = percentValue(root[key]);
    if (value !== null) return value;
  }
  for (const key of ['rank', 'ranking', 'leaderboard', 'position']) {
    const nested = record(root[key]);
    const nestedPercent = percentValue(nested?.topPercent ?? nested?.top_percentage ?? nested?.percentile ?? nested?.percentage);
    if (nestedPercent !== null) return nestedPercent;
  }
  return null;
}

/** Converts the same complete SkyHelper result used by SkyCrypt into our UI shape. */
export function parseSkyhelperNetworth(payload: unknown): NetworthBreakdown | null {
  const root = record(payload);
  const types = record(root?.types);
  const total = safeCoins(root?.networth as number | null);
  if (!types || total <= 0) return null;

  let inventory = 0;
  let pets = 0;
  let soulboundItems = 0;
  let pricedInventorySlots = 0;
  let pricedPets = 0;
  for (const [category, rawCategory] of Object.entries(types)) {
    const data = record(rawCategory) as SkyhelperCategory | null;
    const categoryTotal = safeCoins(data?.total as number | null);
    const unsoulbound = safeCoins(data?.unsoulboundTotal as number | null);
    const count = Array.isArray(data?.items) ? data.items.length : 0;
    if (category === 'pets') {
      pets += categoryTotal;
      pricedPets += count;
    } else {
      inventory += categoryTotal;
      soulboundItems += Math.max(0, categoryTotal - unsoulbound);
      pricedInventorySlots += count;
    }
  }

  const purse = safeCoins(root?.purse as number | null);
  const bank = safeCoins(root?.bank as number | null) + safeCoins(root?.personalBank as number | null);
  return {
    source: 'skyhelper', skyhelperTopPercent: extractSkyhelperTopPercent(root), total, liquid: purse + bank, inventory, pets, soulboundItems,
    purse, bank, pricedInventorySlots, unpricedInventorySlots: 0, pricedPets,
    unpricedPets: 0, pricedSoulboundSlots: 0,
  };
}

export interface NetworthInput {
  purse: number | null;
  bank: number | null;
  inventoryItems: readonly InventoryOwnershipItem[];
  itemMetadata: Readonly<Record<string, { marketPrice: number | null }>>;
  pets: readonly PetProgress[];
  marketPrices: MarketPrices;
}

function safeCoins(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function calculateNetworth(input: NetworthInput): NetworthBreakdown {
  const purse = safeCoins(input.purse);
  const bank = safeCoins(input.bank);
  let inventory = 0;
  let pricedInventorySlots = 0;
  let unpricedInventorySlots = 0;
  let soulboundItems = 0;
  let pricedSoulboundSlots = 0;

  for (const item of input.inventoryItems) {
    const unitPrice = safeCoins(input.itemMetadata[inventoryMetadataKey(item)]?.marketPrice);
    if (unitPrice > 0) {
      const stackValue = unitPrice * Math.max(1, Math.floor(safeCoins(item.count)));
      inventory += stackValue;
      pricedInventorySlots += 1;
      if (item.lore.some((line) => line.toUpperCase().includes('SOULBOUND'))) {
        soulboundItems += stackValue;
        pricedSoulboundSlots += 1;
      }
    } else {
      unpricedInventorySlots += 1;
    }
  }

  let pets = 0;
  let pricedPets = 0;
  let unpricedPets = 0;
  for (const pet of input.pets) {
    const base = marketPriceFor(petMarketKey(pet.type, pet.tier), input.marketPrices)?.unitPrice;
    const heldItem = marketPriceFor(pet.heldItem, input.marketPrices)?.unitPrice;
    const skin = marketPriceFor(pet.skinId, input.marketPrices)?.unitPrice;
    const petValue = safeCoins(base) + safeCoins(heldItem) + safeCoins(skin);
    if (petValue > 0) {
      pets += petValue;
      pricedPets += 1;
    } else {
      unpricedPets += 1;
    }
  }

  const liquid = purse + bank;
  return {
    source: 'local-fallback',
    skyhelperTopPercent: null,
    total: liquid + inventory + pets,
    liquid,
    inventory,
    pets,
    soulboundItems,
    purse,
    bank,
    pricedInventorySlots,
    unpricedInventorySlots,
    pricedPets,
    unpricedPets,
    pricedSoulboundSlots,
  };
}
