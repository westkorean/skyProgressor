export type ComparisonSide = 'left' | 'right' | 'equal';
export interface ComparisonArea {
  group: string;
  name: string;
  left: number;
  right: number;
  delta: number;
  unit: string;
  stronger: ComparisonSide;
}
export interface ProfileComparison {
  leftLabel: string;
  rightLabel: string;
  areas: ComparisonArea[];
  summary: { leftWins: number; rightWins: number; ties: number };
}

const rec = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const rows = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.map(rec) : [];
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const label = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

export function compareProfiles(leftLabel: string, left: unknown, rightLabel: string, right: unknown): ProfileComparison {
  const leftProfile = rec(left);
  const rightProfile = rec(right);
  const areas: ComparisonArea[] = [];
  const metric = (group: string, name: string, leftValue: number, rightValue: number, unit = '', lowerIsBetter = false) => {
    const raw = leftValue === rightValue ? 'equal' : leftValue > rightValue ? 'left' : 'right';
    const stronger = lowerIsBetter && raw !== 'equal' ? (raw === 'left' ? 'right' : 'left') : raw;
    areas.push({ group, name, left: Math.round(leftValue), right: Math.round(rightValue), delta: Math.round(leftValue - rightValue), unit, stronger });
  };

  const leftSkills = rows(leftProfile.skills);
  const rightSkills = rows(rightProfile.skills);
  metric('Overview', 'Skill Average', average(leftSkills.map(row => number(row.level))), average(rightSkills.map(row => number(row.level))), ' level');
  for (const skill of new Set([...leftSkills, ...rightSkills].map(row => String(row.skill ?? '')).filter(Boolean))) {
    metric('Skills', label(skill), number(leftSkills.find(row => row.skill === skill)?.level), number(rightSkills.find(row => row.skill === skill)?.level), ' level');
  }

  const leftSlayers = rows(leftProfile.slayers);
  const rightSlayers = rows(rightProfile.slayers);
  for (const slayer of new Set([...leftSlayers, ...rightSlayers].map(row => String(row.slayer ?? '')).filter(Boolean))) {
    metric('Slayers', label(slayer), number(leftSlayers.find(row => row.slayer === slayer)?.level), number(rightSlayers.find(row => row.slayer === slayer)?.level), ' level');
  }

  const leftCollections = rows(leftProfile.collections);
  const rightCollections = rows(rightProfile.collections);
  metric('Collections', 'Average Completion', average(leftCollections.map(row => number(row.progressPercent))), average(rightCollections.map(row => number(row.progressPercent))), '%');
  metric('Collections', 'Maxed Collections', leftCollections.filter(row => number(row.tier) >= number(row.maxTier) && number(row.maxTier) > 0).length, rightCollections.filter(row => number(row.tier) >= number(row.maxTier) && number(row.maxTier) > 0).length);

  const leftAccessories = rec(leftProfile.accessories);
  const rightAccessories = rec(rightProfile.accessories);
  metric('Accessories', 'Magical Power', number(leftAccessories.magicalPower), number(rightAccessories.magicalPower));
  metric('Accessories', 'Unique Accessories', number(leftAccessories.uniqueCount), number(rightAccessories.uniqueCount));
  metric('Accessories', 'Recombobulated', number(leftAccessories.recombobulatedCount), number(rightAccessories.recombobulatedCount));
  metric('Accessories', 'Missing Accessories', rows(leftAccessories.missingAccessories).length, rows(rightAccessories.missingAccessories).length, '', true);

  const leftPets = rows(leftProfile.pets);
  const rightPets = rows(rightProfile.pets);
  metric('Pets', 'Pet Average', average(leftPets.map(row => number(row.level))), average(rightPets.map(row => number(row.level))), ' level');
  metric('Pets', 'Level 100+ Pets', leftPets.filter(row => number(row.level) >= 100).length, rightPets.filter(row => number(row.level) >= 100).length);
  metric('Pets', 'Unique Pets', new Set(leftPets.map(row => row.type)).size, new Set(rightPets.map(row => row.type)).size);

  const leftHotm = rec(leftProfile.hotm); const rightHotm = rec(rightProfile.hotm);
  metric('Mining', 'HOTM Level', number(leftHotm.level), number(rightHotm.level), ' level');
  metric('Mining', 'Powder Spent', number(leftHotm.totalPowderSpent), number(rightHotm.totalPowderSpent));
  metric('Mining', 'Core of the Mountain', number(leftHotm.coreOfTheMountainLevel), number(rightHotm.coreOfTheMountainLevel), ' level');
  const leftHotf = rec(leftProfile.hotf); const rightHotf = rec(rightProfile.hotf);
  metric('Foraging', 'HOTF Level', number(leftHotf.level), number(rightHotf.level), ' level');
  metric('Foraging', 'Forest Whispers Spent', number(leftHotf.forestWhispersSpent), number(rightHotf.forestWhispersSpent));

  const leftGarden = rec(leftProfile.garden); const rightGarden = rec(rightProfile.garden);
  metric('Garden', 'Garden Level', number(leftGarden.level), number(rightGarden.level), ' level');
  metric('Garden', 'Visitors Accepted', number(rec(leftGarden.visitors).completed), number(rec(rightGarden.visitors).completed));
  metric('Garden', 'Average Crop Milestone', average(rows(leftGarden.cropMilestones).map(row => number(row.level))), average(rows(rightGarden.cropMilestones).map(row => number(row.level))), ' level');

  const leftFishing = rec(leftProfile.fishing); const rightFishing = rec(rightProfile.fishing);
  metric('Fishing', 'Fishing Level', number(leftFishing.level), number(rightFishing.level), ' level');
  metric('Fishing', 'Sea Creature Kills', number(leftFishing.seaCreatureKills), number(rightFishing.seaCreatureKills));
  metric('Fishing', 'Trophy Fish', number(rec(leftFishing.trophyFish).total), number(rec(rightFishing.trophyFish).total));

  metric('Overview', 'Overall Progress', number(rec(leftProfile.progressionScore).score), number(rec(rightProfile.progressionScore).score), '%');
  const summary = {
    leftWins: areas.filter(area => area.stronger === 'left').length,
    rightWins: areas.filter(area => area.stronger === 'right').length,
    ties: areas.filter(area => area.stronger === 'equal').length,
  };
  return { leftLabel, rightLabel, areas, summary };
}
