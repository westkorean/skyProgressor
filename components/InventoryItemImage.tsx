'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { InventoryItem } from '@/lib/parseInventory';
import type { OwnedItemMetadata } from '@/lib/ownedItemMetadata';

export default function InventoryItemImage({ item, metadata, className = 'h-11 w-11' }: { item: InventoryItem; metadata?: OwnedItemMetadata; className?: string }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const sources = [
    item.textureHash ? `https://mc-heads.net/head/${item.textureHash}/128` : null,
    item.skyblockId ? `https://sky.shiiyu.moe/api/item/${encodeURIComponent(item.skyblockId)}` : null,
    metadata?.imageUrl ?? null,
  ].filter((value, index, values): value is string => typeof value === 'string' && values.indexOf(value) === index);
  const imageUrl = sources[sourceIndex] ?? null;

  return imageUrl ? (
    <Image src={imageUrl} alt="" width={64} height={64} unoptimized onError={() => setSourceIndex((current) => current + 1)} className={`${className} object-contain [image-rendering:pixelated]`} />
  ) : (
    <span aria-hidden="true" className={`flex ${className} items-center justify-center rounded bg-neutral-800 text-xl text-neutral-500`}>?</span>
  );
}
