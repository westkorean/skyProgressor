import { fetchUpstreamJson } from './fetchUpstreamJson';

const HYPIXEL_ITEMS_URL = 'https://api.hypixel.net/v2/resources/skyblock/items';
const FANDOM_API_URL = 'https://hypixel-skyblock.fandom.com/api.php';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 3_000;

export interface OwnedItemLookup {
  id: string;
  name: string | null;
}

export interface OwnedItemMetadata {
  id: string;
  name: string;
  material: string | null;
  category: string | null;
  rarity: string | null;
  npcSellPrice: number | null;
  stats: Record<string, number>;
  wikiTitle: string | null;
  wikiUrl: string | null;
  wikiSummary: string | null;
  imageUrl: string | null;
  marketPrice: number | null;
  marketPriceSource: 'bazaar' | 'craft' | 'auction-median' | 'auction-bin' | 'npc' | null;
  rawCraftCost: number | null;
  lowestBinPrice: number | null;
  recentMedianPrice: number | null;
  sources: Array<'hypixel-api' | 'hypixel-fandom'>;
}

type CacheEntry = { expiresAt: number; value: OwnedItemMetadata };
type ApiItem = Record<string, unknown> & { id?: unknown; name?: unknown };
let officialCatalogPromise: Promise<Map<string, ApiItem>> | null = null;
let officialCatalogExpiresAt = 0;
const metadataCache = new Map<string, CacheEntry>();

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function cleanName(value: string): string {
  return value.replace(/(?:§|Â§)./g, '').trim();
}

function numericStats(value: unknown): Record<string, number> {
  const source = record(value);
  if (!source) return {};
  return Object.fromEntries(Object.entries(source).filter((entry): entry is [string, number] =>
    typeof entry[1] === 'number' && Number.isFinite(entry[1])
  ));
}

async function officialCatalog(): Promise<Map<string, ApiItem>> {
  if (officialCatalogPromise && Date.now() < officialCatalogExpiresAt) return officialCatalogPromise;
  officialCatalogExpiresAt = Date.now() + CACHE_TTL_MS;
  officialCatalogPromise = (async () => {
    const response = await fetchUpstreamJson(HYPIXEL_ITEMS_URL, { next: { revalidate: 21_600 } }, 15_000);
    if (!response.ok) throw new Error('Hypixel item resource is unavailable');
    const items = record(response.data)?.items;
    const catalog = new Map<string, ApiItem>();
    if (Array.isArray(items)) {
      for (const value of items) {
        const item = record(value) as ApiItem | null;
        if (item && typeof item.id === 'string') catalog.set(item.id.toUpperCase(), item);
      }
    }
    return catalog;
  })().catch((error) => {
    officialCatalogPromise = null;
    officialCatalogExpiresAt = 0;
    throw error;
  });
  return officialCatalogPromise;
}

type WikiPage = {
  title?: unknown;
  extract?: unknown;
  thumbnail?: { source?: unknown };
  missing?: unknown;
  images?: Array<{ title?: unknown }>;
  resolvedImageUrl?: string;
};

