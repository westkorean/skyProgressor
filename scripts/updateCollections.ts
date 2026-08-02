import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://api.hypixel.net/v2/resources/skyblock/collections';

type ApiTier = { tier?: unknown; amountRequired?: unknown; unlocks?: unknown };
type ApiItem = { name?: unknown; maxTiers?: unknown; tiers?: unknown };
type ApiCategory = { name?: unknown; items?: unknown };

async function main() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`Collections resource returned HTTP ${response.status}`);
  const payload = (await response.json()) as { lastUpdated?: unknown; version?: unknown; collections?: unknown };
  const categories = payload.collections && typeof payload.collections === 'object'
    ? (payload.collections as Record<string, ApiCategory>)
    : {};
  const items: Record<string, unknown> = {};

  for (const [categoryId, category] of Object.entries(categories)) {
    const categoryItems = category.items && typeof category.items === 'object'
      ? (category.items as Record<string, ApiItem>)
      : {};
    for (const [id, item] of Object.entries(categoryItems)) {
      const tiers = Array.isArray(item.tiers) ? item.tiers : [];
      items[id] = {
        id,
        name: typeof item.name === 'string' ? item.name : id,
        category: categoryId,
        maxTiers: typeof item.maxTiers === 'number' ? item.maxTiers : null,
        tiers: tiers.flatMap((value) => {
          const tier = value as ApiTier;
          if (typeof tier.tier !== 'number' || typeof tier.amountRequired !== 'number') return [];
          return [{
            tier: tier.tier,
            amountRequired: tier.amountRequired,
            unlocks: Array.isArray(tier.unlocks)
              ? tier.unlocks.filter((unlock): unlock is string => typeof unlock === 'string')
              : [],
          }];
        }),
      };
    }
  }

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      sourceUrl: SOURCE_URL,
      lastUpdated: payload.lastUpdated ?? null,
      version: payload.version ?? null,
      itemCount: Object.keys(items).length,
    },
    items,
  };
  const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), '../data/collections.generated.json');
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${Object.keys(items).length} collections to ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
