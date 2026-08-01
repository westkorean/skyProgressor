import petTextures from '@/data/petTextures.json';
import generatedTextures from '@/data/petTextures.generated.json';

type PetTextureEntry = {
  default?: unknown;
  skins?: unknown;
};

type GeneratedTextureEntry = {
  textureHash?: unknown;
};

type GeneratedSkinEntry = GeneratedTextureEntry & {
  petType?: unknown;
};

const HASH_PATTERN = /^[a-f0-9]{32,64}$/i;

function normalizeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

function verifiedHash(value: unknown): string | null {
  return typeof value === 'string' && HASH_PATTERN.test(value)
    ? value.toLowerCase()
    : null;
}

function skinIdCandidates(skinId: string): string[] {
  const candidates = [skinId];
  if (skinId.startsWith('PET_SKIN_ENDER_DRAGON_')) {
    candidates.push(skinId.replace('PET_SKIN_ENDER_DRAGON_', 'PET_SKIN_DRAGON_'));
  }
  return candidates;
}

export function getPetTextureHash(
  petType: string,
  skinId?: string | null
): string | null {
  try {
    const normalizedPetType = normalizeId(petType);
    if (!normalizedPetType) return null;

    const existingEntry = (petTextures as Record<string, PetTextureEntry>)[
      normalizedPetType
    ];
    const entry =
      existingEntry && typeof existingEntry === 'object' ? existingEntry : {};

    const normalizedSkinId = normalizeId(skinId);
    if (normalizedSkinId) {
      for (const candidate of skinIdCandidates(normalizedSkinId)) {
        const generatedSkin = (
          generatedTextures.skins as Record<string, GeneratedSkinEntry>
        )[candidate];
        const generatedPetType = normalizeId(generatedSkin?.petType);
        const generatedHash = verifiedHash(generatedSkin?.textureHash);
        if (generatedPetType === normalizedPetType && generatedHash) {
          return generatedHash;
        }

        if (entry.skins && typeof entry.skins === 'object') {
          const existingHash = verifiedHash(
            (entry.skins as Record<string, unknown>)[candidate]
          );
          if (existingHash) return existingHash;
        }
      }
    }

    const generatedDefault = (
      generatedTextures.defaults as Record<string, GeneratedTextureEntry>
    )[normalizedPetType];
    return (
      verifiedHash(generatedDefault?.textureHash) ?? verifiedHash(entry.default)
    );
  } catch {
    return null;
  }
}
