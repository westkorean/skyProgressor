import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ITEMS_URL = 'https://api.hypixel.net/v2/resources/skyblock/items';
const HASH_PATTERN = /^[a-f0-9]{32,64}$/i;
const FANDOM_API_URL = 'https://hypixel-skyblock.fandom.com/api.php';

function imageKey(value: string): string {
  return value.replace(/\.(?:png|gif)$/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

async function fandomItemImages(): Promise<Map<string, string>> {
  const parseUrl = new URL(FANDOM_API_URL);
  parseUrl.search = new URLSearchParams({
    action: 'parse', page: 'Pet Items', prop: 'images', format: 'json', origin: '*',
  }).toString();
  const parsed = (await (await fetch(parseUrl)).json()) as { parse?: { images?: unknown } };
  const files = Array.isArray(parsed.parse?.images)
    ? parsed.parse.images.filter((file): file is string => typeof file === 'string')
    : [];
  const urls = new Map<string, string>();
  for (let index = 0; index < files.length; index += 50) {
    const batch = files.slice(index, index + 50);
    const queryUrl = new URL(FANDOM_API_URL);
    queryUrl.search = new URLSearchParams({
      action: 'query', titles: batch.map((file) => `File:${file}`).join('|'),
      prop: 'imageinfo', iiprop: 'url', format: 'json', origin: '*',
    }).toString();
    const result = (await (await fetch(queryUrl)).json()) as {
      query?: { pages?: Record<string, { title?: unknown; imageinfo?: Array<{ url?: unknown }> }> };
    };
    for (const page of Object.values(result.query?.pages ?? {})) {
      const title = typeof page.title === 'string' ? page.title.replace(/^File:/, '') : '';
      const url = page.imageinfo?.[0]?.url;
      if (title && typeof url === 'string') urls.set(imageKey(title), url);
    }
  }
  return urls;
}

async function fandomPageImage(name: string): Promise<string | null> {
  const parseUrl = new URL(FANDOM_API_URL);
  parseUrl.search = new URLSearchParams({
    action: 'parse', page: name, prop: 'images', format: 'json', origin: '*',
  }).toString();
  const parsed = (await (await fetch(parseUrl)).json()) as { parse?: { images?: unknown } };
  const images = Array.isArray(parsed.parse?.images)
    ? parsed.parse.images.filter((file): file is string => typeof file === 'string')
    : [];
  const file = images.find((candidate) => imageKey(candidate) === imageKey(name));
  if (!file) return null;
  const queryUrl = new URL(FANDOM_API_URL);
  queryUrl.search = new URLSearchParams({
    action: 'query', titles: `File:${file}`, prop: 'imageinfo', iiprop: 'url',
    format: 'json', origin: '*',
  }).toString();
  const result = (await (await fetch(queryUrl)).json()) as {
    query?: { pages?: Record<string, { imageinfo?: Array<{ url?: unknown }> }> };
  };
  const url = Object.values(result.query?.pages ?? {})[0]?.imageinfo?.[0]?.url;
  return typeof url === 'string' ? url : null;
}

type ApiItem = {
  id?: unknown;
  name?: unknown;
  material?: unknown;
  durability?: unknown;
  tier?: unknown;
  category?: unknown;
  skin?: { value?: unknown };
};

function textureHash(item: ApiItem): string | null {
  if (typeof item.skin?.value !== 'string') return null;
  try {
    const decoded = JSON.parse(Buffer.from(item.skin.value, 'base64').toString('utf8')) as {
      textures?: { SKIN?: { url?: unknown } };
    };
    const url = decoded.textures?.SKIN?.url;
    if (typeof url !== 'string') return null;
    const hash = url.match(/textures\.minecraft\.net\/texture\/([a-f0-9]{32,64})/i)?.[1];
    return hash && HASH_PATTERN.test(hash) ? hash.toLowerCase() : null;
  } catch {
    return null;
  }
}

async function main() {
  const response = await fetch(ITEMS_URL);
  if (!response.ok) throw new Error(`Hypixel items returned HTTP ${response.status}`);
  const payload = (await response.json()) as { items?: ApiItem[] };
  const updatedAt = new Date().toISOString();
  const items: Record<string, Record<string, unknown>> = {};
  const fandomImages = await fandomItemImages();
  const outputDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../public/pet-items');
  await mkdir(outputDirectory, { recursive: true });
  let imageCount = 0;

  for (const item of payload.items ?? []) {
    if (
      typeof item.id !== 'string' ||
      (!item.id.startsWith('PET_ITEM_') && item.category !== 'PET_ITEM')
    ) continue;
    if (typeof item.name !== 'string' || typeof item.material !== 'string') continue;
    const hash = textureHash(item);
    const localImageUrl = `/pet-items/${item.id}.png`;
    const fandomImageUrl =
      fandomImages.get(imageKey(item.name)) ??
      (!hash ? await fandomPageImage(item.name) : null);
    let hasImage = false;
    try {
      if (fandomImageUrl) {
        const imageResponse = await fetch(fandomImageUrl);
        if (!imageResponse.ok) throw new Error(`Fandom image HTTP ${imageResponse.status}`);
        await sharp(Buffer.from(await imageResponse.arrayBuffer()))
          .resize(64, 64, { fit: 'contain', kernel: 'nearest' })
          .png()
          .toFile(resolve(outputDirectory, `${item.id}.png`));
        hasImage = true;
      } else if (hash) {
        const textureResponse = await fetch(`https://textures.minecraft.net/texture/${hash}`);
        if (!textureResponse.ok) throw new Error(`Mojang texture HTTP ${textureResponse.status}`);
        const texture = Buffer.from(await textureResponse.arrayBuffer());
        const base = await sharp(texture).extract({ left: 8, top: 8, width: 8, height: 8 }).png().toBuffer();
        const hat = await sharp(texture).extract({ left: 40, top: 8, width: 8, height: 8 }).png().toBuffer();
        await sharp(base).composite([{ input: hat }]).resize(64, 64, { kernel: 'nearest' })
          .png().toFile(resolve(outputDirectory, `${item.id}.png`));
        hasImage = true;
      }
    } catch (error) {
      console.warn(`${item.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (hasImage) imageCount += 1;
    items[item.id] = {
      id: item.id,
      name: item.name,
      material: item.material,
      durability: typeof item.durability === 'number' ? item.durability : null,
      rarity: typeof item.tier === 'string' ? item.tier : null,
      category: typeof item.category === 'string' ? item.category : 'PET_ITEM',
      textureHash: hash,
      imageUrl: hasImage ? localImageUrl : null,
      source: 'hypixel-api',
      sourceUrl: ITEMS_URL,
      imageSource: fandomImageUrl ? 'hypixel-fandom' : hash ? 'mojang-texture' : null,
      imageSourceUrl: fandomImageUrl ?? (hash ? `https://textures.minecraft.net/texture/${hash}` : null),
      wikiUrl: `https://hypixel-skyblock.fandom.com/wiki/${item.name.replace(/ /g, '_')}`,
      updatedAt,
    };
  }

  const output = {
    metadata: {
      generatedAt: updatedAt,
      itemCount: Object.keys(items).length,
      licenses: {
        skycrypt: 'MIT',
        fandom: 'CC BY-SA unless otherwise noted',
      },
    },
    items,
  };
  const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), '../data/petItems.generated.json');
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${Object.keys(items).length} pet items (${imageCount} local icons) to ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
