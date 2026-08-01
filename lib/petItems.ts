import catalog from '@/data/petItems.generated.json';

export type PetItemMetadata = {
  id: string;
  name: string;
  material: string;
  rarity: string | null;
  textureHash: string | null;
  imageUrl: string | null;
  wikiUrl: string;
};

const items = catalog.items as Record<string, PetItemMetadata>;

export function getPetItemMetadata(itemId?: string | null): PetItemMetadata | null {
  if (typeof itemId !== 'string') return null;
  const normalized = itemId.trim().toUpperCase();
  if (!normalized) return null;
  return items[normalized] ?? null;
}
