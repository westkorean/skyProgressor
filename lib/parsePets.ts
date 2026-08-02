export interface PetProgress {
  type: string;
  tier: string;
  exp: number;
  heldItem: string | null;
  candyUsed: number;
  tierColor: string;
  headUuid?: string | null;
  skinId: string | null;
  active: boolean;
  displayName: string;
  level: number;
}

const PET_RARITY_ORDER = [
  'VERY_SPECIAL',
  'SPECIAL',
  'MYTHIC',
  'LEGENDARY',
  'EPIC',
  'RARE',
  'UNCOMMON',
  'COMMON',
];

const PET_RARITY_COLORS: Record<string, string> = {
  MYTHIC: '#d946ef',
  LEGENDARY: '#f59e0b',
  EPIC: '#7c3aed',
  RARE: '#0ea5e9',
  UNCOMMON: '#22c55e',
  COMMON: '#9ca3af',
  SPECIAL: '#ec4899',
  VERY_SPECIAL: '#ef4444',
};

// Source: SkyCrypt (MIT), src/constants/pets.js. The first 119 entries are
// the normal rarity-offset table; Golden Dragon extends it to level 200.
const STANDARD_PET_LEVEL_XP = [
  100, 110, 120, 130, 145, 160, 175, 190, 210, 230, 250, 275, 300, 330,
  360, 400, 440, 490, 540, 600, 660, 730, 800, 880, 960, 1050, 1150,
  1260, 1380, 1510, 1650, 1800, 1960, 2130, 2310, 2500, 2700, 2920,
  3160, 3420, 3700, 4000, 4350, 4750, 5200, 5700, 6300, 7000, 7800,
  8700, 9700, 10800, 12000, 13300, 14700, 16200, 17800, 19500, 21300,
  23200, 25200, 27400, 29800, 32400, 35200, 38200, 41400, 44800,
  48400, 52200, 56200, 60400, 64800, 69400, 74200, 79200, 84700,
  90700, 97200, 104200, 111700, 119700, 128200, 137200, 146700, 156700,
  167700, 179700, 192700, 206700, 221700, 237700, 254700, 272700,
  291700, 311700, 333700, 357700, 383700, 411700, 441700, 476700,
  516700, 561700, 611700, 666700, 726700, 791700, 861700, 936700,
  1016700, 1101700, 1191700, 1286700, 1386700, 1496700, 1616700,
  1746700, 1886700,
];

const PET_LEVEL_XP = [
  ...STANDARD_PET_LEVEL_XP,
  0,
  5555,
  ...Array<number>(98).fill(1886700),
];

const PET_RARITY_OFFSET: Record<string, number> = {
  COMMON: 0,
  UNCOMMON: 6,
  RARE: 11,
  EPIC: 16,
  LEGENDARY: 20,
  MYTHIC: 20,
  SPECIAL: 20,
  VERY_SPECIAL: 20,
};

export function getPetLevel(exp: unknown, tier: unknown, type: unknown): number {
  const safeExp = typeof exp === 'number' && Number.isFinite(exp) ? Math.max(0, exp) : 0;
  const normalizedTier = typeof tier === 'string' ? tier.toUpperCase() : 'COMMON';
  const normalizedType = typeof type === 'string' ? type.toUpperCase() : '';
  const maxLevel = normalizedType === 'GOLDEN_DRAGON' ? 200 : 100;
  const offset = PET_RARITY_OFFSET[normalizedTier] ?? 0;
  const levels = PET_LEVEL_XP.slice(offset, offset + maxLevel - 1);
  let spent = 0;
  let level = 1;

  for (const required of levels) {
    if (spent + required > safeExp) break;
    spent += required;
    level += 1;
  }

  return Math.min(maxLevel, level);
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

export function parsePets(member: unknown): PetProgress[] {
  const memberRecord = record(member);
  const petsData = record(memberRecord?.pets_data);
  const pets = Array.isArray(petsData?.pets) ? petsData.pets : [];

  return pets
    .map((value): PetProgress => {
      const pet = record(value) ?? {};
      const tier = String(pet.tier ?? 'COMMON').toUpperCase();
      const skin = record(pet.skin);
      const headUuid =
        pet.uuid ??
        pet.pet_id ??
        pet.petUuid ??
        pet.pet_uuid ??
        pet.skinUuid ??
        skin?.uuid ??
        null;
      const type = typeof pet.type === 'string' ? pet.type.toUpperCase() : 'UNKNOWN';
      const exp = typeof pet.exp === 'number' && Number.isFinite(pet.exp) ? pet.exp : 0;
      return {
        type,
        tier,
        exp,
        heldItem: typeof pet.heldItem === 'string' ? pet.heldItem : null,
        candyUsed: typeof pet.candyUsed === 'number' ? pet.candyUsed : 0,
        tierColor: PET_RARITY_COLORS[tier] ?? PET_RARITY_COLORS.COMMON,
        headUuid: typeof headUuid === 'string' ? headUuid : null,
        skinId: typeof pet.skin === 'string' ? pet.skin : null,
        active: pet.active === true,
        displayName: String(
          pet.display_name ?? pet.name ?? pet.type ?? 'Unknown'
        )
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (char: string) => char.toUpperCase()),
        level: getPetLevel(exp, tier, type),
      };
    })
    .sort((a: PetProgress, b: PetProgress) => {
      const rankA = PET_RARITY_ORDER.indexOf(a.tier);
      const rankB = PET_RARITY_ORDER.indexOf(b.tier);
      const normalizedA = rankA === -1 ? PET_RARITY_ORDER.length : rankA;
      const normalizedB = rankB === -1 ? PET_RARITY_ORDER.length : rankB;

      if (a.active !== b.active) return a.active ? -1 : 1;
      if (normalizedA !== normalizedB) return normalizedA - normalizedB;
      if (a.level !== b.level) return b.level - a.level;
      return b.exp - a.exp;
    });
}
