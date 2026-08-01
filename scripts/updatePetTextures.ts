import { Buffer } from 'node:buffer';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HYPIXEL_ITEMS_URL =
  'https://api.hypixel.net/v2/resources/skyblock/items';
const HYPIXEL_WIKI_API_URL =
  'https://wiki.hypixel.net/api.php?action=query&meta=siteinfo&format=json';
const FANDOM_API_URL = 'https://hypixel-skyblock.fandom.com/api.php';
const FANDOM_DEFAULT_PETS: Record<string, string> = {
  FROG: 'Frog Pet',
};
const HASH_PATTERN = /^[a-f0-9]{32,64}$/i;

type ExistingPetEntry = {
  default?: unknown;
  skins?: unknown;
};

type ExistingTextures = Record<string, ExistingPetEntry>;

type HypixelItem = {
  id?: unknown;
  name?: unknown;
  category?: unknown;
  material?: unknown;
  skin?: { value?: unknown; signature?: unknown };
};

type GeneratedEntry = {
  textureHash: string;
  source: 'hypixel-api' | 'hypixel-wiki' | 'hypixel-fandom';
  sourceUrl?: string;
  updatedAt: string;
};

type GeneratedSkinEntry = GeneratedEntry & {
  petType: string;
};

type GeneratedTextures = {
  defaults: Record<string, GeneratedEntry>;
  skins: Record<string, GeneratedSkinEntry>;
};

type PreviousGeneratedTextures = Partial<GeneratedTextures>;

type Conflict = {
  id: string;
  existingHash: string;
  generatedHash: string;
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const dataDirectory = resolve(scriptDirectory, '../data');
const existingPath = resolve(dataDirectory, 'petTextures.json');
const generatedPath = resolve(dataDirectory, 'petTextures.generated.json');
const reportPath = resolve(dataDirectory, 'petTextures.unresolved.md');

function normalizeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

function validatedHash(value: unknown): string | null {
  if (typeof value !== 'string' || value.includes('://')) return null;
  const normalized = value.trim().toLowerCase();
  return HASH_PATTERN.test(normalized) ? normalized : null;
}

function extractTextureHash(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
    const rawUrl = decoded?.textures?.SKIN?.url;
    if (typeof rawUrl !== 'string') return null;

    const textureUrl = new URL(rawUrl);
    const match = textureUrl.pathname.match(/^\/texture\/([a-f0-9]{32,64})\/?$/i);
    if (textureUrl.hostname !== 'textures.minecraft.net' || !match) return null;

    return validatedHash(match[1]);
  } catch {
    return null;
  }
}

function compact(value: string): string {
  return value.replace(/[^A-Z0-9]/g, '');
}

function getExistingSkinIndex(
  existing: ExistingTextures
): Map<string, { petType: string; textureHash: string }> {
  const index = new Map<string, { petType: string; textureHash: string }>();

  for (const [rawPetType, entry] of Object.entries(existing)) {
    const petType = normalizeId(rawPetType);
    if (!petType || !entry || typeof entry !== 'object') continue;
    if (!entry.skins || typeof entry.skins !== 'object') continue;

    for (const [rawSkinId, rawHash] of Object.entries(entry.skins)) {
      const skinId = normalizeId(rawSkinId);
      const textureHash = validatedHash(rawHash);
      if (skinId && textureHash) index.set(skinId, { petType, textureHash });
    }
  }

  return index;
}

function findPetType(
  item: HypixelItem,
  petTypes: string[],
  existingSkinIndex: Map<string, { petType: string; textureHash: string }>
): string | null {
  const skinId = normalizeId(item.id);
  if (!skinId) return null;

  const existing = existingSkinIndex.get(skinId);
  if (existing) return existing.petType;

  const idBody = skinId.replace(/^PET_SKIN_/, '');
  const itemName =
    typeof item.name === 'string'
      ? compact(item.name.replace(/§[0-9A-FK-OR]/gi, '').toUpperCase())
      : '';

  return (
    [...petTypes]
      .sort((a, b) => b.length - a.length)
      .find(
        (petType) =>
          idBody === petType ||
          idBody.startsWith(`${petType}_`) ||
          itemName.includes(compact(petType))
      ) ?? null
  );
}

