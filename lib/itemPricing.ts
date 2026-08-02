import recipeData from '@/data/itemRecipes.generated.json';
export type BazaarPrices = Record<string, number>;
const recipes = recipeData.recipes as Record<string, { ingredients: Record<string, number> }>;

export function parseBazaarPrices(payload: unknown): BazaarPrices {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const products = (payload as Record<string, unknown>).products;
  if (!products || typeof products !== 'object' || Array.isArray(products)) return {};
  const prices: BazaarPrices = {};
  for (const [id, value] of Object.entries(products as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const status = (value as Record<string, unknown>).quick_status;
    if (!status || typeof status !== 'object' || Array.isArray(status)) continue;
    const buyPrice = (status as Record<string, unknown>).buyPrice;
    if (typeof buyPrice === 'number' && Number.isFinite(buyPrice) && buyPrice >= 0) prices[id] = buyPrice;
  }
  return prices;
}

export function estimateRecipeCost(id: string, prices: BazaarPrices, ignored: ReadonlySet<string> = new Set(), stack: ReadonlySet<string> = new Set()): number | null {
  if (ignored.has(id)) return 0;
  if (prices[id] !== undefined) return prices[id];
  if (stack.has(id) || !recipes[id]) return null;
  const nextStack = new Set(stack).add(id);
  let total = 0;
  for (const [ingredient, amount] of Object.entries(recipes[id].ingredients)) {
    const cost = estimateRecipeCost(ingredient, prices, ignored, nextStack);
    if (cost === null) return null;
    total += cost * amount;
  }
  return total;
}
