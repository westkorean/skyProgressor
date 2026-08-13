# Managed Knowledge Base

SkyProgressor keeps AI advice grounded by separating deterministic profile checks, curated current-meta knowledge, historical patch knowledge, retrieval, and LLM explanation.

## Directory Layout

- `knowledge/<system>/entries.json`: curated current or historical progression knowledge by system.
- `knowledge/patches/YYYY-MM.json`: structured patch summaries grouped chronologically by month.
- `knowledge/schema.ts`: shared TypeScript contracts for entries, sources, confidence, and patch summaries.
- `knowledge/validation.ts`: validation and normalization for curated entries and patch entries.
- `knowledge/report.md`: latest offline update report.

The supported systems are:

`combat`, `farming`, `foraging`, `mining`, `fishing`, `dungeons`, `slayers`, `pets`, `accessories`, `collections`, `hotm`, `hotf`, `garden`, `rift`, `crimson`, `museum`, and `economy`.

## Entry Contract

New entries should use:

```json
{
  "id": "category.kebab-case",
  "category": "category",
  "title": "",
  "summary": "",
  "recommendation": "",
  "requirements": [],
  "relatedSystems": [],
  "tags": [],
  "sources": [{ "title": "", "url": "" }],
  "patchVersion": "",
  "lastVerified": "YYYY-MM-DD",
  "confidence": "High"
}
```

Legacy entries with `source` and numeric `confidence` are normalized by the validator, but new entries should prefer `sources` and `High` / `Medium` / `Low`.

## Confidence

- `High`: official source, current verification, or multiple agreeing reliable sources.
- `Medium`: official index or reliable source, but extracted details require human review.
- `Low`: incomplete, old, context-sensitive, or weakly sourced.

The runtime also keeps `confidenceScore` internally for sorting.

## Patch Pipeline

Run:

```bash
npm run update:knowledge
```

The updater:

- Fetches official Hypixel SkyBlock patch-note indexes on demand.
- Detects unseen patch titles.
- Writes structured summaries to `knowledge/patches/YYYY-MM.json`.
- Preserves existing curated entries.
- Marks generated entries as `manualReviewRequired`.
- Writes `knowledge/report.md`.

It does not scrape during normal website usage.

## Source Limitations

As of August 13, 2026, the official Wiki URL may redirect to a forum thread about the end of the official Hypixel Wiki. The updater records this as a warning and relies on official forum discovery plus manually reviewed archived sources when the Wiki is unavailable.

Hypixel forum rate limiting can also stop a long discovery run. The report records the page where discovery stopped.

## Validation

Run:

```bash
npm run validate:knowledge
```

Validation checks:

- malformed JSON loaded through TypeScript imports
- unknown categories
- duplicate IDs
- mismatched ID/category prefixes
- invalid dates
- missing HTTPS sources
- empty summaries or recommendations
- malformed confidence
- unknown related systems
- invalid patch topics
- duplicate patch IDs

Warnings and manual-review entries should be resolved by curating the generated patch summaries into specific system knowledge.
