import type { RelevantSystem, RetrievedProfileEvidence } from './types.ts';

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
const scalar = (value: unknown): value is string | number | boolean => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

function add(evidence: RetrievedProfileEvidence[], system: RelevantSystem, label: string, value: unknown) {
  if (scalar(value) && Number.isFinite(typeof value === 'number' ? value : 0)) evidence.push({ system, label, value });
}

export function retrieveProfileEvidence(playerData: unknown, systems: readonly RelevantSystem[], limit = 24): RetrievedProfileEvidence[] {
  const data = record(playerData);
  const profile = record(data?.profileSummary) ?? data;
  const evidence: RetrievedProfileEvidence[] = [];
  const skills = Array.isArray(profile?.skills) ? profile.skills.map(record).filter((value): value is JsonRecord => value !== null) : [];
  const skill = (name: string) => skills.find((entry) => String(entry.skill).toLowerCase() === name)?.level;

  for (const system of systems) {
    if (system === 'combat') { add(evidence, system, 'Combat level', skill('combat')); add(evidence, system, 'Catacombs level', record(profile?.catacombs)?.level); add(evidence, system, 'Magical Power', record(profile?.accessories)?.magicalPower); }
    if (system === 'dungeons') add(evidence, system, 'Catacombs level', record(profile?.catacombs)?.level);
    if (system === 'foraging') { add(evidence, system, 'Foraging level', skill('foraging')); add(evidence, system, 'HOTF level', record(profile?.hotf)?.level); }
    if (system === 'mining') { add(evidence, system, 'Mining level', skill('mining')); add(evidence, system, 'HOTM level', record(profile?.hotm)?.level); }
    if (system === 'farming') { add(evidence, system, 'Farming level', skill('farming')); add(evidence, system, 'Garden level', record(profile?.garden)?.level); }
    if (system === 'accessories') add(evidence, system, 'Magical Power', record(profile?.accessories)?.magicalPower);
    if (system === 'garden') { add(evidence, system, 'Garden level', record(profile?.garden)?.level); add(evidence, system, 'Visitors completed', record(record(profile?.garden)?.visitors)?.completed); }
    if (system === 'hotm') { add(evidence, system, 'HOTM level', record(profile?.hotm)?.level); add(evidence, system, 'Powder spent', record(profile?.hotm)?.totalPowderSpent); }
    if (system === 'rift') { add(evidence, system, 'Rift completion', record(profile?.rift)?.completionPercent); add(evidence, system, 'Timecharms found', record(profile?.rift)?.timecharmsFound); }
    if (system === 'pets') {
      const pets = Array.isArray(data?.pets) ? data.pets.map(record).filter((value): value is JsonRecord => value !== null) : [];
      const active = pets.find((pet) => pet.active === true);
      add(evidence, system, 'Active pet', active?.displayName ?? 'None'); add(evidence, system, 'Active pet level', active?.level ?? 0);
    }
  }

  const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
  for (const recommendationValue of recommendations) {
    const recommendation = record(recommendationValue);
    const category = recommendation?.category;
    const matchingSystem = systems.find((system) => category === system || (category === 'slayers' && system === 'combat') || (category === 'hotf' && system === 'foraging'));
    if (!matchingSystem || !Array.isArray(recommendation?.evidence)) continue;
    for (const itemValue of recommendation.evidence) {
      const item = record(itemValue);
      if (typeof item?.label === 'string') add(evidence, matchingSystem, item.label, item.value);
    }
  }
  return evidence.filter((entry, index, all) => all.findIndex((candidate) => candidate.system === entry.system && candidate.label === entry.label && candidate.value === entry.value) === index).slice(0, limit);
}
