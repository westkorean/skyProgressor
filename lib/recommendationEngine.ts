import type {
  CatacombsProgress,
  FairySoulProgress,
  SkillProgress,
  SlayerProgress,
  SkyblockLevelProgress,
} from './parseProfile';
import type { CollectionEntry } from './parseCollections';
import type { InventoryData, InventoryItem } from './parseInventory';
import type { MinionProgress } from './parseMinions';
import type { BestiaryProgress } from './parseBestiary';
import type { MuseumProgress } from './parseMuseum';
import type { PetProgress } from './parsePets';

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

const finite = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const clampPriority = (value: number): number =>
  Math.max(1, Math.min(100, Math.round(value)));

function scoredPriority(factors: RecommendationFactors): number {
  return clampPriority(
    factors.progressionBenefit * 0.3 +
    factors.necessity * 0.25 +
    factors.ease * 0.15 +
    factors.timeEfficiency * 0.1 +
    factors.affordability * 0.1 +
    factors.stageReadiness * 0.1
  );
}

const titleCase = (value: string): string =>
  value
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

type ProgressionStage = 'early' | 'mid' | 'late' | 'endgame';

const COSMETIC_SKILLS = new Set(['carpentry', 'runecrafting', 'social']);

function progressionStage(profile: RecommendationProfile): ProgressionStage {
  const combat = finite(profile.skills.find((skill) => skill.skill.toLowerCase() === 'combat')?.level);
  const level = finite(profile.skyblockLevel.level);
  const catacombs = finite(profile.catacombs.level);
  const magicalPower = finite(profile.accessories.magicalPower);
  if (level >= 240 && combat >= 50 && catacombs >= 36 && magicalPower >= 750) return 'endgame';
  if (level >= 150 && combat >= 40 && catacombs >= 24 && magicalPower >= 400) return 'late';
  if (level >= 60 && combat >= 25 && magicalPower >= 150) return 'mid';
  return 'early';
}

function magicalPowerRecommendation(
  profile: RecommendationProfile
): ProgressionRecommendation | null {
  const combatLevel = finite(
    profile.skills.find((skill) => skill.skill.toLowerCase() === 'combat')?.level
  );
  const magicalPower = finite(profile.accessories.magicalPower);
  // A transparent progression heuristic, not an LLM judgment: 12 MP per Combat
  // level, with a minimum target of 100 MP once Combat data is available.
  const target = combatLevel > 0 ? Math.max(100, combatLevel * 12) : 0;
  if (target === 0 || magicalPower >= target) return null;

  const deficitRatio = (target - magicalPower) / target;
  const factors: RecommendationFactors = { progressionBenefit: 90, necessity: 85, ease: 65, timeEfficiency: 70, affordability: clampPriority(75 - deficitRatio * 35), stageReadiness: 95 };
  return {
    id: 'increase-magical-power',
    priority: scoredPriority(factors),
    category: 'accessories',
    title: 'Increase Magical Power',
    reason: `Magical Power is below the deterministic target for Combat ${combatLevel}.`,
    evidence: [
      { label: 'Combat level', value: combatLevel },
      { label: 'Magical Power', value: magicalPower },
      { label: 'Rule target', value: target },
    ],
    estimatedBenefit: 'Higher accessory power and broadly improved combat stats.',
    knowledgeReferences: ['combat_progression', 'gear_upgrade_logic'],
    factors,
  };
}

function fairySoulRecommendation(
  profile: RecommendationProfile
): ProgressionRecommendation | null {
  const remaining = finite(profile.fairySouls.remaining);
  const total = finite(profile.fairySouls.total);
  if (remaining <= 0 || total <= 0) return null;

  const completion = 1 - remaining / total;
  const factors: RecommendationFactors = { progressionBenefit: 55, necessity: 45, ease: clampPriority(75 - remaining / 4), timeEfficiency: clampPriority(70 - remaining / 5), affordability: 100, stageReadiness: completion > 0.25 ? 95 : 75 };
  return {
    id: 'collect-fairy-souls',
    priority: scoredPriority(factors),
    category: 'fairy-souls',
    title: 'Collect Missing Fairy Souls',
    reason: `${remaining} known Fairy Souls remain uncollected.`,
    evidence: [
      { label: 'Collected', value: finite(profile.fairySouls.collected) },
      { label: 'Remaining', value: remaining },
    ],
    estimatedBenefit: 'Permanent profile progression from additional Fairy Soul exchanges.',
    knowledgeReferences: ['general_progression'],
    factors,
  };
}

