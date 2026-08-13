import fs from 'fs/promises';
import path from 'path';
import { KNOWLEDGE_CATEGORIES, type KnowledgeConfidence, type ManagedKnowledgeCategory, type PatchKnowledgeEntry } from '../knowledge/schema.ts';
import { patchKnowledgeCatalog } from '../knowledge/patches/catalog.ts';

const OFFICIAL_SOURCES = [
  { title: 'Hypixel SkyBlock Patch Notes Forum', url: 'https://hypixel.net/forums/skyblock-patch-notes.158/' },
  { title: 'Official Hypixel SkyBlock Versions', url: 'https://wiki.hypixel.net/SkyBlock_Versions' },
] as const;
const WIKI_RAW_URL = 'https://wiki.hypixel.net/index.php?title=SkyBlock_Versions&action=raw';

const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12',
};

const SYSTEM_KEYWORDS: Record<ManagedKnowledgeCategory, string[]> = {
  combat: ['combat', 'damage', 'weapon', 'mob'],
  farming: ['farming', 'garden', 'greenhouse', 'crop', 'visitor'],
  foraging: ['foraging', 'galatea', 'forest', 'tree'],
  mining: ['mining', 'mithril', 'gemstone', 'powder', 'forge'],
  fishing: ['fishing', 'fish', 'trophy', 'atoll'],
  dungeons: ['dungeon', 'catacombs', 'floor', 'master mode'],
  slayers: ['slayer', 'revenant', 'tarantula', 'sven', 'eman', 'blaze', 'vampire'],
  pets: ['pet', 'pets'],
  accessories: ['accessory', 'talisman', 'magical power', 'reforge'],
  collections: ['collection', 'recipe', 'minion'],
  hotm: ['hotm', 'heart of the mountain', 'commission'],
  hotf: ['hotf', 'heart of the forest', 'forest whispers'],
  garden: ['garden', 'visitor', 'composter', 'plot'],
  rift: ['rift', 'timecharm', 'motes'],
  crimson: ['crimson', 'kuudra', 'reputation'],
  museum: ['museum', 'donation'],
  economy: ['bazaar', 'auction', 'price', 'coin', 'sell price'],
};

interface CandidatePatch {
  date: string;
  title: string;
  url: string;
  sourceTitle: string;
  patchVersion: string;
}

const clean = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

function dateFromForum(title: string, fallbackYear: number): string | null {
  const match = title.match(/\[([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\]/);
  if (!match) return null;
  const month = MONTHS[match[1].toLowerCase()];
  if (!month) return null;
  return `${fallbackYear}-${month}-${match[2].padStart(2, '0')}`;
}

function versionFromTitle(title: string) {
  return title.match(/\b0\.\d+(?:\.\d+)?\b/)?.[0] ?? 'Minor Patch';
}

function systemsForTitle(title: string): ManagedKnowledgeCategory[] {
  const normalized = title.toLowerCase();
  const systems = KNOWLEDGE_CATEGORIES.filter((category) => SYSTEM_KEYWORDS[category].some((keyword) => normalized.includes(keyword)));
  return systems.length ? systems : ['combat'];
}

function confidenceForSource(sourceTitle: string): KnowledgeConfidence {
  return sourceTitle.includes('Official') || sourceTitle.includes('Hypixel') ? 'High' : 'Medium';
}

function patchFromCandidate(candidate: CandidatePatch): PatchKnowledgeEntry {
  const systems = systemsForTitle(candidate.title);
  return {
    id: `patch.${candidate.date}-${slug(candidate.title)}`,
    date: candidate.date,
    patchVersion: candidate.patchVersion,
    title: candidate.title,
    source: { title: candidate.sourceTitle, url: candidate.url },
    majorAdditions: [],
    majorRemovals: [],
    balanceChanges: candidate.title.toLowerCase().includes('changes') ? [candidate.title] : [],
    progressionImpact: systems.map((system) => `${system} recommendations may need review against ${candidate.title}.`),
    metaImpact: candidate.title.toLowerCase().match(/update|changes|revamp|release|atoll|greenhouse|foraging/) ? [`${candidate.title} may affect current meta recommendations.`] : [],
    itemChanges: candidate.title.toLowerCase().includes('item') ? [candidate.title] : [],
    newSystems: candidate.title.toLowerCase().match(/update|revamp|release|atoll|greenhouse/) ? [candidate.title] : [],
    removedMechanics: candidate.title.toLowerCase().match(/removal|removed|eol/) ? [candidate.title] : [],
    extractedKnowledge: systems.map((system) => ({
      topic: system,
      change: `Review ${system} recommendations against ${candidate.title}.`,
      reason: `Detected from official patch index on ${candidate.date}.`,
      confidence: confidenceForSource(candidate.sourceTitle),
    })),
    manualReviewRequired: true,
  };
}

async function fetchText(url: string) {
  const response = await fetch(url, { headers: { 'user-agent': 'SkyProgressorKnowledgeUpdater/1.0' } });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.text();
}

function forumPageUrl(page: number) {
  return page === 1 ? OFFICIAL_SOURCES[0].url : `https://hypixel.net/forums/skyblock-patch-notes.158/page-${page}`;
}

async function discoverForumPatches(): Promise<CandidatePatch[]> {
  const source = OFFICIAL_SOURCES[0];
  const all: CandidatePatch[] = [];
  for (let page = 1; page <= 25; page += 1) {
    const url = forumPageUrl(page);
    const html = await fetchText(url);
    const titleMatches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]*(?:SkyBlock|Patch|0\.)[^<]*)<\/a>/gi)];
    const pageCandidates = titleMatches.flatMap((match) => {
      const title = clean(match[2]);
      const localWindow = clean(html.slice(Math.max(0, match.index - 500), Math.min(html.length, match.index + 800)));
      const year = localWindow.match(/\b(20\d{2})\b/)?.[1] ?? String(new Date().getFullYear());
      const date = dateFromForum(title, Number(year));
      if (!date || title.length < 6) return [];
      const href = match[1].startsWith('http') ? match[1] : new URL(match[1], source.url).toString();
      return [{ date, title, url: href, sourceTitle: source.title, patchVersion: versionFromTitle(title) }];
    });
    all.push(...pageCandidates);
    if (page > 1 && pageCandidates.length === 0) break;
  }
  return all;
}

