export interface PetProgress {
  type: string;
  tier: string;
  exp: number;
  heldItem: string | null;
  candyUsed: number;
}

export function parsePets(member: any): PetProgress[] {
  const pets = Array.isArray(member?.pets_data?.pets)
    ? member.pets_data.pets
    : [];

  return pets.map((pet: any) => ({
    type: pet.type ?? 'UNKNOWN',
    tier: pet.tier ?? 'COMMON',
    exp: pet.exp ?? 0,
    heldItem: pet.heldItem ?? null,
    candyUsed: pet.candyUsed ?? 0,
  }));
}