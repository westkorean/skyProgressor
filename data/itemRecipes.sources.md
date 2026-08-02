# Item recipe sources

- Recipe data: [NotEnoughUpdates/NotEnoughUpdates-REPO](https://github.com/NotEnoughUpdates/NotEnoughUpdates-REPO), MIT License.
- Live Bazaar prices: [Hypixel Public API](https://api.hypixel.net/v2/skyblock/bazaar).

`scripts/updateItemRecipes.ts` downloads the repository archive, reads only JSON item
records, and extracts `internalname`, `displayname`, and aggregated recipe ingredients.
Downloaded code is never executed. Runtime pricing recursively values verified recipe
ingredients using the Bazaar `quick_status.buyPrice`; items without a complete
Bazaar-priceable recipe remain unpriced.
