'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getPetTextureHash } from '@/lib/petTextures';

const COLLECTION_IMAGE_IDS: Record<string, string> = {
  'INK_SACK:3': 'COCOA_BEANS',
  'INK_SACK:4': 'LAPIS_LAZULI',
  'SAND:1': 'RED_SAND',
  'LOG:1': 'SPRUCE_LOG',
  'LOG:2': 'BIRCH_LOG',
  'LOG:3': 'JUNGLE_LOG',
  LOG_2: 'ACACIA_LOG',
  'LOG_2:1': 'DARK_OAK_LOG',
  'RAW_FISH:1': 'SALMON',
  'RAW_FISH:2': 'TROPICAL_FISH',
  'RAW_FISH:3': 'PUFFERFISH',
  DOUBLE_PLANT: 'SUNFLOWER',
  MUSHROOM_COLLECTION: 'RED_MUSHROOM',
  GEMSTONE_COLLECTION: 'FLAWED_RUBY_GEM',
  BOSS_BONZO: 'GOLD_BONZO_HEAD',
  BOSS_SCARF: 'GOLD_SCARF_HEAD',
  BOSS_PROFESSOR: 'GOLD_PROFESSOR_HEAD',
  BOSS_THORN: 'GOLD_THORN_HEAD',
  BOSS_LIVID: 'GOLD_LIVID_HEAD',
  BOSS_SADAN: 'GOLD_SADAN_HEAD',
  BOSS_NECRON: 'GOLD_NECRON_HEAD',
};

export default function CollectionItemImage({ collectionId, name }: { collectionId: string; name: string }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const kuudraTexture = collectionId === 'BOSS_KUUDRA' ? getPetTextureHash('KUUDRA') : null;
  const rendererId = COLLECTION_IMAGE_IDS[collectionId] ?? collectionId;
  const sources = [
    kuudraTexture ? `https://mc-heads.net/head/${kuudraTexture}/128` : null,
    `https://sky.shiiyu.moe/api/item/${encodeURIComponent(rendererId)}`,
    rendererId !== collectionId ? `https://sky.shiiyu.moe/api/item/${encodeURIComponent(collectionId)}` : null,
  ].filter((source): source is string => Boolean(source));
  const source = sources[sourceIndex];

  return source ? (
    <Image
      src={source}
      alt={`${name} collection item`}
      width={48}
      height={48}
      unoptimized
      onError={() => setSourceIndex((current) => current + 1)}
      className="h-12 w-12 shrink-0 object-contain [image-rendering:pixelated]"
    />
  ) : (
    <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-neutral-700 bg-neutral-900 text-lg text-neutral-500">?</span>
  );
}
