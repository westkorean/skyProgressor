import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  const response = await fetch('https://api.hypixel.net/v2/resources/skyblock/items');
  if (!response.ok) throw new Error(`Hypixel items request failed: ${response.status}`);
  const body = await response.json() as { items?: unknown };
  const sourceItems = Array.isArray(body.items) ? body.items : [];
  const items: Record<string, { id: string; name: string; category: string | null; donationXp: number | null }> = {};
  for (const value of sourceItems) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const item = value as Record<string, unknown>;
    const museum = item.museum_data;
    if (!museum || typeof museum !== 'object' || Array.isArray(museum) || typeof item.id !== 'string') continue;
    const metadata = museum as Record<string, unknown>;
    items[item.id] = {
      id: item.id,
      name: typeof item.name === 'string' ? item.name : item.id,
      category: typeof metadata.category === 'string' ? metadata.category : null,
      donationXp: typeof metadata.donation_xp === 'number' ? metadata.donation_xp : null,
    };
  }
  const output = {
    metadata: { generatedAt: new Date().toISOString(), source: 'https://api.hypixel.net/v2/resources/skyblock/items' },
    items: Object.fromEntries(Object.entries(items).sort(([a], [b]) => a.localeCompare(b))),
  };
  await writeFile(resolve('data/museum.generated.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${Object.keys(items).length} Museum donations.`);
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