function skillRecommendation(
  profile: RecommendationProfile
): ProgressionRecommendation | null {
  const skills = profile.skills.filter((skill) =>
    finite(skill.level) >= 0 && !COSMETIC_SKILLS.has(skill.skill.toLowerCase())
  );
  if (skills.length < 2) return null;
  const average = skills.reduce((sum, skill) => sum + finite(skill.level), 0) / skills.length;
  const weakest = [...skills].sort(
    (a, b) => finite(a.level) - finite(b.level) || a.skill.localeCompare(b.skill)
  )[0];
  const gap = average - finite(weakest.level);
  if (gap < 3) return null;

  const skillKnowledgeReferences: Record<string, string> = {
    combat: 'combat_progression',
    farming: 'farming_progression',
    foraging: 'foraging_current_meta',
    mining: 'mining_progression',
  };
  const knowledgeReference = skillKnowledgeReferences[weakest.skill.toLowerCase()];
  const factors: RecommendationFactors = { progressionBenefit: 60, necessity: 45, ease: clampPriority(80 - gap * 3), timeEfficiency: clampPriority(75 - gap * 3), affordability: 85, stageReadiness: 90 };
  return {
    id: `improve-${weakest.skill.toLowerCase()}`,
    priority: scoredPriority(factors),
    category: 'skills',
    title: `Improve ${titleCase(weakest.skill)}`,
    reason: `It is the lowest skill and is ${gap.toFixed(1)} levels below the profile's skill average.`,
    evidence: [
      { label: `${titleCase(weakest.skill)} level`, value: finite(weakest.level) },
      { label: 'Skill average', value: Number(average.toFixed(1)) },
    ],
    estimatedBenefit: 'Raises skill average and unlocks progression tied to this skill.',
    knowledgeReferences: knowledgeReference
      ? [knowledgeReference, 'general_progression']
      : ['general_progression'],
    factors,
  };
}

function slayerRecommendation(
  profile: RecommendationProfile
): ProgressionRecommendation | null {
  if (profile.slayers.length === 0) return null;
  const skyblockLevel = finite(profile.skyblockLevel.level);
  const combatLevel = finite(profile.skills.find((skill) => skill.skill.toLowerCase() === 'combat')?.level);
  const catacombsLevel = finite(profile.catacombs.level);
  const magicalPower = finite(profile.accessories.magicalPower);
  const stage = progressionStage(profile);
  const feasible = profile.slayers.filter((slayer) => {
    const id = slayer.slayer.toLowerCase();
    if (id.includes('blaze')) return stage === 'late' || stage === 'endgame'
      ? combatLevel >= 45 && catacombsLevel >= 30 && magicalPower >= 500
      : false;
    if (id.includes('enderman')) return combatLevel >= 30 && skyblockLevel >= 80 && magicalPower >= 250;
    if (id.includes('vampire')) return false; // Rift readiness is not represented in RecommendationProfile.
    return true;
  });
  if (feasible.length === 0) return null;
  const stageTarget: Record<ProgressionStage, number> = { early: 3, mid: 5, late: 6, endgame: 7 };
  const target = stageTarget[stage];
  const weakest = [...feasible].sort(
    (a, b) => finite(a.level) - finite(b.level) || a.slayer.localeCompare(b.slayer)
  )[0];
  const level = finite(weakest.level);
  if (level >= target) return null;

  const factors: RecommendationFactors = { progressionBenefit: 70, necessity: 55, ease: clampPriority(82 - (target - level) * 9), timeEfficiency: clampPriority(78 - (target - level) * 8), affordability: 65, stageReadiness: 90 };
  return {
    id: `level-${weakest.slayer.toLowerCase()}-slayer`,
    priority: scoredPriority(factors),
    category: 'slayers',
    title: `Level ${titleCase(weakest.slayer)} Slayer`,
    reason: `This is the lowest currently feasible Slayer and is below the deterministic ${stage}-stage target.`,
    evidence: [
      { label: `${titleCase(weakest.slayer)} level`, value: level },
      { label: 'Rule target', value: target },
      { label: 'SkyBlock Level', value: skyblockLevel },
      { label: 'Progression stage', value: stage },
    ],
    estimatedBenefit: 'Unlocks Slayer rewards and contributes to broader profile progression.',
    knowledgeReferences: ['slayer_progression', 'slayer_setup'],
    factors,
  };
}

