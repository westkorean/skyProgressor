type JsonRecord = Record<string, unknown>;
const MAX_PLAYER_SUMMARY_CHARACTERS = 18_000;
const MAX_COMPACT_SUMMARY_CHARACTERS = 8_000;

const record = (value: unknown): JsonRecord | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;

const array = (value: unknown, limit: number): unknown[] =>
  Array.isArray(value) ? value.slice(0, limit) : [];

function inventoryItemSummary(value: unknown): JsonRecord | null {
  const item = record(value);
  if (!item) return null;
  return {
    section: item.section,
    slot: item.slot,
    skyblockId: item.skyblockId,
    name: item.name,
    count: item.count,
    rarity: item.rarity,
    stars: item.stars,
    reforge: item.reforge,
    dungeonLevel: item.dungeonLevel,
  };
}

function itemMetadataSummary(value: unknown): JsonRecord | null {
  const metadata = record(value);
  if (!metadata) return null;
  return {
    id: metadata.id,
    name: metadata.name,
    category: metadata.category,
    rarity: metadata.rarity,
    npcSellPrice: metadata.npcSellPrice,
    stats: metadata.stats,
  };
}

function petSummary(value: unknown): JsonRecord | null {
  const pet = record(value);
  if (!pet) return null;
  return {
    type: pet.type,
    name: pet.displayName,
    tier: pet.tier,
    level: pet.level,
    active: pet.active,
    heldItem: pet.heldItem,
  };
}

export function recommendationKnowledgeReferences(playerData: unknown): string[] {
  const data = record(playerData);
  const recommendations = array(data?.recommendations, 10);
  return [...new Set(recommendations.flatMap((value) => {
    const recommendation = record(value);
    return array(recommendation?.knowledgeReferences, 10)
      .filter((reference): reference is string => typeof reference === 'string');
  }))];
}

export function summarizePlayerData(playerData: unknown): string {
  const data = record(playerData);
  if (!data) return 'No player data available.';

  // The client sends a deliberately compact, already-parsed profile summary.
  // Deterministic recommendations are the only progression decisions exposed
  // to the model; raw inventories and the raw Hypixel member are excluded.
  if (record(data.profileSummary)) {
    const compact = {
      profileSummary: data.profileSummary,
      progressionScore: data.progressionScore,
      rankedRecommendations: array(data.recommendations, 12),
    };
    const serialized = JSON.stringify(compact);
    return serialized.length <= MAX_COMPACT_SUMMARY_CHARACTERS
      ? serialized
      : `${serialized.slice(0, MAX_COMPACT_SUMMARY_CHARACTERS)} [profile summary truncated]`;
  }

  const pets = array(data.pets, 60)
    .map(petSummary)
    .filter((pet): pet is JsonRecord => pet !== null)
    .sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)))
    .slice(0, 10);

  const inventory = record(data.inventory);
  const items = array(inventory?.items, 150)
    .map(inventoryItemSummary)
    .filter((item): item is JsonRecord => item !== null);
  const ownedIds = new Set(items
    .map((item) => item.skyblockId)
    .filter((id): id is string => typeof id === 'string'));
  const metadata = Object.fromEntries(
    Object.entries(record(data.itemMetadata) ?? {})
      .filter(([id]) => ownedIds.has(id))
      .slice(0, 100)
      .map(([id, value]) => [id, itemMetadataSummary(value)])
      .filter((entry): entry is [string, JsonRecord] => entry[1] !== null)
  );

  const summary = {
    skyblockLevel: data.skyblockLevel,
    skills: array(data.skills, 20),
    slayers: array(data.slayers, 10),
    catacombs: data.catacombs,
    fairySouls: data.fairySouls,
    accessories: data.accessories,
    activeAndTopPets: pets,
    inventoryOwnership: {
      sections: record(inventory?.sections) ?? {},
      items,
      metadata,
    },
    collections: array(data.collections, 15),
    recommendations: array(data.recommendations, 10),
    progressionIssues: array(data.progressionIssues, 10),
  };

  // Keep enough room in Groq's 12K TPM allowance for instructions, retrieved
  // knowledge, conversation history, and the generated answer.
  let serialized = JSON.stringify(summary);
  if (serialized.length <= MAX_PLAYER_SUMMARY_CHARACTERS) return serialized;

  summary.inventoryOwnership.metadata = {};
  summary.inventoryOwnership.items = items.slice(0, 60);
  serialized = JSON.stringify(summary);
  if (serialized.length <= MAX_PLAYER_SUMMARY_CHARACTERS) return serialized;

  summary.inventoryOwnership.items = items.slice(0, 25);
  serialized = JSON.stringify(summary);
  if (serialized.length <= MAX_PLAYER_SUMMARY_CHARACTERS) return serialized;

  return `${serialized.slice(0, MAX_PLAYER_SUMMARY_CHARACTERS)} [profile summary truncated]`;
}
