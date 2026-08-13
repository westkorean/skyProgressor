import type { SimulationChange, SimulationImpact, SimulationProfile, SimulationResult, SimulationUnlock } from './types.ts';

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum));
const level = (value: number, maximum: number) => Math.floor(clamp(value, 0, maximum));
const clone = (profile: SimulationProfile): SimulationProfile => ({ magicalPower: Math.max(0, profile.magicalPower), skyblockLevel: profile.skyblockLevel, skills: { ...profile.skills }, skillCaps: profile.skillCaps ? Object.fromEntries(Object.entries(profile.skillCaps).map(([skill, caps]) => [skill, caps ? { ...caps } : caps])) : undefined, pets: profile.pets.map((pet) => ({ ...pet })) });
const impact = (id: string, label: string, before: number, after: number, unit: string, certainty: SimulationImpact['certainty']): SimulationImpact => ({ id, label, before, after, delta: after - before, unit, certainty });

// Formula published for accessory Power stat scaling. The selected Power still determines actual stats.
const magicalPowerFactor = (power: number) => power <= 0 ? 0 : 71.928 * Math.log(1 + 0.0019 * power) ** 1.2;

const FORAGING_UNLOCKS = [
  { id: 'birch-park', title: 'Birch Park', level: 1 },
  { id: 'spruce-woods', title: 'Spruce Woods', level: 2 },
  { id: 'savanna-woodland', title: 'Savanna Woodland', level: 3 },
  { id: 'dark-thicket', title: 'Dark Thicket', level: 4 },
  { id: 'jungle-island', title: 'Jungle Island', level: 5 },
] as const;

function simulateMagicalPower(original: SimulationProfile, change: Extract<SimulationChange, { type: 'set-magical-power' }>): SimulationResult {
  const simulated = clone(original);
  const before = Math.max(0, original.magicalPower);
  const after = Math.floor(clamp(change.target, before, 100_000));
  simulated.magicalPower = after;
  const beforeFactor = magicalPowerFactor(before);
  const afterFactor = magicalPowerFactor(after);
  const relativeGain = beforeFactor > 0 ? (afterFactor / beforeFactor - 1) * 100 : 0;
  return { applied: after > before, title: `Simulate ${after} Magical Power`, summary: after > before ? `Accessory Power scaling is estimated to improve by ${relativeGain.toFixed(1)}%.` : 'The target does not exceed current Magical Power.', originalProfile: clone(original), simulatedProfile: simulated, change, impacts: [impact('magical-power', 'Magical Power', before, after, 'MP', 'exact'), impact('tuning-points', 'Tuning Points from MP', Math.floor(before / 10), Math.floor(after / 10), 'points', 'exact'), impact('power-scaling', 'Accessory Power stat scaling', beforeFactor, afterFactor, 'factor', 'estimate')], unlocks: [], warnings: ['Actual Strength, Crit Damage, and other stats depend on the selected accessory Power.'] };
}

function simulateSkill(original: SimulationProfile, change: Extract<SimulationChange, { type: 'set-skill-level' }>): SimulationResult {
  const simulated = clone(original);
  const caps = original.skillCaps?.[change.skill];
  const absoluteCap = Math.max(1, caps?.absolute ?? 50);
  const currentCap = Math.min(absoluteCap, Math.max(1, caps?.current ?? absoluteCap));
  const before = level(original.skills[change.skill] ?? 0, currentCap);
  const after = level(change.target, absoluteCap);
  simulated.skills[change.skill] = Math.max(before, after);
  const finalLevel = simulated.skills[change.skill] ?? before;
  const skillName = change.skill.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const isForaging = change.skill.toLowerCase() === 'foraging';
  const unlocks: SimulationUnlock[] = isForaging ? FORAGING_UNLOCKS.filter((entry) => entry.level <= finalLevel).map((entry) => ({ id: entry.id, title: entry.title, requirement: `Foraging ${entry.level}`, newlyUnlocked: before < entry.level && finalLevel >= entry.level })) : [];
  const impacts = [impact(`${change.skill}-level`, `${skillName} level`, before, finalLevel, 'levels', 'exact')];
  if (isForaging) impacts.push(impact('foraging-fortune', 'Base Foraging Fortune from levels', before * 4, finalLevel * 4, 'fortune', 'exact'));
  const requiresCapUpgrade = finalLevel > currentCap;
  const summary = finalLevel <= before
    ? `The target does not exceed the current ${skillName} level.`
    : isForaging
      ? `The simulated increase adds ${(finalLevel - before) * 4} base Foraging Fortune from skill levels.`
      : `Previewing ${skillName} ${before} to ${finalLevel} from this profile's current data.`;
  const warnings = [
    ...(requiresCapUpgrade ? [`This profile is currently capped at ${currentCap}; reaching ${finalLevel} requires purchasing or unlocking the available cap upgrades.`] : []),
    'Only level effects represented in the simulator catalog are shown; XP, time, cost, and unlisted unlocks are not inferred.',
  ];
  return { applied: finalLevel > before, title: `Simulate ${skillName} ${finalLevel}`, summary, originalProfile: clone(original), simulatedProfile: simulated, change, impacts, unlocks, warnings };
}