function imageKey(value: string): string {
  return value.replace(/^File:/i, '').replace(/\.(?:png|gif|jpe?g|webp)$/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

async function wikiPages(titles: readonly string[]): Promise<Map<string, WikiPage>> {
  const pagesByTitle = new Map<string, WikiPage>();
  for (let index = 0; index < titles.length; index += 40) {
    const batch = titles.slice(index, index + 40);
    const url = new URL(FANDOM_API_URL);
    url.search = new URLSearchParams({
      action: 'query',
      titles: batch.join('|'),
      redirects: '1',
      prop: 'extracts|pageimages|images',
      exintro: '1',
      explaintext: '1',
      piprop: 'thumbnail',
      pithumbsize: '96',
      imlimit: '20',
      format: 'json',
      origin: '*',
    }).toString();
    const response = await fetchUpstreamJson(url.toString(), {}, 12_000);
    if (!response.ok) continue;
    const query = record(record(response.data)?.query);
    const pages = record(query?.pages);
    const batchPages: WikiPage[] = [];
    for (const value of Object.values(pages ?? {})) {
      const page = record(value) as WikiPage | null;
      if (page && typeof page.title === 'string' && page.missing === undefined) {
        pagesByTitle.set(page.title.toLowerCase(), page);
        batchPages.push(page);
      }
    }
    const selectedFiles = batchPages.flatMap((page) => {
      if (typeof page.title !== 'string' || !Array.isArray(page.images)) return [];
      const candidates = page.images
        .map((image) => typeof image.title === 'string' ? image.title : null)
        .filter((title): title is string => title !== null);
      const pageKey = imageKey(page.title);
      const selected = candidates.find((title) => imageKey(title) === pageKey)
        ?? candidates.find((title) => imageKey(title).includes(pageKey))
        ?? null;
      return selected ? [{ page, file: selected }] : [];
    });
    if (selectedFiles.length > 0) {
      const imageUrl = new URL(FANDOM_API_URL);
      imageUrl.search = new URLSearchParams({
        action: 'query',
        titles: [...new Set(selectedFiles.map((entry) => entry.file))].join('|'),
        prop: 'imageinfo',
        iiprop: 'url',
        iiurlwidth: '96',
        format: 'json',
        origin: '*',
      }).toString();
      const imageResponse = await fetchUpstreamJson(imageUrl.toString(), {}, 12_000);
      const imagePages = record(record(imageResponse.data)?.query)?.pages;
      const urls = new Map<string, string>();
      for (const value of Object.values(record(imagePages) ?? {})) {
        const imagePage = record(value);
        const title = imagePage?.title;
        const imageInfo = Array.isArray(imagePage?.imageinfo) ? record(imagePage.imageinfo[0]) : null;
        const resolved = imageInfo?.thumburl ?? imageInfo?.url;
        if (typeof title === 'string' && typeof resolved === 'string') urls.set(title, resolved);
      }
      for (const entry of selectedFiles) entry.page.resolvedImageUrl = urls.get(entry.file);
    }
  }
  return pagesByTitle;
}

function trimSummary(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 700);
}

function cacheValue(id: string, value: OwnedItemMetadata): void {
  if (metadataCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = metadataCache.keys().next().value;
    if (typeof oldest === 'string') metadataCache.delete(oldest);
  }
  metadataCache.set(id, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

export async function enrichOwnedItems(lookups: readonly OwnedItemLookup[]): Promise<Record<string, OwnedItemMetadata>> {
  const unique = new Map<string, OwnedItemLookup>();
  for (const lookup of lookups.slice(0, 750)) {
    const id = lookup.id.trim().toUpperCase();
    if (id) unique.set(id, { id, name: typeof lookup.name === 'string' ? cleanName(lookup.name) : null });
  }

  let catalog = new Map<string, ApiItem>();
  try { catalog = await officialCatalog(); } catch { /* Wiki and NBT names remain usable. */ }
  const pending: Array<{ lookup: OwnedItemLookup; item: ApiItem | null; name: string }> = [];
  const result: Record<string, OwnedItemMetadata> = {};

  for (const lookup of unique.values()) {
    const cached = metadataCache.get(lookup.id);
    if (cached && cached.expiresAt > Date.now()) {
      result[lookup.id] = cached.value;
      continue;
    }
    const item = catalog.get(lookup.id) ?? null;
    const name = typeof item?.name === 'string' ? cleanName(item.name) : lookup.name ?? lookup.id;
    pending.push({ lookup, item, name });
  }

  let wiki = new Map<string, WikiPage>();
  try { wiki = await wikiPages([...new Set(pending.map((entry) => entry.name))]); } catch { /* Official data still displays. */ }

  for (const entry of pending) {
    const page = wiki.get(entry.name.toLowerCase()) ?? null;
    const wikiTitle = typeof page?.title === 'string' ? page.title : null;
    const item = entry.item;
    const metadata: OwnedItemMetadata = {
      id: entry.lookup.id,
      name: entry.name,
      material: typeof item?.material === 'string' ? item.material : null,
      category: typeof item?.category === 'string' ? item.category : null,
      rarity: typeof item?.tier === 'string' ? item.tier : null,
      npcSellPrice: typeof item?.npc_sell_price === 'number' ? item.npc_sell_price : null,
      stats: numericStats(item?.stats),
      wikiTitle,
      wikiUrl: wikiTitle
        ? `https://hypixel-skyblock.fandom.com/wiki/${encodeURIComponent(wikiTitle.replace(/ /g, '_'))}`
        : `https://hypixel-skyblock.fandom.com/wiki/Special:Search?query=${encodeURIComponent(entry.name)}`,
      wikiSummary: typeof page?.extract === 'string' ? trimSummary(page.extract) : null,
      imageUrl: typeof page?.resolvedImageUrl === 'string'
        ? page.resolvedImageUrl
        : typeof page?.thumbnail?.source === 'string' ? page.thumbnail.source : null,
      marketPrice: null,
      marketPriceSource: null,
      rawCraftCost: null,
      lowestBinPrice: null,
      recentMedianPrice: null,
      sources: [...(item ? ['hypixel-api' as const] : []), ...(page ? ['hypixel-fandom' as const] : [])],
    };
    cacheValue(entry.lookup.id, metadata);
    result[entry.lookup.id] = metadata;
  }
  return result;
}