function dungeonRecommendation(
  profile: RecommendationProfile
): ProgressionRecommendation | null {
  const combatLevel = finite(
    profile.skills.find((skill) => skill.skill.toLowerCase() === 'combat')?.level
  );
  const catacombsLevel = finite(profile.catacombs.level);
  const target = combatLevel >= 45 ? 30 : combatLevel >= 35 ? 24 : combatLevel >= 25 ? 15 : 0;
  if (target === 0 || catacombsLevel >= target) return null;

  const deficit = target - catacombsLevel;
  const factors: RecommendationFactors = { progressionBenefit: 75, necessity: 65, ease: clampPriority(75 - deficit * 3), timeEfficiency: clampPriority(70 - deficit * 3), affordability: 85, stageReadiness: 90 };
  return {
    id: 'raise-catacombs-level',
    priority: scoredPriority(factors),
    category: 'dungeons',
    title: 'Raise Catacombs Level',
    reason: `Catacombs progression trails the rule target for Combat ${combatLevel}.`,
    evidence: [
      { label: 'Combat level', value: combatLevel },
      { label: 'Catacombs level', value: catacombsLevel },
      { label: 'Rule target', value: target },
    ],
    estimatedBenefit: 'Improves dungeon scaling and access to stronger dungeon progression.',
    knowledgeReferences: ['dungeon_progression', 'dungeon_classes'],
    factors,
  };
}

type ArmorPiece = 'helmet' | 'chestplate' | 'leggings' | 'boots';

function armorPiece(item: InventoryItem): ArmorPiece | null {
  const text = `${item.skyblockId ?? ''} ${item.displayName ?? ''} ${item.lore.join(' ')}`;
  if (/\bHELMET\b/i.test(text)) return 'helmet';
  if (/\bCHESTPLATE\b/i.test(text)) return 'chestplate';
  if (/\bLEGGINGS\b/i.test(text)) return 'leggings';
  if (/\bBOOTS\b/i.test(text)) return 'boots';
  return null;
}

function isDungeonPiece(item: InventoryItem): boolean {
  return item.stars > 0 || item.dungeonLevel !== null || item.lore.some((line) => /\bDUNGEON (?:HELMET|CHESTPLATE|LEGGINGS|BOOTS)\b/i.test(line));
}

type ArmorAssessment = { label: string; armor: InventoryItem[]; dungeonPieces: number; totalStars: number };

function assessArmor(label: string, armor: InventoryItem[]): ArmorAssessment {
  return {
    label,
    armor,
    dungeonPieces: armor.filter(isDungeonPiece).length,
    totalStars: armor.reduce((sum, item) => sum + finite(item.stars), 0),
  };
}

