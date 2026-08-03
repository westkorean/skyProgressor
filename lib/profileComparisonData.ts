import type { AccessoriesData } from './parseAccessories.ts';
import type { CollectionEntry } from './parseCollections.ts';
import type { FishingProgress } from './parseFishing.ts';
import type { GardenProgress } from './parseGarden.ts';
import type { HOTFProgress } from './parseHOTF.ts';
import type { HOTMProgress } from './parseHOTM.ts';
import type { PetProgress } from './parsePets.ts';
import type { SkillProgress, SlayerProgress } from './parseProfile.ts';
import { parseAccessories } from './parseAccessories.ts';
import { parseCollections } from './parseCollections.ts';
import { parseFishing } from './parseFishing.ts';
import { parseHOTF } from './parseHOTF.ts';
import { parseHOTM } from './parseHOTM.ts';
import { parsePets } from './parsePets.ts';
import { parseSkills, parseSlayers } from './parseProfile.ts';
import { memoizeProfileParser } from './profileParseCache.ts';

export interface ComparisonProfileData {
  skills: SkillProgress[];
  slayers: SlayerProgress[];
  collections: CollectionEntry[];
  accessories: AccessoriesData;
  pets: PetProgress[];
  hotm: HOTMProgress;
  hotf: HOTFProgress;
  garden: GardenProgress;
  fishing: FishingProgress;
  progressionScore: { score: number };
}

export interface ComparisonCandidate {
  id: string;
  label: string;
  data: ComparisonProfileData;
}

const cachedSkills = memoizeProfileParser(parseSkills);
const cachedSlayers = memoizeProfileParser(parseSlayers);
const cachedCollections = memoizeProfileParser(parseCollections);
const cachedPets = memoizeProfileParser(parsePets);
const cachedHotm = memoizeProfileParser(parseHOTM);
const cachedHotf = memoizeProfileParser(parseHOTF);
const cachedAccessories = memoizeProfileParser(parseAccessories);

function averageLevel(rows: readonly { level: number }[], maximum: number): number {
  return rows.length > 0
    ? rows.reduce((sum, row) => sum + row.level / maximum * 100, 0) / rows.length
    : 0;
}

function levelPercent(level: number, maximum: number): number {
  return maximum > 0 ? level / maximum * 100 : 0;
}

export function buildComparisonProfile(member: unknown, garden: GardenProgress): ComparisonProfileData {
  const skills = cachedSkills(member);
  const slayers = cachedSlayers(member);
  const collections = cachedCollections(member);
  const hotm = cachedHotm(member);
  const hotf = cachedHotf(member);
  const fishing = parseFishing(member, skills, collections);
  const accessories = cachedAccessories(member);
  const score = Math.round((
    averageLevel(skills, 60)
    + averageLevel(slayers, 9)
    + levelPercent(hotm.level, hotm.maxLevel)
    + levelPercent(hotf.level, hotf.maxLevel)
    + levelPercent(fishing.level, 50)
    + Math.min(100, accessories.magicalPower / 12)
    + levelPercent(garden.level, garden.maxLevel)
  ) / 7);

  return {
    skills,
    slayers,
    collections,
    accessories,
    pets: cachedPets(member),
    hotm,
    hotf,
    garden,
    fishing,
    progressionScore: { score },
  };
}
