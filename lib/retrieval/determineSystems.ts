import { KNOWLEDGE_CATEGORIES } from '../../knowledge/schema.ts';
import type { RelevantSystem } from './types.ts';

const KEYWORDS: Record<RelevantSystem, string[]> = {
  combat: ['combat', 'damage', 'slayer', 'weapon', 'fight'],
  farming: ['farming', 'farm', 'crop', 'fortune', 'contest'],
  foraging: ['foraging', 'forest', 'tree', 'wood', 'axe'],
  mining: ['mining', 'mine', 'ore', 'gemstone', 'mithril'],
  fishing: ['fishing', 'fish', 'trophy', 'sea creature', 'rod'],
  dungeons: ['dungeon', 'dungeons', 'catacombs', 'floor', 'class'],
  slayers: ['slayer', 'rev', 'revenant', 'tara', 'sven', 'eman', 'vampire', 'blaze'],
  pets: ['pet', 'pets'],
  accessories: ['accessory', 'accessories', 'talisman', 'magical power', 'mp'],
  collections: ['collection', 'collections', 'recipe', 'minion'],
  hotm: ['hotm', 'heart of the mountain', 'powder', 'commission'],
  hotf: ['hotf', 'heart of the forest', 'forest whisper', 'galatea'],
  garden: ['garden', 'visitor', 'composter', 'plot', 'crop milestone'],
  rift: ['rift', 'timecharm', 'motes', 'vampire'],
  crimson: ['crimson', 'kuudra', 'reputation', 'mage faction', 'barbarian'],
  museum: ['museum', 'donation', 'donate'],
  economy: ['coin', 'coins', 'money', 'bazaar', 'auction', 'price', 'networth', 'nw', 'flip'],
};

const CATEGORY_ALIASES: Record<string, RelevantSystem | null> = {
  accessories: 'accessories', pets: 'pets', hotm: 'hotm', hotf: 'hotf',
  dungeons: 'dungeons', garden: 'garden', fishing: 'fishing', crimson: 'crimson',
  rift: 'rift', skills: null, slayers: 'slayers', collections: 'collections',
  museum: 'museum', economy: 'economy',
};

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const RELATED_SYSTEMS: Partial<Record<RelevantSystem, RelevantSystem[]>> = {
  hotm: ['mining'],
  hotf: ['foraging'],
  garden: ['farming'],
  slayers: ['combat'],
  crimson: ['combat'],
  museum: ['economy'],
};

export function determineRelevantSystems(question: string, playerData: unknown, limit = 4): RelevantSystem[] {
  const normalized = question.toLowerCase();
  const scored = KNOWLEDGE_CATEGORIES.map((system) => ({
    system,
    score: KEYWORDS[system].reduce((score, keyword) => score + (normalized.includes(keyword) ? keyword.split(' ').length + 1 : 0), 0),
  })).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.system.localeCompare(b.system));
  const selected = scored.map((entry) => entry.system);
  for (const system of [...selected]) {
    for (const related of RELATED_SYSTEMS[system] ?? []) if (!selected.includes(related)) selected.push(related);
  }

  const data = record(playerData);
  const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
  for (const value of recommendations) {
    const category = record(value)?.category;
    const mapped = typeof category === 'string' ? CATEGORY_ALIASES[category] : null;
    if (mapped && !selected.includes(mapped)) selected.push(mapped);
    if (selected.length >= limit) break;
  }

  return selected.slice(0, Math.max(1, Math.min(6, limit)));
}
