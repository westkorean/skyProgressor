import { KNOWLEDGE_CATEGORIES } from '../../knowledge/schema.ts';
import type { RelevantSystem } from './types.ts';

const KEYWORDS: Record<RelevantSystem, string[]> = {
  combat: ['combat', 'damage', 'slayer', 'weapon', 'fight'],
  dungeons: ['dungeon', 'dungeons', 'catacombs', 'floor', 'class'],
  foraging: ['foraging', 'forest', 'tree', 'wood', 'axe', 'hotf'],
  mining: ['mining', 'mine', 'ore', 'gemstone', 'mithril', 'powder'],
  farming: ['farming', 'farm', 'crop', 'fortune', 'contest'],
  pets: ['pet', 'pets'],
  accessories: ['accessory', 'accessories', 'talisman', 'magical power', 'mp'],
  rift: ['rift', 'timecharm', 'motes', 'vampire'],
  garden: ['garden', 'visitor', 'composter', 'plot', 'crop milestone'],
  hotm: ['hotm', 'heart of the mountain', 'powder', 'commission'],
};

const CATEGORY_ALIASES: Record<string, RelevantSystem | null> = {
  accessories: 'accessories', pets: 'pets', hotm: 'hotm', hotf: 'foraging',
  dungeons: 'dungeons', garden: 'garden', fishing: null, crimson: 'combat',
  rift: 'rift', skills: null, slayers: 'combat', collections: null,
};

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

export function determineRelevantSystems(question: string, playerData: unknown, limit = 4): RelevantSystem[] {
  const normalized = question.toLowerCase();
  const scored = KNOWLEDGE_CATEGORIES.map((system) => ({
    system,
    score: KEYWORDS[system].reduce((score, keyword) => score + (normalized.includes(keyword) ? keyword.split(' ').length + 1 : 0), 0),
  })).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.system.localeCompare(b.system));
  const selected = scored.map((entry) => entry.system);

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
