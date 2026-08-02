import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { unzipSync } from 'fflate';

const ARCHIVE_URL = 'https://codeload.github.com/NotEnoughUpdates/NotEnoughUpdates-REPO/zip/refs/heads/master';
type NeuItem = { internalname?: unknown; displayname?: unknown; recipe?: unknown };

async function main() {
  const response = await fetch(ARCHIVE_URL);
  if (!response.ok) throw new Error(`NEU archive request failed: ${response.status}`);
  const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const recipes: Record<string, { name: string; ingredients: Record<string, number> }> = {};
  for (const [path, bytes] of Object.entries(files)) {
    if (!/\/items\/[^/]+\.json$/i.test(path)) continue;
    let item: NeuItem;
    try { item = JSON.parse(new TextDecoder().decode(bytes)) as NeuItem; } catch { continue; }
    if (typeof item.internalname !== 'string' || !item.recipe || typeof item.recipe !== 'object' || Array.isArray(item.recipe)) continue;
    const ingredients: Record<string, number> = {};
    for (const value of Object.values(item.recipe as Record<string, unknown>)) {
      if (typeof value !== 'string' || !value) continue;
      const match = value.match(/^(.*):(\d+)$/);
      if (!match) continue;
      ingredients[match[1]] = (ingredients[match[1]] ?? 0) + Number(match[2]);
    }
    if (Object.keys(ingredients).length) recipes[item.internalname] = { name: typeof item.displayname === 'string' ? item.displayname.replace(/§./g, '') : item.internalname, ingredients };
  }
  const output = { metadata: { generatedAt: new Date().toISOString(), source: 'https://github.com/NotEnoughUpdates/NotEnoughUpdates-REPO', archive: ARCHIVE_URL, license: 'MIT' }, recipes: Object.fromEntries(Object.entries(recipes).sort(([a], [b]) => a.localeCompare(b))) };
  await writeFile(resolve('data/itemRecipes.generated.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${Object.keys(recipes).length} verified recipes.`);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