function inspectDefaultPet(item: HypixelItem): string | null {
  const id = normalizeId(item.id);
  const category = normalizeId(item.category);
  if (!id) return null;

  const semicolonMatch = id.match(/^([A-Z0-9_]+);[0-9]+$/);
  if (semicolonMatch) return semicolonMatch[1];
  if (category === 'PET' && !id.startsWith('PET_SKIN_')) return id;
  return null;
}

async function readJson<T>(path: string, fallback?: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

async function checkWikiAvailability(): Promise<string | null> {
  try {
    const response = await fetch(HYPIXEL_WIKI_API_URL, { redirect: 'manual' });
    if (response.status >= 300 && response.status < 400) {
      return `Official Wiki API redirected to ${response.headers.get('location') ?? 'an unknown location'}`;
    }
    if (!response.ok) return `Official Wiki API returned HTTP ${response.status}`;

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return `Official Wiki API returned ${contentType || 'non-JSON content'}`;
    }
    return null;
  } catch (error) {
    return `Official Wiki API request failed: ${String(error)}`;
  }
}

async function getFandomHeadHash(
  pageTitle: string
): Promise<{ textureHash: string; sourceUrl: string } | null> {
  const fileTitle = `File:${pageTitle.replace(/ /g, '_')}.png`;
  const query = new URL(FANDOM_API_URL);
  query.search = new URLSearchParams({
    action: 'query',
    titles: fileTitle,
    prop: 'revisions',
    rvprop: 'content',
    format: 'json',
    origin: '*',
  }).toString();
  const response = (await fetchJson(query.toString())) as {
    query?: { pages?: Record<string, { revisions?: Array<{ '*'?: unknown }> }> };
  };
  const page = Object.values(response.query?.pages ?? {})[0];
  const source = page?.revisions?.[0]?.['*'];
  if (typeof source !== 'string') return null;

  const match = source.match(/\{\{HeadRender\|([a-f0-9]{32,64})(?:\||\}\})/i);
  const textureHash = validatedHash(match?.[1]);
  if (!textureHash) return null;

  return {
    textureHash,
    sourceUrl: `https://hypixel-skyblock.fandom.com/wiki/${pageTitle.replace(/ /g, '_')}`,
  };
}

function addConflict(
  conflicts: Conflict[],
  id: string,
  existingHash: string | null,
  generatedHash: string
) {
  if (existingHash && existingHash !== generatedHash) {
    const conflict = { id, existingHash, generatedHash };
    conflicts.push(conflict);
    console.warn(`Texture conflict for ${id}:`, conflict);
  }
}

function listSection(title: string, values: string[]): string {
  return `## ${title}\n\n${values.length ? values.map((value) => `- ${value}`).join('\n') : '- None'}\n`;
}