async function discoverWikiPatches(): Promise<CandidatePatch[]> {
  const source = OFFICIAL_SOURCES[1];
  const raw = await fetchText(WIKI_RAW_URL);
  if (/End of the Official Hypixel Wiki/i.test(raw) || !/SkyBlock Versions/i.test(raw)) {
    throw new Error('Official Hypixel Wiki versions page is unavailable or redirected; use forum discovery and manually reviewed archived sources.');
  }
  const entries: CandidatePatch[] = [];
  let currentYear = String(new Date().getFullYear());
  for (const line of raw.split(/\r?\n/)) {
    const yearMatch = line.match(/^={2,}\s*(20\d{2})\s*=+/);
    if (yearMatch) currentYear = yearMatch[1];
    const row = line.match(/\|\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\s*\|\|\s*([^|]+)\|\|\s*(?:\[\[[^\]|]+\|)?([^\]|{]+?)(?:\]\])?\s*(?:\|\||$)/i);
    if (!row) continue;
    const month = MONTHS[row[1].toLowerCase()];
    if (!month) continue;
    const date = `${currentYear}-${month}-${row[2].padStart(2, '0')}`;
    const update = clean(row[3]);
    const title = clean(row[4]).slice(0, 160);
    if (!title) continue;
    entries.push({ date, title, url: source.url, sourceTitle: source.title, patchVersion: update.match(/\b0\.\d+(?:\.\d+)?\b/)?.[0] ?? versionFromTitle(title) });
  }
  return entries;
}

async function readPatchFile(fileName: string): Promise<PatchKnowledgeEntry[]> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'knowledge', 'patches', fileName), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed as PatchKnowledgeEntry[] : [];
  } catch {
    return [];
  }
}

async function writePatchFile(fileName: string, entries: PatchKnowledgeEntry[]) {
  await fs.writeFile(path.join(process.cwd(), 'knowledge', 'patches', fileName), `${JSON.stringify(entries.sort((a, b) => a.date.localeCompare(b.date)), null, 2)}\n`, 'utf8');
}

async function main() {
  const existingIds = new Set(patchKnowledgeCatalog.map((entry) => entry.id));
  const warnings: string[] = [];
  const candidates = (await Promise.allSettled([discoverForumPatches(), discoverWikiPatches()]))
    .flatMap((result) => {
      if (result.status === 'fulfilled') return result.value;
      warnings.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
      return [];
    });

  const byId = new Map<string, PatchKnowledgeEntry>();
  for (const candidate of candidates) {
    const patch = patchFromCandidate(candidate);
    if (!existingIds.has(patch.id)) byId.set(patch.id, patch);
  }

  const added = [...byId.values()];
  const byMonth = new Map<string, PatchKnowledgeEntry[]>();
  for (const patch of added) {
    const fileName = `${patch.date.slice(0, 7)}.json`;
    byMonth.set(fileName, [...(byMonth.get(fileName) ?? []), patch]);
  }
  for (const [fileName, newEntries] of byMonth) {
    const existing = await readPatchFile(fileName);
    const merged = new Map(existing.map((entry) => [entry.id, entry]));
    for (const entry of newEntries) if (!merged.has(entry.id)) merged.set(entry.id, entry);
    await writePatchFile(fileName, [...merged.values()]);
  }

  const report = [
    '# Knowledge Update Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Sources Checked',
    ...OFFICIAL_SOURCES.map((source) => `- ${source.title}: ${source.url}`),
    '',
    '## Added Knowledge',
    ...(added.length ? added.map((entry) => `- ${entry.date} ${entry.title} (${entry.id})`) : ['- None']),
    '',
    '## Updated Knowledge',
    '- None. Curated entries are never overwritten by the updater.',
    '',
    '## Deprecated Knowledge',
    '- None detected automatically.',
    '',
    '## Manual Review Required',
    ...(added.length ? added.map((entry) => `- ${entry.id}: verify extracted impact fields before marking as curated.`) : ['- No new items.']),
    '',
    '## Warnings',
    ...(warnings.length ? warnings.map((warning) => `- ${warning}`) : ['- None']),
    '',
  ].join('\n');
  await fs.writeFile(path.join(process.cwd(), 'knowledge', 'report.md'), report, 'utf8');
  console.log(`Knowledge update complete. Added ${added.length} patch candidates.`);
  if (warnings.length) console.warn(warnings.join('\n'));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
