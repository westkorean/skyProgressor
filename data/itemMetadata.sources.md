# Owned item metadata sources

- Structured item metadata: Hypixel SkyBlock items resource — https://api.hypixel.net/v2/resources/skyblock/items
- Wiki page matches, summaries, and file images: Hypixel SkyBlock Fandom MediaWiki API — https://hypixel-skyblock.fandom.com/api.php

Hypixel item metadata is cached in memory for six hours. Owned item lookups are
batched in groups of 40 and stored in a bounded in-memory cache of at most 3,000
entries. The cache contains item catalog metadata only; it does not permanently
store a player's inventory or UUID.

Fandom text and images are available under CC BY-SA unless otherwise noted on
the relevant page or file. When an exact page cannot be verified, the generated
metadata contains a Fandom search link and does not claim a page match.
