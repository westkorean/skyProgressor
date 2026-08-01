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
}

const PET_RARITY_ORDER = [
  'MYTHIC',
  'LEGENDARY',
  'EPIC',
  'RARE',
  'UNCOMMON',
  'COMMON',
  'SPECIAL',
];

const PET_RARITY_COLORS: Record<string, string> = {
  MYTHIC: '#d946ef',
  LEGENDARY: '#f59e0b',
  EPIC: '#7c3aed',
  RARE: '#0ea5e9',
  UNCOMMON: '#22c55e',
  COMMON: '#9ca3af',
  SPECIAL: '#ec4899',
};

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
      return {
        type: typeof pet.type === 'string' ? pet.type : 'UNKNOWN',
        tier,
        exp: typeof pet.exp === 'number' ? pet.exp : 0,
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
      };
    })
    .sort((a: PetProgress, b: PetProgress) => {
      const rankA = PET_RARITY_ORDER.indexOf(a.tier);
      const rankB = PET_RARITY_ORDER.indexOf(b.tier);
      const normalizedA = rankA === -1 ? PET_RARITY_ORDER.length : rankA;
      const normalizedB = rankB === -1 ? PET_RARITY_ORDER.length : rankB;

      if (normalizedA !== normalizedB) return normalizedA - normalizedB;
      return b.exp - a.exp;
    });
}