const PET_EFFECTS: Record<string, { label: string; unit: string; perLevel: number; certainty: SimulationImpact['certainty']; summary: string }> = {
  ELEPHANT: { label: 'Active Elephant Farming Fortune', unit: 'fortune', perLevel: 1.5, certainty: 'exact', summary: 'Trunk Efficiency adds Farming Fortune while the pet is active.' },
  RABBIT: { label: 'Rabbit farming XP bonus', unit: '%', perLevel: 0.3, certainty: 'estimate', summary: 'Rabbit is useful when the goal is farming XP rather than crop drops.' },
  SILVERFISH: { label: 'Silverfish mining XP bonus', unit: '%', perLevel: 0.3, certainty: 'estimate', summary: 'Silverfish helps mining XP progression when it is active.' },
  MONKEY: { label: 'Monkey foraging efficiency', unit: 'score', perLevel: 1, certainty: 'estimate', summary: 'Monkey improves foraging flow, especially when paired with the right axe setup.' },
  ARMADILLO: { label: 'Armadillo mining mobility value', unit: 'score', perLevel: 1, certainty: 'estimate', summary: 'Armadillo is mainly a route and movement pet, so this is a qualitative progression value.' },
};

function simulateSkyblockLevel(original: SimulationProfile, change: Extract<SimulationChange, { type: 'set-skyblock-level' }>): SimulationResult {
  const simulated = clone(original);
  const before = Math.max(0, original.skyblockLevel ?? 0);
  const after = Math.floor(clamp(change.target, before, 500));
  simulated.skyblockLevel = after;
  return { applied: after > before, title: `Simulate SkyBlock Level ${after}`, summary: after > before ? `This previews ${after - before} SkyBlock levels of account-wide progression.` : 'The target does not exceed the current SkyBlock level.', originalProfile: clone(original), simulatedProfile: simulated, change, impacts: [impact('skyblock-level', 'SkyBlock Level', before, after, 'levels', 'exact'), impact('health-progress', 'Approximate profile stat growth', before * 5, after * 5, 'score', 'estimate')], unlocks: [], warnings: ['SkyBlock XP sources are broad; use the roadmap and missing sections to decide which tasks supply the levels.'] };
}

function simulatePet(original: SimulationProfile, change: Extract<SimulationChange, { type: 'acquire-pet' }>): SimulationResult {
  const simulated = clone(original);
  const petType = change.petType.toUpperCase();
  const petLevel = Math.max(1, level(change.level, 100));
  const effect = PET_EFFECTS[petType] ?? { label: `${petType.replace(/_/g, ' ')} pet level`, unit: 'levels', perLevel: 1, certainty: 'estimate' as const, summary: 'This pet is tracked as a general progression upgrade.' };
  const existing = original.pets.filter((pet) => pet.type.toUpperCase() === petType).sort((a, b) => b.level - a.level)[0];
  const existingValue = existing ? clamp(existing.level, 1, 100) * effect.perLevel : 0;
  const simulatedValue = Math.max(existingValue, petLevel * effect.perLevel);
  const applied = !existing || existing.tier !== change.tier || existing.level < petLevel;
  if (applied) simulated.pets.push({ type: petType, tier: change.tier, level: petLevel });
  const unlockTitle = petType === 'ELEPHANT' && change.tier === 'LEGENDARY' ? 'Trunk Efficiency perk' : `${petType.replace(/_/g, ' ')} pet`;
  return { applied, title: `Simulate ${change.tier} ${petType.replace(/_/g, ' ')}`, summary: `${effect.summary} Target level: ${petLevel}.`, originalProfile: clone(original), simulatedProfile: simulated, change, impacts: [impact(`${petType.toLowerCase()}-value`, effect.label, existingValue, simulatedValue, effect.unit, effect.certainty)], unlocks: [{ id: `${petType.toLowerCase()}-pet`, title: unlockTitle, requirement: `${change.tier} level ${petLevel}`, newlyUnlocked: !existing }], warnings: ['Pet benefits apply only when the pet is active or when its passive perk is relevant.', 'This simulation excludes purchase price, leveling time, and profile-specific pet item choices.'] };
}

export function simulateProfileChange(profile: SimulationProfile, change: SimulationChange): SimulationResult {
  const original = clone(profile);
  if (change.type === 'set-magical-power') return simulateMagicalPower(original, change);
  if (change.type === 'set-skill-level') return simulateSkill(original, change);
  if (change.type === 'set-skyblock-level') return simulateSkyblockLevel(original, change);
  return simulatePet(original, change);
}