async function main() {
  const existing = await readJson<ExistingTextures>(existingPath);
  const previous = await readJson<PreviousGeneratedTextures>(generatedPath, {});
  const response = (await fetchJson(HYPIXEL_ITEMS_URL)) as {
    items?: unknown;
    lastUpdated?: unknown;
  };
  const items: HypixelItem[] = Array.isArray(response.items)
    ? response.items
    : [];
  const skinItems = items.filter(
    (item) =>
      typeof item.id === 'string' &&
      item.id.toUpperCase().startsWith('PET_SKIN_')
  );

  if (skinItems.length === 0) {
    throw new Error('Hypixel returned no PET_SKIN_ items; refusing to overwrite data');
  }

  const sample = skinItems[0];
  console.log(
    'Verified PET_SKIN_ record shape:',
    JSON.stringify(
      {
        id: sample.id,
        fields: Object.keys(sample).sort(),
        skinFields:
          sample.skin && typeof sample.skin === 'object'
            ? Object.keys(sample.skin).sort()
            : [],
        skinValueType: typeof sample.skin?.value,
        decodedTextureHash: extractTextureHash(sample.skin?.value),
      },
      null,
      2
    )
  );

  const updatedAt = new Date().toISOString();
  const existingSkinIndex = getExistingSkinIndex(existing);
  const petTypes = Object.keys(existing).map((id) => id.toUpperCase());
  const generated: GeneratedTextures = { defaults: {}, skins: {} };
  const seenIds = new Set<string>();
  const duplicateIds: string[] = [];
  const unresolved: string[] = [];
  const conflicts: Conflict[] = [];

  for (const item of skinItems) {
    const skinId = normalizeId(item.id);
    if (!skinId) continue;
    if (seenIds.has(skinId)) {
      duplicateIds.push(skinId);
      console.warn(`Duplicate Hypixel pet skin ID: ${skinId}`);
      continue;
    }
    seenIds.add(skinId);

    const textureHash = extractTextureHash(item.skin?.value);
    const petType = findPetType(item, petTypes, existingSkinIndex);
    if (!textureHash || !petType) {
      const reasons = [
        !textureHash ? 'no verified texture hash' : null,
        !petType ? 'pet type unresolved' : null,
      ].filter(Boolean);
      unresolved.push(`${skinId}: ${reasons.join(', ')}`);
      console.warn(`Unresolved ${skinId}: ${reasons.join(', ')}`);
      continue;
    }

    const oldMapping = existingSkinIndex.get(skinId);
    addConflict(
      conflicts,
      skinId,
      oldMapping?.textureHash ?? null,
      textureHash
    );
    generated.skins[skinId] = {
      petType,
      textureHash,
      source: 'hypixel-api',
      updatedAt,
    };
  }

  for (const item of items) {
    const petType = inspectDefaultPet(item);
    if (!petType) continue;
    const textureHash = extractTextureHash(item.skin?.value);
    if (!textureHash) continue;

    const existingHash = validatedHash(existing[petType]?.default);
    addConflict(conflicts, petType, existingHash, textureHash);
    generated.defaults[petType] = {
      textureHash,
      source: 'hypixel-api',
      updatedAt,
    };
  }

  for (const [petType, pageTitle] of Object.entries(FANDOM_DEFAULT_PETS)) {
    if (generated.defaults[petType]) continue;

    const fandomTexture = await getFandomHeadHash(pageTitle);
    if (!fandomTexture) {
      unresolved.push(`${petType}: no verified Fandom HeadRender hash`);
      console.warn(`Unresolved Fandom default pet: ${petType}`);
      continue;
    }

    const existingHash = validatedHash(existing[petType]?.default);
    addConflict(
      conflicts,
      petType,
      existingHash,
      fandomTexture.textureHash
    );
    generated.defaults[petType] = {
      textureHash: fandomTexture.textureHash,
      source: 'hypixel-fandom',
      sourceUrl: fandomTexture.sourceUrl,
      updatedAt,
    };
  }

  const wikiFailure = await checkWikiAvailability();
  if (wikiFailure) console.warn(wikiFailure);

  const previousSkins = previous.skins ?? {};
  const previousDefaults = previous.defaults ?? {};
  const newDefaults = Object.keys(generated.defaults).filter(
    (id) => !previousDefaults[id]
  );
  const newSkins = Object.keys(generated.skins).filter(
    (id) => !previousSkins[id]
  );
  const updatedMappings = Object.entries(generated.skins)
    .filter(
      ([id, entry]) =>
        previousSkins[id] &&
        previousSkins[id]?.textureHash !== entry.textureHash
    )
    .map(([id]) => id);
  const report = [
    '# Pet texture update report',
    '',
    `Generated: ${updatedAt}`,
    `Hypixel resource lastUpdated: ${String(response.lastUpdated ?? 'unknown')}`,
    `API pet skins inspected: ${skinItems.length}`,
    `Generated default pets: ${Object.keys(generated.defaults).length}`,
    `Generated pet skins: ${Object.keys(generated.skins).length}`,
    '',
    listSection('Newly added skins', newSkins),
    listSection('Newly added default pets', newDefaults),
    listSection('Updated mappings', updatedMappings),
    listSection('Unresolved skin IDs', unresolved),
    listSection(
      'Conflicting mappings',
      conflicts.map(
        ({ id, existingHash, generatedHash }) =>
          `${id}: existing=${existingHash}, generated=${generatedHash}`
      )
    ),
    listSection('Duplicate IDs', duplicateIds),
    listSection(
      'Source warnings',
      wikiFailure
        ? [
            `${wikiFailure}. No Wiki mappings were imported; existing verified defaults were preserved.`,
          ]
        : []
    ),
  ].join('\n');

  await writeFile(
    generatedPath,
    `${JSON.stringify(generated, null, 2)}\n`,
    'utf8'
  );
  await writeFile(reportPath, `${report.trim()}\n`, 'utf8');
  console.log(`Wrote ${generatedPath}`);
  console.log(`Wrote ${reportPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
