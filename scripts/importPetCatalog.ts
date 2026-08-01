import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FANDOM_API_URL = 'https://hypixel-skyblock.fandom.com/api.php';
const FANDOM_PETS_PAGE = 'Pets';
const FANDOM_SKIN_PAGES = [
  'Pet Skins/2026',
  'Pet Skins/2025',
  'Pet Skins/2024',
  'Pet Skins/2023',
  'Pet Skins/2022',
  'Pet Skins/2021',
  'Pet Skins/2020',
  'Pet Skins/Non-Fire Sale List',
];
const SKYCRYPT_SKINS_URL =
  'https://raw.githubusercontent.com/SkyCryptWebsite/SkyCrypt/development/src/constants/skins-animations.js';
const HASH_PATTERN = /^[a-f0-9]{32,64}$/i;

type TextureSource = 'hypixel-fandom' | 'skycrypt-github';

type CatalogEntry = {
  id: string | null;
  displayName: string;
  petType: string;
  textureHash: string;
  source: TextureSource;
  sourceUrl: string;
  imageFile?: string;
  releaseDate?: string;
  acquisition?: string;
  notes?: string;
  legacySource?: string;
  updatedAt: string;
};

type Catalog = {
  metadata: {
    generatedAt: string;
    sources: string[];
    licenseNotes: string[];
  };
  pets: Record<string, CatalogEntry>;
  skins: Record<string, CatalogEntry>;
  unresolved: Array<{
    kind: 'pet' | 'skin';
    name: string;
    reason: string;
    sourceUrl: string;
  }>;
};

type TextureOverlay = {
  defaults: Record<string, Record<string, unknown>>;
  skins: Record<string, Record<string, unknown>>;
};

type ParsedPage = { wikitext: string; images: string[] };

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const dataDirectory = resolve(scriptDirectory, '../data');
const baselinePath = resolve(dataDirectory, 'petTextures.json');
const overlayPath = resolve(dataDirectory, 'petTextures.generated.json');
const catalogPath = resolve(dataDirectory, 'petCatalog.generated.json');
const catalogReportPath = resolve(dataDirectory, 'petCatalog.unresolved.md');

function validHash(value: unknown): string | null {
  if (typeof value !== 'string' || value.includes('://')) return null;
  const hash = value.trim().toLowerCase();
  return HASH_PATTERN.test(hash) ? hash : null;
}

