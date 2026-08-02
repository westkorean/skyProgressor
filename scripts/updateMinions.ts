import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type HypixelItem = {
  id?: unknown;
  name?: unknown;
  generator?: unknown;
  generator_tier?: unknown;
};

type ApiResponse = { items?: unknown };

async function main() {
  const response = await fetch('https://api.hypixel.net/v2/resources/skyblock/items');
  if (!response.ok) throw new Error(`Hypixel items request failed: ${response.status}`);
  const body = (await response.json()) as ApiResponse;
  const items = Array.isArray(body.items) ? (body.items as HypixelItem[]) : [];
  const families = new Map<string, { id: string; name: string; maxTier: number }>();

  for (const item of items) {
    if (typeof item.generator !== 'string' || typeof item.generator_tier !== 'number') continue;
    const id = item.generator.toUpperCase();
    const name = typeof item.name === 'string'
      ? item.name.replace(/\s+Minion\s+[IVXLCDM]+$/i, '')
      : id.split('_').map((part) => part[0] + part.slice(1).toLowerCase()).join(' ');
    const existing = families.get(id);
    families.set(id, { id, name, maxTier: Math.max(existing?.maxTier ?? 0, item.generator_tier) });
  }

  const output = {
  metadata: {
    generatedAt: new Date().toISOString(),
    source: 'https://api.hypixel.net/v2/resources/skyblock/items',
    note: 'The official resource exposes generator identity and tier, but no recipe costs.',
  },
  families: Object.fromEntries([...families].sort(([a], [b]) => a.localeCompare(b))),
  };

  await writeFile(resolve('data/minions.generated.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${families.size} minion families.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
