import { readFile } from 'node:fs/promises';

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
const load = async (path: string): Promise<JsonRecord> => {
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  const parsed = record(value);
  if (!parsed) throw new Error(`${path}: expected an object`);
  return parsed;
};
const objectField = (source: JsonRecord, field: string, path: string): JsonRecord => {
  const value = record(source[field]);
  if (!value) throw new Error(`${path}: missing object field ${field}`);
  return value;
};
const positiveInteger = (value: unknown): boolean => typeof value === 'number' && Number.isInteger(value) && value > 0;

async function main() {
  const [minions, bestiary, museum, collections, recipes, petTextures] = await Promise.all([
    load('data/minions.generated.json'), load('data/bestiary.generated.json'), load('data/museum.generated.json'),
    load('data/collections.generated.json'), load('data/itemRecipes.generated.json'), load('data/petTextures.generated.json'),
  ]);
  const errors: string[] = [];

  for (const [id, value] of Object.entries(objectField(minions, 'families', 'minions'))) {
    const family = record(value);
    if (!family || family.id !== id || !positiveInteger(family.maxTier)) errors.push(`minions: invalid ${id}`);
  }
  const brackets = objectField(bestiary, 'brackets', 'bestiary');
  for (const [categoryId, value] of Object.entries(objectField(bestiary, 'categories', 'bestiary'))) {
    const category = record(value);
    const mobs = category?.mobs;
    if (!Array.isArray(mobs)) { errors.push(`bestiary: invalid category ${categoryId}`); continue; }
    for (const mobValue of mobs) {
      const mob = record(mobValue);
      if (!mob || !Array.isArray(mob.mobs) || !positiveInteger(mob.cap) || !Array.isArray(brackets[String(mob.bracket)])) errors.push(`bestiary: invalid family in ${categoryId}`);
    }
  }
  for (const [id, value] of Object.entries(objectField(museum, 'items', 'museum'))) {
    const item = record(value);
    if (!item || item.id !== id || typeof item.name !== 'string') errors.push(`museum: invalid ${id}`);
  }
  for (const [id, value] of Object.entries(objectField(collections, 'items', 'collections'))) {
    const item = record(value);
    if (!item || item.id !== id || !Array.isArray(item.tiers)) errors.push(`collections: invalid ${id}`);
  }
  for (const [id, value] of Object.entries(objectField(recipes, 'recipes', 'recipes'))) {
    const ingredients = record(record(value)?.ingredients);
    if (!ingredients || Object.values(ingredients).some((amount) => typeof amount !== 'number' || amount <= 0)) errors.push(`recipes: invalid ${id}`);
  }
  const hashPattern = /^[a-f0-9]{32,64}$/i;
  for (const group of ['defaults', 'skins']) {
    for (const [id, value] of Object.entries(objectField(petTextures, group, 'petTextures'))) {
      const hash = record(value)?.textureHash;
      if (typeof hash !== 'string' || !hashPattern.test(hash)) errors.push(`petTextures: invalid ${group}.${id}`);
    }
  }

  if (errors.length) throw new Error(`Generated data validation failed:\n${errors.slice(0, 50).join('\n')}`);
  console.log('Generated data validation passed.');
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
