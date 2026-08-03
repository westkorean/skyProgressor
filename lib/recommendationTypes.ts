import type { BestiaryProgress } from './parseBestiary.ts';
import type { CollectionEntry } from './parseCollections.ts';
import type { InventoryData } from './parseInventory.ts';
import type { MinionProgress } from './parseMinions.ts';
import type { MuseumProgress } from './parseMuseum.ts';
import type { PetProgress } from './parsePets.ts';
import type {
  CatacombsProgress,
  FairySoulProgress,
  SkillProgress,
  SkyblockLevelProgress,
  SlayerProgress,
} from './parseProfile.ts';

export type RecommendationCategory =
  | 'accessories'
  | 'collections'
  | 'dungeons'
  | 'fairy-souls'
  | 'skills'
  | 'slayers'
  | 'minions'
  | 'bestiary'
  | 'museum'
  | 'pets';

export interface RecommendationFactors {
  progressionBenefit: number;
  necessity: number;
  ease: number;
  timeEfficiency: number;
  affordability: number;
  stageReadiness: number;
}

export interface RecommendationEvidence {
  label: string;
  value: string | number;
}

export interface ProgressionRecommendation {
  id: string;
  priority: number;
  category: RecommendationCategory;
  title: string;
  reason: string;
  evidence: RecommendationEvidence[];
  estimatedBenefit: string;
  knowledgeReferences: string[];
  factors: RecommendationFactors;
}

export interface ProgressionIssue {
  title: string;
  priority: number;
  category: RecommendationCategory;
  reason: string;
  evidence: RecommendationEvidence[];
  suggestedActions: string[];
  factors: RecommendationFactors;
}

export interface RecommendationProfile {
  skills: readonly SkillProgress[];
  slayers: readonly SlayerProgress[];
  catacombs: CatacombsProgress;
  fairySouls: FairySoulProgress;
  skyblockLevel: SkyblockLevelProgress;
  accessories: { magicalPower: number };
  collections: readonly CollectionEntry[];
  inventory?: InventoryData;
  minions?: MinionProgress;
  bestiary?: BestiaryProgress;
  museum?: MuseumProgress;
  pets?: readonly PetProgress[];
}