function bestOwnedArmor(profile: RecommendationProfile): ArmorAssessment {
  const inventory = profile.inventory;
  if (!inventory) return assessArmor('None', []);
  const candidates: ArmorAssessment[] = [];
  const active = inventory.armor.items.filter((item) => armorPiece(item) !== null).slice(0, 4);
  candidates.push(assessArmor('Active armor', active));

  const wardrobeSets = new Map<number, InventoryItem[]>();
  for (const item of inventory.wardrobe?.items ?? []) {
    if (armorPiece(item) === null) continue;
    const setIndex = Math.floor((item.slot ?? item.index) / 4);
    const set = wardrobeSets.get(setIndex) ?? [];
    set.push(item);
    wardrobeSets.set(setIndex, set);
  }
  for (const [setIndex, items] of wardrobeSets) candidates.push(assessArmor(`Wardrobe set ${setIndex + 1}`, items));

  const bestByPiece = new Map<ArmorPiece, InventoryItem>();
  for (const section of [inventory.inventory, inventory.enderChest, inventory.accessoryBag, inventory.equipment]) {
    if (!section) continue;
    for (const item of section.items) {
      const piece = armorPiece(item);
      if (!piece) continue;
      const current = bestByPiece.get(piece);
      const score = (isDungeonPiece(item) ? 100 : 0) + item.stars;
      const currentScore = current ? (isDungeonPiece(current) ? 100 : 0) + current.stars : -1;
      if (score > currentScore) bestByPiece.set(piece, item);
    }
  }
  if (bestByPiece.size > 0) candidates.push(assessArmor('Owned storage pieces', [...bestByPiece.values()]));

  return candidates.sort((left, right) =>
    right.dungeonPieces - left.dungeonPieces ||
    right.armor.length - left.armor.length ||
    right.totalStars - left.totalStars ||
    left.label.localeCompare(right.label)
  )[0];
}

function dungeonGearRecommendation(
  profile: RecommendationProfile
): ProgressionRecommendation | null {
  if (!profile.inventory || finite(profile.catacombs.level) < 10) return null;

  const best = bestOwnedArmor(profile);
  const armor = best.armor;
  const dungeonPieces = best.dungeonPieces;
  const totalStars = best.totalStars;
  if (armor.length === 4 && dungeonPieces === 4 && totalStars >= 10) return null;

  const missingPieces = 4 - armor.length;
  const factors: RecommendationFactors = { progressionBenefit: 85, necessity: 80, ease: clampPriority(70 - missingPieces * 12), timeEfficiency: clampPriority(65 - missingPieces * 10), affordability: clampPriority(60 - missingPieces * 8), stageReadiness: 90 };
  return {
    id: 'improve-dungeon-gear',
    priority: scoredPriority(factors),
    category: 'dungeons',
    title: 'Improve Dungeon Gear',
    reason: 'No complete owned armor set meets the deterministic dungeon-ready rule for a Catacombs 10+ profile.',
    evidence: [
      { label: 'Catacombs level', value: finite(profile.catacombs.level) },
      { label: 'Best owned set', value: best.label },
      { label: 'Equipped armor pieces', value: armor.length },
      { label: 'Dungeon-ready pieces', value: dungeonPieces },
      { label: 'Total armor stars', value: totalStars },
    ],
    estimatedBenefit: 'Better dungeon survivability and damage scaling from equipped armor.',
    knowledgeReferences: ['gear_upgrade_logic', 'dungeon_progression', 'dungeon_setup_archer', 'dungeon_setup_mage', 'dungeon_setup_berserk'],
    factors,
  };
}

function collectionRecommendation(
  profile: RecommendationProfile
): ProgressionRecommendation | null {
  const closest = profile.collections
    .filter(
      (entry) =>
        entry.nextTierRequirement !== null &&
        entry.remaining !== null &&
        finite(entry.remaining) > 0 &&
        finite(entry.progressPercent) >= 70
    )
    .sort(
      (a, b) =>
        finite(b.progressPercent) - finite(a.progressPercent) ||
        finite(a.remaining) - finite(b.remaining) ||
        a.rawKey.localeCompare(b.rawKey)
    )[0];
  if (!closest) return null;

  const factors: RecommendationFactors = { progressionBenefit: 60, necessity: 40, ease: clampPriority(finite(closest.progressPercent)), timeEfficiency: clampPriority(finite(closest.progressPercent)), affordability: 90, stageReadiness: 100 };
  return {
    id: `finish-collection-${closest.rawKey.toLowerCase()}`,
    priority: scoredPriority(factors),
    category: 'collections',
    title: `Finish ${closest.name} Collection Tier`,
    reason: 'This is the closest collection tier at or above 70% completion.',
    evidence: [
      { label: 'Progress', value: `${finite(closest.progressPercent)}%` },
      { label: 'Remaining', value: finite(closest.remaining) },
      { label: 'Next tier', value: (closest.tier ?? 0) + 1 },
    ],
    estimatedBenefit: closest.nextReward
      ? `Unlocks: ${closest.nextReward}`
      : 'Completes the next collection tier and its associated progression.',
    knowledgeReferences: ['general_progression'],
    factors,
  };
}

