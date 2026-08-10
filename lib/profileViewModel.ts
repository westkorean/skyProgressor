import type { ProfileOverviewData } from '@/components/ProfileOverviewCard';
import type { OwnedItemMetadata } from './ownedItemMetadata.ts';
import type { AccessoriesData } from './parseAccessories.ts';
import type { BestiaryProgress } from './parseBestiary.ts';
import type { CollectionEntry } from './parseCollections.ts';
import type { CrimsonProgress } from './parseCrimson.ts';
import type { DungeonProgress } from './parseDungeons.ts';
import type { FishingProgress } from './parseFishing.ts';
import type { GardenProgress } from './parseGarden.ts';
import type { HOTFProgress } from './parseHOTF.ts';
import type { HOTMProgress } from './parseHOTM.ts';
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
import type { RiftProgress } from './parseRift.ts';
import type { ProgressPlanner } from './progressPlanner.ts';
import type { ProgressionRoadmap } from './progressionRoadmap.ts';
import type { ProgressionScore } from './progressionScore.ts';
import type { ProgressionIssue, ProgressionRecommendation } from './recommendationEngine.ts';
import type { DeterministicRecommendation } from './recommendations/index.ts';
import type { SkyProgressorAchievementSummary } from './skyProgressorAchievements.ts';
import type { Suggestion } from './getSuggestions.ts';
import type { LevelRecommendation } from './getSkyblockLevelRecommendations.ts';
import type { MarketPrices } from './marketPrices.ts';

export interface CoopMember {
  uuid: string;
  name: string;
  status: 'active' | 'former';
  departedAt: number | null;
}

export interface SkyBlockProfile {
  profile_id: string;
  cute_name: string;
  selected?: boolean;
  game_mode?: string;
  members?: Record<string, unknown>;
}

export interface ProfileViewModel {
  profileScopeKey: string;
  skills: SkillProgress[];
  slayers: SlayerProgress[];
  catacombs: CatacombsProgress;
  fairySouls: FairySoulProgress;
  suggestions: Suggestion[];
  skyblockLevel: SkyblockLevelProgress;
  levelRecommendations: LevelRecommendation[];
  pets: PetProgress[];
  accessories: AccessoriesData;
  dungeons: DungeonProgress;
  inventory: InventoryData;
  collections: CollectionEntry[];
  profileName: string;
  coopMembers: CoopMember[];
  overview: ProfileOverviewData;
  recommendations: ProgressionRecommendation[];
  progressionIssues: ProgressionIssue[];
  minions: MinionProgress;
  bestiary: BestiaryProgress;
  museum: MuseumProgress;
  itemMetadata: Record<string, OwnedItemMetadata>;
  marketPrices: MarketPrices;
  hotm: HOTMProgress;
  hotf: HOTFProgress;
  garden: GardenProgress;
  rift: RiftProgress;
  crimson: CrimsonProgress;
  fishing: FishingProgress;
  progressionScore: ProgressionScore;
  deterministicRecommendations: DeterministicRecommendation[];
  roadmap: ProgressionRoadmap;
  planner: ProgressPlanner;
  achievements: SkyProgressorAchievementSummary;
}