function normalizeId(value: string): string {
  return value
    .replace(/§[0-9A-FK-OR]/gi, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function displayNameFromFile(file: string): string {
  return file.replace(/\.(?:png|gif)$/i, '').replace(/_/g, ' ');
}

function pageKey(title: string): string {
  return title.replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function petTypeFromName(name: string): string {
  const normalized = normalizeId(name.replace(/ Pet$/i, ''));
  const aliases: Record<string, string> = {
    T_REX: 'TYRANNOSAURUS',
    MONTEZUMA: 'FRACTURED_MONTEZUMA_SOUL',
  };
  return aliases[normalized] ?? normalized;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

async function parseFandomPage(title: string): Promise<ParsedPage> {
  const url = new URL(FANDOM_API_URL);
  url.search = new URLSearchParams({
    action: 'parse',
    page: title,
    prop: 'wikitext|images',
    format: 'json',
    origin: '*',
  }).toString();
  const result = (await fetchJson(url.toString())) as {
    parse?: { wikitext?: { '*'?: unknown }; images?: unknown };
  };
  return {
    wikitext:
      typeof result.parse?.wikitext?.['*'] === 'string'
        ? result.parse.wikitext['*']
        : '',
    images: Array.isArray(result.parse?.images)
      ? result.parse.images.filter((value): value is string => typeof value === 'string')
      : [],
  };
}

async function getPageSources(titles: string[]): Promise<Map<string, string>> {
  const sources = new Map<string, string>();
  for (let index = 0; index < titles.length; index += 50) {
    const batch = titles.slice(index, index + 50);
    const url = new URL(FANDOM_API_URL);
    url.search = new URLSearchParams({
      action: 'query',
      titles: batch.join('|'),
      prop: 'revisions',
      rvprop: 'content',
      format: 'json',
      origin: '*',
    }).toString();
    const result = (await fetchJson(url.toString())) as {
      query?: {
        pages?: Record<
          string,
          { title?: unknown; revisions?: Array<{ '*'?: unknown }> }
        >;
      };
    };
    for (const page of Object.values(result.query?.pages ?? {})) {
      const title = typeof page.title === 'string' ? page.title : null;
      const source = page.revisions?.[0]?.['*'];
      if (title && typeof source === 'string') sources.set(pageKey(title), source);
    }
  }
  return sources;
}

function headHashFromSource(source: string): string | null {
  const match = source.match(/\{\{(?:Animated)?HeadRender\|([a-f0-9]{32,64})(?:\||\}\})/i);
  return validHash(match?.[1]);
}

function infoboxValue(source: string, key: string): string | undefined {
  const match = source.match(new RegExp(`^\\|${key}\\s*=\\s*(.+)$`, 'im'));
  return match?.[1]?.trim();
}

function cleanWikiText(value?: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .replace(/\{\{[^{}]*\|([^{}|]+)\}\}/g, '$1')
    .replace(
      /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
      (_match, target: string, label?: string) => label ?? target
    )
    .replace(/'{2,}/g, '')
    .trim();
  return cleaned || undefined;
}

type SkinTableRecord = {
  name: string;
  imageFile: string;
  petType: string | null;
  releaseDate?: string;
  acquisition?: string;
  notes?: string;
  tablePage: string;
};

function parseSkinTable(
  pageTitle: string,
  source: string,
  knownPets: Array<{ displayName: string; petType: string }>
): SkinTableRecord[] {
  const records: SkinTableRecord[] = [];
  let currentPetType: string | null = null;
  for (const row of source.split(/\n\|-/)) {
    const name = row.match(/\{\{Slot\|([^}|]+)[^}]*\}\}/i)?.[1]?.trim();
    const imageFile = row.match(/\[\[File:([^\]|]+\.(?:png|gif))/i)?.[1];
    if (!name || !imageFile || !/ Skin$/i.test(name)) continue;

    const petName = row.match(/\[\[([^\]|]+ Pet)(?:\|[^\]]+)?\]\]/i)?.[1];
    if (petName) currentPetType = petTypeFromName(petName);
    const normalizedSkinName = normalizeId(name);
    const inferredPetType = [...knownPets]
      .sort((a, b) => b.displayName.length - a.displayName.length)
      .find(({ displayName, petType }) => {
        const normalizedName = normalizeId(displayName.replace(/ Pet$/i, ''));
        return (
          normalizedSkinName.includes(normalizedName) ||
          normalizedSkinName.includes(petType)
        );
      })?.petType ?? null;
    const date = row.match(
      /(?:January|February|Feburary|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i
    )?.[0];
    const notes = cleanWikiText(
      row.match(/\{\{G\|([^{}]*(?:\{\{[^{}]*\}\}[^{}]*)*)\}\}/i)?.[1]
    );
    records.push({
      name,
      imageFile,
      petType: petName ? currentPetType : inferredPetType ?? currentPetType,
      releaseDate: date?.replace('Feburary', 'February'),
      acquisition: pageTitle.includes('Non-Fire')
        ? cleanWikiText(row.match(/\|([^\n]*(?:Shop|Bundle|Event)[^\n]*)/i)?.[1])
        : 'Fire Sale',
      notes,
      tablePage: pageTitle,
    });
  }
  return records;
}

type SkyCryptSkin = {
  id: string;
  name: string;
  textureHash: string;
  legacySource?: string;
  releaseDate?: string;
};

function parseSkyCryptSkins(source: string): SkyCryptSkin[] {
  const skins: SkyCryptSkin[] = [];
  const entryPattern = /\{\s*id:\s*"(PET_SKIN_[A-Z0-9_]+)"([\s\S]*?)\n\s*\},/g;
  for (const match of source.matchAll(entryPattern)) {
    const body = match[2];
    const textureHash = validHash(
      body.match(/texture:\s*"\/head\/([a-f0-9]{32,64})"/i)?.[1]
    );
    if (!textureHash) continue;
    skins.push({
      id: match[1],
      name: body.match(/name:\s*"([^"]+)"/)?.[1] ?? match[1],
      textureHash,
      legacySource: body.match(/source:\s*"([^"]+)"/)?.[1],
      releaseDate: body.match(/new Date\("([^"]+)"\)/)?.[1],
    });
  }
  return skins;
}

function findPetTypeFromSkinId(skinId: string, petTypes: string[]): string | null {
  const body = skinId.replace(/^PET_SKIN_/, '');
  const historicalAliases: Record<string, string> = {
    CAT: 'BLACK_CAT',
    DRAGON: 'ENDER_DRAGON',
    WHALE: 'BLUE_WHALE',
    WITHER: 'WITHER_SKELETON',
    YETI: 'BABY_YETI',
  };
  const alias = Object.entries(historicalAliases).find(
    ([prefix]) => body === prefix || body.startsWith(`${prefix}_`)
  )?.[1];
  if (alias && petTypes.includes(alias)) return alias;
  return (
    [...petTypes]
      .sort((a, b) => b.length - a.length)
      .find((petType) => body === petType || body.startsWith(`${petType}_`)) ??
    null
  );
}

async function main() {
  const generatedAt = new Date().toISOString();
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8')) as Record<
    string,
    { default?: unknown }
  >;
  const overlay = JSON.parse(await readFile(overlayPath, 'utf8')) as TextureOverlay;
  const catalog: Catalog = {
    metadata: {
      generatedAt,
      sources: [
        'https://hypixel-skyblock.fandom.com/wiki/Pets',
        'https://hypixel-skyblock.fandom.com/wiki/Pet_Skins',
        SKYCRYPT_SKINS_URL,
      ],
      licenseNotes: [
        'Fandom wiki text is available under CC BY-SA unless otherwise noted.',
        'SkyCrypt source is MIT licensed.',
      ],
    },
    pets: {},
    skins: {},
    unresolved: [],
  };

  const petsPage = await parseFandomPage(FANDOM_PETS_PAGE);
  const petImages = [...new Set(petsPage.images)].filter((file) =>
    /_Pet\.png$/i.test(file)
  );
  const petFileSources = await getPageSources(
    petImages.map((file) => `File:${file}`)
  );
  const petPageTitles = petImages.map((file) => displayNameFromFile(file));
  const petPageSources = await getPageSources(petPageTitles);

  for (const imageFile of petImages) {
    const displayName = displayNameFromFile(imageFile);
    const petType = petTypeFromName(displayName);
    const pageUrl = `https://hypixel-skyblock.fandom.com/wiki/${displayName.replace(/ /g, '_')}`;
    const textureHash = headHashFromSource(
      petFileSources.get(pageKey(`File:${imageFile}`)) ?? ''
    );
    if (!textureHash) {
      catalog.unresolved.push({
        kind: 'pet',
        name: displayName,
        reason: 'File page has no verified HeadRender hash',
        sourceUrl: pageUrl,
      });
      continue;
    }
    const pageSource = petPageSources.get(pageKey(displayName)) ?? '';
    catalog.pets[petType] = {
      id: petType,
      displayName,
      petType,
      textureHash,
      source: 'hypixel-fandom',
      sourceUrl: pageUrl,
      imageFile,
      acquisition: cleanWikiText(infoboxValue(pageSource, 'obtained')),
      notes: cleanWikiText(infoboxValue(pageSource, 'type')),
      updatedAt: generatedAt,
    };

    const oldHash = validHash(baseline[petType]?.default);
    const generatedHash = validHash(overlay.defaults[petType]?.textureHash);
    if (oldHash && oldHash !== textureHash && !generatedHash) {
      console.warn(
        `Default conflict ${petType}: baseline=${oldHash}, fandom=${textureHash}`
      );
    }
    overlay.defaults[petType] = {
      textureHash,
      source: 'hypixel-fandom',
      sourceUrl: pageUrl,
      displayName,
      imageFile,
      updatedAt: generatedAt,
    };
  }

  const skyCryptSource = await fetchText(SKYCRYPT_SKINS_URL);
  const skyCryptSkins = parseSkyCryptSkins(skyCryptSource);
  const allPetTypes = [
    ...new Set([
      ...Object.keys(baseline),
      ...Object.keys(overlay.defaults),
      ...Object.keys(catalog.pets),
    ]),
  ];
  const baselinePetTypeBySkinId = new Map<string, string>();
  for (const [petType, entry] of Object.entries(baseline)) {
    const skins = (entry as { skins?: unknown }).skins;
    if (!skins || typeof skins !== 'object') continue;
    for (const skinId of Object.keys(skins)) {
      baselinePetTypeBySkinId.set(skinId, petType);
    }
  }
  const skinIdByHash = new Map<string, string>();
  for (const skin of skyCryptSkins) {
    skinIdByHash.set(skin.textureHash, skin.id);
    const petType =
      baselinePetTypeBySkinId.get(skin.id) ??
      findPetTypeFromSkinId(skin.id, allPetTypes);
    if (!petType) {
      catalog.unresolved.push({
        kind: 'skin',
        name: skin.id,
        reason: 'SkyCrypt ID could not be associated with a known pet type',
        sourceUrl: SKYCRYPT_SKINS_URL,
      });
      continue;
    }
    const existingHash = validHash(overlay.skins[skin.id]?.textureHash);
    if (existingHash && existingHash !== skin.textureHash) {
      console.warn(
        `Skin conflict ${skin.id}: overlay=${existingHash}, skycrypt=${skin.textureHash}`
      );
      continue;
    }
    if (!existingHash) {
      overlay.skins[skin.id] = {
        petType,
        textureHash: skin.textureHash,
        source: 'skycrypt-github',
        sourceUrl: SKYCRYPT_SKINS_URL,
        displayName: skin.name,
        releaseDate: skin.releaseDate,
        legacySource: skin.legacySource,
        updatedAt: generatedAt,
      };
    }
    catalog.skins[skin.id] = {
      id: skin.id,
      displayName: skin.name,
      petType,
      textureHash: skin.textureHash,
      source: 'skycrypt-github',
      sourceUrl: SKYCRYPT_SKINS_URL,
      releaseDate: skin.releaseDate,
      legacySource: skin.legacySource,
      updatedAt: generatedAt,
    };
  }

  const skinTables = await Promise.all(
    FANDOM_SKIN_PAGES.map(async (title) => ({
      title,
      page: await parseFandomPage(title),
    }))
  );
  const fandomSkinRecords = skinTables.flatMap(({ title, page }) =>
    parseSkinTable(
      title,
      page.wikitext,
      Object.values(catalog.pets).map(({ displayName, petType }) => ({
        displayName,
        petType,
      }))
    )
  );
  const fandomSkinFiles = [
    ...new Set(fandomSkinRecords.map((record) => record.imageFile)),
  ];
  const fandomSkinSources = await getPageSources(
    fandomSkinFiles.map((file) => `File:${file}`)
  );

  for (const record of fandomSkinRecords) {
    const sourceUrl = `https://hypixel-skyblock.fandom.com/wiki/File:${record.imageFile.replace(/ /g, '_')}`;
    const textureHash = headHashFromSource(
      fandomSkinSources.get(pageKey(`File:${record.imageFile}`)) ?? ''
    );
    if (!textureHash) {
      catalog.unresolved.push({
        kind: 'skin',
        name: record.name,
        reason: 'File page has no verified HeadRender hash',
        sourceUrl,
      });
      continue;
    }
    const verifiedId = skinIdByHash.get(textureHash) ?? null;
    const petType =
      record.petType ??
      (verifiedId ? findPetTypeFromSkinId(verifiedId, allPetTypes) : null);
    if (!petType) {
      catalog.unresolved.push({
        kind: 'skin',
        name: record.name,
        reason: 'Pet association is not present in the table',
        sourceUrl,
      });
      continue;
    }
    const catalogKey = verifiedId ?? `FANDOM:${normalizeId(record.name)}`;
    catalog.skins[catalogKey] = {
      id: verifiedId,
      displayName: record.name,
      petType,
      textureHash,
      source: 'hypixel-fandom',
      sourceUrl,
      imageFile: record.imageFile,
      releaseDate: record.releaseDate,
      acquisition: record.acquisition,
      notes: record.notes,
      updatedAt: generatedAt,
    };
  }

  const report = [
    '# Pet catalog import report',
    '',
    `Generated: ${generatedAt}`,
    `Fandom pets with verified hashes: ${Object.keys(catalog.pets).length}`,
    `Catalog skins with verified hashes: ${Object.keys(catalog.skins).length}`,
    `SkyCrypt legacy skins parsed: ${skyCryptSkins.length}`,
    `Runtime defaults: ${Object.keys(overlay.defaults).length}`,
    `Runtime skins: ${Object.keys(overlay.skins).length}`,
    `Unresolved records: ${catalog.unresolved.length}`,
    '',
    '## Unresolved records',
    '',
    ...(catalog.unresolved.length
      ? catalog.unresolved.map(
          (entry) =>
            `- ${entry.kind}: ${entry.name} — ${entry.reason} (${entry.sourceUrl})`
        )
      : ['- None']),
  ].join('\n');

  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  await writeFile(overlayPath, `${JSON.stringify(overlay, null, 2)}\n`, 'utf8');
  await writeFile(catalogReportPath, `${report}\n`, 'utf8');
  console.log(report);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
