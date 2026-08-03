# Managed knowledge base

Entries are grouped by gameplay category in `category/entries.json`. This catalog is intentionally not connected to retrieval or the LLM yet.

## Adding an entry

1. Add the object to the appropriate category file.
2. Use a globally unique ID in `category.kebab-case` format.
3. Write recommendations as actionable guidance, not unsupported guarantees.
4. Use an HTTPS primary source and record the date it was checked.
5. Set confidence from 0–100. Lower it when the source is incomplete or the advice depends strongly on player context.
6. Run `npm run validate:knowledge`, tests, and TypeScript.

The catalog rejects malformed entries, mismatched categories, duplicate IDs, invalid dates and URLs, non-normalized tags, and out-of-range confidence values.
