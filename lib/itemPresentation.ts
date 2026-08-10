import type { NormalizedEnchantment, SkyBlockRarity } from './parseInventory';

export const RARITY_TEXT: Record<SkyBlockRarity, string> = {
  COMMON: 'text-neutral-300', UNCOMMON: 'text-green-400', RARE: 'text-blue-400',
  EPIC: 'text-fuchsia-400', LEGENDARY: 'text-amber-400', MYTHIC: 'text-pink-400',
  DIVINE: 'text-cyan-300', SPECIAL: 'text-red-400', 'VERY SPECIAL': 'text-red-300',
};

export const RARITY_BORDER: Record<SkyBlockRarity, string> = {
  COMMON: 'border-neutral-500/70', UNCOMMON: 'border-green-500/70', RARE: 'border-blue-500/70',
  EPIC: 'border-fuchsia-500/70', LEGENDARY: 'border-amber-500/70', MYTHIC: 'border-pink-500/70',
  DIVINE: 'border-cyan-400/70', SPECIAL: 'border-red-500/70', 'VERY SPECIAL': 'border-red-400/70',
};

const MAX_LEVELS: Record<string, number> = {
  aqua_affinity: 1, big_brain: 5, blast_protection: 7, caster: 6, chance: 5,
  cleave: 6, compact: 10, counter_strike: 5, cubism: 6, cultivation: 10,
  depth_strider: 3, dragon_hunter: 5, efficiency: 10, expertise: 10,
  feather_falling: 10, fire_aspect: 3, fortune: 4, frail: 6, growth: 7,
  harvesting: 6, infinite_quiver: 10, looting: 5, luck: 7, luck_of_the_sea: 6,
  lure: 6, magnet: 6, mana_vampire: 10, overload: 5, power: 7,
  pristine: 5, projectile_protection: 7, protection: 7, rainbow: 1,
  reflection: 5, rejuvenate: 5, respiration: 3, scavenger: 6, sharpness: 7,
  smite: 7, sugar_rush: 3, syphon: 5, thunderbolt: 7, thunderlord: 7,
  transylvanian: 5, true_protection: 1, turbo_cacti: 5, turbo_cane: 5,
  turbo_carrot: 5, turbo_cocoa: 5, turbo_melon: 5, turbo_mushrooms: 5,
  turbo_potato: 5, turbo_pumpkin: 5, turbo_warts: 5, turbo_wheat: 5,
  vicious: 5,
};

export function isMaxedEnchantment(enchantment: NormalizedEnchantment): boolean {
  const id = enchantment.id.toLowerCase();
  const maximum = MAX_LEVELS[id] ?? (id.startsWith('ultimate_') ? 5 : 5);
  return enchantment.level >= maximum;
}

export function displayItemId(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, character => character.toUpperCase());
}
