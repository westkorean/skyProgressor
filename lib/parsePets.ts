export interface PetProgress {
  type: string;
  tier: string;
  exp: number;
  level: number;
  heldItem: string | null;
  candyUsed: number;
}

export function parsePets(member:any): PetProgress[] {

  const pets = Array.isArray(member?.pets_data?.pets)
    ? member.pets_data.pets
    : [];


  return pets.map((pet:any)=>{

    return {

      type: pet.type ?? "UNKNOWN",

      tier: pet.tier ?? "COMMON",

      exp: pet.exp ?? 0,

      level: pet.level?.level ?? 1,

      heldItem:
        pet.heldItem ?? null,

      candyUsed:
        pet.candyUsed ?? 0

    };

  });

}