# SkyProgressor Performance Report

Measured on August 2, 2026 with a production Next.js 16.2.10 Turbopack build. Bundle sizes are uncompressed emitted bytes. API and parsing counts are deterministic code-path measurements; live profile latency was not used because it varies with Hypixel, Mojang, Fandom, and Auction House response times.

## Results

| Metric | Before | After | Improvement |
| --- | ---: | ---: | ---: |
| Largest client JavaScript chunk | 1,977,708 B | 1,049,621 B | 928,087 B / 46.9% smaller |
| Static chunk count | 11 | 36 | Heavy sections split into deferred chunks |
| Total emitted static chunk bytes | 2,669,361 B | 2,676,945 B | +0.3% code-splitting overhead |
| Dense retrieval context fixture | 1,564 estimated tokens | 1,035 estimated tokens | 529 / 34% fewer tokens |
| Representative retrieval context | 520 estimated tokens | 503 estimated tokens | 17 / 3.3% fewer tokens |
| Repeated pure parser calls for the same member object | One calculation per call | One calculation per parser | Subsequent calls are cache hits |
| Concurrent identical upstream reads | One upstream request per caller | One shared upstream request | N calls coalesce to 1 |

The total emitted JavaScript remains essentially constant because functionality was preserved. The improvement is that profile-only UI is no longer part of the single initial chunk and is fetched as smaller chunks after a profile result exists. This reduces initial parse/compile pressure without deleting features.

## API reductions

- Hypixel profile reads are cached for 30 seconds.
- Garden and Museum reads are cached for 60 seconds.
- Mojang IGN and UUID reads are cached for 5 minutes.
- Pricing already used its shared snapshot cache; browser cache headers now prevent redundant route requests during its freshness window.
- Identical in-flight upstream GETs share one promise, preventing request bursts from profile comparison and rapid navigation.
- SkyHelper price catalogs are reused for 5 minutes instead of being refreshed for every net-worth request.
- Identical net-worth calculations are reused for 60 seconds in a bounded 50-entry cache.
- All process-local caches are bounded, cache only successful upstream results, and discard failed in-flight work.

For a warm repeat scan within the TTL, profile, Garden, Museum, and username GETs are served by the browser cache. If a request reaches the application server, the process cache avoids the corresponding upstream call. Cold-load behavior and returned data shapes are unchanged.

## Rendering and calculation changes

- Twenty-three result-only sections now use `next/dynamic`, including chat, comparison, snapshots, inventory, museum, collections, progression tools, and activity cards.
- Profile parsers for skills, Slayers, collections, pets, HOTM, HOTF, and comparison accessories are memoized by raw member-object identity.
- The recommendation evaluation hash is computed once per loaded result instead of on every render.
- Advisor profile data keeps a stable memoized identity, avoiding chat transport reconstruction during unrelated UI renders.

## LLM token changes

- Removed the duplicate current question from retrieved JSON because it is already present in model messages.
- Ranked deterministic recommendations remain ordered and authoritative, with the transmitted set bounded to the five most relevant entries.
- Deterministic planner goals remain ordered and authoritative, with transmitted context bounded to six relevant goals.
- Model conversation context is bounded to the most recent six messages and 1,500 characters per text part. Full local chat history remains available in the UI and local storage.
- The dense fixture represents a request with eight relevant recommendations and ten planner goals. The representative fixture contains one recommendation, showing the lower bound when caps do not apply.

## Safety and verification

- No parser output schemas, recommendation logic, displayed sections, pricing rules, or interaction flows were removed.
- Cache keys include request URL and API identity where applicable; net-worth keys include player, bank, member contents, and Museum contents.
- Cache behavior is covered by tests for in-flight coalescing, fresh-result reuse, object-identity memoization, and missing primitive input.
- Verification commands: `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

## Measurement limitations

Bundle size is a stable loading-time proxy, not a network timing claim. Real scan duration depends mostly on external APIs and the size of a player's encoded inventories. Production telemetry should measure p50/p95 scan duration, cache-hit ratios, and Web Vitals after deployment to quantify real-user improvements.
