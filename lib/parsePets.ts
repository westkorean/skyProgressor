export interface PetProgress {
  type: string;
  tier: string;
  exp: number;
  heldItem: string | null;
  candyUsed: number;
  tierColor: string;
  headUuid?: string | null;
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

export function parsePets(member: any): PetProgress[] {
  const pets = Array.isArray(member?.pets_data?.pets)
    ? member.pets_data.pets
    : [];

  return pets
    .map((pet: any) => {
      const tier = String(pet.tier ?? 'COMMON').toUpperCase();
      const headUuid =
        pet.uuid ??
        pet.pet_id ??
        pet.petUuid ??
        pet.pet_uuid ??
        pet.skinUuid ??
        pet.skin?.uuid ??
        null;
      return {
        type: pet.type ?? 'UNKNOWN',
        tier,
        exp: pet.exp ?? 0,
        heldItem: pet.heldItem ?? null,
        candyUsed: pet.candyUsed ?? 0,
        tierColor: PET_RARITY_COLORS[tier] ?? PET_RARITY_COLORS.COMMON,
        headUuid,
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