function minionRecommendation(profile: RecommendationProfile): ProgressionRecommendation | null {
  const minions = profile.minions;
  const remaining = minions?.craftsUntilNextSlot;
  if (!minions || typeof remaining !== 'number' || remaining <= 0 || remaining > 10) return null;
  const priced = minions.cheapestMissingUpgrades[0];
  const cost = priced?.estimatedCost ?? null;
  const affordability = cost === null ? 55 : cost <= 100_000 ? 95 : cost <= 1_000_000 ? 80 : cost <= 10_000_000 ? 55 : 25;
  const factors: RecommendationFactors = { progressionBenefit: 78, necessity: 60, ease: clampPriority(100 - remaining * 7), timeEfficiency: clampPriority(95 - remaining * 6), affordability, stageReadiness: 100 };
  return {
    id: 'unlock-next-minion-slot', priority: scoredPriority(factors), category: 'minions',
    title: 'Unlock the Next Minion Slot',
    reason: `Only ${remaining} unique minion craft${remaining === 1 ? '' : 's'} remain before the next estimated slot.`,
    evidence: [{ label: 'Unique crafts', value: minions.uniqueCrafts }, { label: 'Crafts remaining', value: remaining }, ...(cost === null ? [] : [{ label: 'Cheapest verified upgrade', value: Math.round(cost) }])],
    estimatedBenefit: 'Adds permanent minion capacity and contributes SkyBlock progression.',
    knowledgeReferences: ['general_progression'], factors,
  };
}

function bestiaryRecommendation(profile: RecommendationProfile): ProgressionRecommendation | null {
  const bestiary = profile.bestiary;
  const closest = bestiary?.closestMilestone;
  const remaining = closest?.remainingKills;
  const stage = progressionStage(profile);
  if (stage === 'early' || stage === 'mid') return null;
  const limit = stage === 'late' ? 75 : 250;
  if (!bestiary?.available || !closest || typeof remaining !== 'number' || remaining <= 0 || remaining > limit) return null;
  const familyCompletion = bestiary.totalFamilies > 0 ? bestiary.unlockedFamilies / bestiary.totalFamilies : 0;
  const factors: RecommendationFactors = {
    progressionBenefit: stage === 'endgame' ? 52 : 32,
    necessity: stage === 'endgame' ? clampPriority(45 - familyCompletion * 20) : 8,
    ease: clampPriority(100 - remaining / 3),
    timeEfficiency: clampPriority(95 - remaining / 3),
    affordability: 100,
    stageReadiness: stage === 'endgame' ? 100 : 75,
  };
  return {
    id: `bestiary-${closest.id.toLowerCase()}`, priority: scoredPriority(factors), category: 'bestiary',
    title: `Complete the Next ${closest.name} Bestiary Tier`,
    reason: stage === 'endgame'
      ? 'Bestiary completion is now relevant as an endgame maxing goal; kill distance only estimates task convenience.'
      : 'This is an optional late-game completion task, not a core progression requirement.',
    evidence: [{ label: 'Current tier', value: closest.tier }, { label: 'Kills remaining', value: remaining }, { label: 'Bestiary level', value: bestiary.bestiaryLevel }, { label: 'Families discovered', value: `${bestiary.unlockedFamilies}/${bestiary.totalFamilies}` }, { label: 'Progression stage', value: stage }],
    estimatedBenefit: 'Awards Bestiary progression and associated SkyBlock XP.',
    knowledgeReferences: ['general_progression'], factors,
  };
}

