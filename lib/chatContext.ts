type JsonRecord = Record<string, unknown>;

const record = (value: unknown): JsonRecord | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;

const array = (value: unknown, limit: number): unknown[] =>
  Array.isArray(value) ? value.slice(0, limit) : [];

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

  const pets = array(data.pets, 60)
    .map(petSummary)
    .filter((pet): pet is JsonRecord => pet !== null)
    .sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)))
    .slice(0, 10);

  return JSON.stringify({
    skyblockLevel: data.skyblockLevel,
    skills: array(data.skills, 20),
    slayers: array(data.slayers, 10),
    catacombs: data.catacombs,
    fairySouls: data.fairySouls,
    accessories: data.accessories,
    activeAndTopPets: pets,
    inventoryOwnership: {
      sections: record(record(data.inventory)?.sections) ?? {},
      items: array(record(data.inventory)?.items, 750),
      metadata: Object.fromEntries(Object.entries(record(data.itemMetadata) ?? {}).slice(0, 750)),
    },
    collections: array(data.collections, 15),
    recommendations: array(data.recommendations, 10),
    progressionIssues: array(data.progressionIssues, 10),
  }, null, 2);
}