function museumRecommendation(profile: RecommendationProfile): ProgressionRecommendation | null {
  const museum = profile.museum;
  const donation = museum?.cheapestNextDonation;
  if (!museum?.available || !donation || donation.estimatedCost > 5_000_000) return null;
  const affordability = donation.estimatedCost <= 100_000 ? 100 : donation.estimatedCost <= 1_000_000 ? 85 : 60;
  const factors: RecommendationFactors = { progressionBenefit: 45, necessity: 25, ease: 90, timeEfficiency: 90, affordability, stageReadiness: 100 };
  return {
    id: `museum-${donation.id.toLowerCase()}`, priority: scoredPriority(factors), category: 'museum',
    title: `Consider Donating ${donation.name}`,
    reason: 'This is the cheapest currently priceable missing Museum donation below the spending safety cap.',
    evidence: [{ label: 'Estimated cost', value: Math.round(donation.estimatedCost) }, { label: 'Donation XP', value: donation.donationXp ?? 'Unknown' }],
    estimatedBenefit: 'Adds Museum completion and any verified donation SkyBlock XP.',
    knowledgeReferences: ['general_progression'], factors,
  };
}

function petRecommendation(profile: RecommendationProfile): ProgressionRecommendation | null {
  const pets = profile.pets;
  if (!pets || pets.length === 0 || pets.some((pet) => pet.active)) return null;
  const factors: RecommendationFactors = { progressionBenefit: 55, necessity: 65, ease: 100, timeEfficiency: 100, affordability: 100, stageReadiness: 100 };
  return {
    id: 'equip-owned-pet', priority: scoredPriority(factors), category: 'pets', title: 'Equip an Owned Pet',
    reason: 'The profile owns pets but none is marked active.',
    evidence: [{ label: 'Owned pets', value: pets.length }], estimatedBenefit: 'Uses an already-owned pet benefit with no purchase required.',
    knowledgeReferences: ['general_progression'], factors,
  };
}

export function getProgressionRecommendations(
  profile: RecommendationProfile
): ProgressionRecommendation[] {
  const candidates = [
    magicalPowerRecommendation(profile),
    fairySoulRecommendation(profile),
    skillRecommendation(profile),
    slayerRecommendation(profile),
    dungeonRecommendation(profile),
    dungeonGearRecommendation(profile),
    collectionRecommendation(profile),
    minionRecommendation(profile),
    bestiaryRecommendation(profile),
    museumRecommendation(profile),
    petRecommendation(profile),
  ].filter((value): value is ProgressionRecommendation => value !== null);

  return candidates.sort(
    (a, b) => b.priority - a.priority || a.id.localeCompare(b.id)
  );
}

const ACTIONS: Record<RecommendationCategory, string[]> = {
  accessories: ['Review missing accessories', 'Prioritize cost-effective Magical Power upgrades'],
  collections: ['Collect the remaining materials for the next tier', 'Claim the collection unlock'],
  dungeons: ['Run the highest consistently completable floor', 'Improve dungeon class and gear requirements together'],
  'fairy-souls': ['Collect the remaining Fairy Souls', 'Exchange completed soul milestones'],
  skills: ['Train the identified lowest skill', 'Use progression appropriate to the retrieved skill knowledge'],
  slayers: ['Run a reliably completable Slayer tier', 'Use a boss-specific setup from retrieved knowledge'],
  minions: ['Craft the cheapest missing minion tiers', 'Stop after reaching the next slot threshold'],
  bestiary: ['Target the closest verified family milestone', 'Use an area appropriate to the player setup'],
  museum: ['Verify the item is not needed elsewhere', 'Donate only within the stated spending cap'],
  pets: ['Equip an owned pet that matches the current activity'],
};

export function getProgressionIssues(profile: RecommendationProfile): ProgressionIssue[] {
  return getProgressionRecommendations(profile).map((recommendation) => ({
    title: recommendation.title,
    priority: recommendation.priority,
    category: recommendation.category,
    reason: recommendation.reason,
    evidence: recommendation.evidence,
    suggestedActions: [...ACTIONS[recommendation.category]],
    factors: recommendation.factors,
  }));
}
