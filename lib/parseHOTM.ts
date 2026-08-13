export type PowderType = 'mithril' | 'gemstone' | 'glacite';

export interface HOTMPowder {
  available: number;
  spent: number;
  total: number;
}

export interface HOTMPerk {
  id: string;
  name: string;
  level: number;
  maxLevel: number | null;
  description: string;
  powder: PowderType | null;
  costToNextLevel: number | null;
  enabled: boolean;
}

export interface HOTMTreeSlot {
  slot: number;
  perks: HOTMPerk[];
}

export interface HOTMProgress {
  available: boolean;
  level: number;
  maxLevel: number;
  currentXp: number;
  xpIntoLevel: number;
  xpToNextLevel: number | null;
  progressPercent: number;
  powder: Record<PowderType, HOTMPowder>;
  totalPowderSpent: number;
  coreOfTheMountainLevel: number;
  miningSpeed: number;
  miningFortune: number;
  miningSpeedBoost: number;
  dailyPowder: number;
  pickaxeAbility: string | null;
  selectedTreeSlot: number;
  perks: HOTMPerk[];
  treeSlots: HOTMTreeSlot[];
  rawFields: Readonly<Record<string, unknown>>;
}

type PerkDefinition = { name: string; max: number; description: string; powder?: PowderType; baseCost?: number; scale?: number };
const PERKS: Record<string, PerkDefinition> = {
  mining_speed: { name: 'Mining Speed', max: 50, description: 'Grants Mining Speed.', powder: 'mithril', baseCost: 8, scale: 2.4 },
  mining_fortune: { name: 'Mining Fortune', max: 50, description: 'Grants Mining Fortune.', powder: 'mithril', baseCost: 8, scale: 2.4 },
  titanium_insanium: { name: 'Titanium Insanium', max: 50, description: 'Increases the chance for Titanium to appear.', powder: 'mithril', baseCost: 10, scale: 2.4 },
  mining_speed_boost: { name: 'Mining Speed Boost', max: 1, description: 'Pickaxe ability that temporarily grants Mining Speed.' },
  vein_seeker: { name: 'Vein Seeker', max: 1, description: 'Pickaxe ability that points toward nearby ore veins.' },
  maniac_miner: { name: 'Maniac Miner', max: 1, description: 'Pickaxe ability that converts Mana into Mining Speed.' },
  pickaxe_toss: { name: 'Pickobulus', max: 1, description: 'Pickaxe ability that mines nearby ores.' },
  daily_powder: { name: 'Daily Powder', max: 100, description: 'Grants bonus powder from the first ore mined each day.', powder: 'mithril', baseCost: 10, scale: 2.1 },
  efficient_miner: { name: 'Efficient Miner', max: 100, description: 'Chance to mine nearby connected ores.', powder: 'mithril', baseCost: 14, scale: 2.0 },
  experience_orbs: { name: 'Quick Forge', max: 20, description: 'Reduces forge time.', powder: 'mithril', baseCost: 20, scale: 2.0 },
  forge_time: { name: 'Quick Forge', max: 20, description: 'Reduces forge time.', powder: 'mithril', baseCost: 20, scale: 2.0 },
  fallen_star_bonus: { name: 'Sky Mall', max: 1, description: 'Grants a rotating mining bonus.' },
  daily_effect: { name: 'Sky Mall', max: 1, description: 'Grants a rotating mining bonus.' },
  sky_mall: { name: 'Sky Mall', max: 1, description: 'Grants a rotating mining bonus.' },
  skymall: { name: 'Sky Mall', max: 1, description: 'Grants a rotating mining bonus.' },
  professional: { name: 'Professional', max: 140, description: 'Grants Mining Speed while mining gemstones.', powder: 'gemstone', baseCost: 25, scale: 2.0 },
  mole: { name: 'Mole', max: 190, description: 'Chance to mine extra hard stone blocks.', powder: 'gemstone', baseCost: 20, scale: 2.0 },
  fortunate: { name: 'Fortunate', max: 20, description: 'Grants Mining Fortune.', powder: 'gemstone', baseCost: 20, scale: 2.2 },
  great_explorer: { name: 'Great Explorer', max: 20, description: 'Improves treasure chest discovery and opening.', powder: 'gemstone', baseCost: 20, scale: 2.2 },
  lonesome_miner: { name: 'Lonesome Miner', max: 45, description: 'Improves combat stats on mining islands.', powder: 'gemstone', baseCost: 30, scale: 2.1 },
  mining_madness: { name: 'Mining Madness', max: 1, description: 'Grants Mining Speed and Mining Fortune.' },
  goblin_killer: { name: 'Goblin Killer', max: 1, description: 'Grants powder when defeating goblins.' },
  powder_buff: { name: 'Powder Buff', max: 50, description: 'Increases powder gained.', powder: 'gemstone', baseCost: 50, scale: 2.0 },
  front_loaded: { name: 'Front Loaded', max: 1, description: 'Grants mining stats early in a mining session.' },
  star_powder: { name: 'Star Powder', max: 1, description: 'Grants powder while mining near Fallen Stars.' },
  precision_mining: { name: 'Precision Mining', max: 1, description: 'Rewards accurately mining highlighted blocks.' },
  mining_speed_2: { name: 'Mining Speed II', max: 50, description: 'Grants additional Mining Speed.', powder: 'gemstone', baseCost: 40, scale: 2.3 },
  mining_fortune_2: { name: 'Mining Fortune II', max: 50, description: 'Grants additional Mining Fortune.', powder: 'gemstone', baseCost: 40, scale: 2.3 },
  mining_experience: { name: 'Seasoned Mineman', max: 100, description: 'Increases Mining experience.', powder: 'mithril', baseCost: 20, scale: 2.0 },
  random_event: { name: 'Luck of the Cave', max: 45, description: 'Increases the chance of mining events.', powder: 'mithril', baseCost: 15, scale: 2.1 },
  special_0: { name: 'Core of the Mountain', max: 10, description: 'Unlocks permanent Heart of the Mountain bonuses.' },
  core_of_the_mountain: { name: 'Core of the Mountain', max: 10, description: 'Unlocks permanent Heart of the Mountain bonuses.' },
  pickobulus: { name: 'Pickobulus', max: 1, description: 'Pickaxe ability that mines nearby ores.' },
  quick_forge: { name: 'Quick Forge', max: 20, description: 'Reduces forge time.', powder: 'mithril', baseCost: 20, scale: 2 },
  seasoned_mineman: { name: 'Seasoned Mineman', max: 100, description: 'Increases Mining experience.', powder: 'mithril', baseCost: 20, scale: 2 },
  luck_of_the_cave: { name: 'Luck of the Cave', max: 45, description: 'Increases the chance of mining events.', powder: 'mithril', baseCost: 15, scale: 2.1 },
  old_school: { name: 'Old-School', max: 20, description: 'Grants Ore Fortune.', powder: 'gemstone', baseCost: 20, scale: 2.2 },
  gem_lover: { name: 'Gem Lover', max: 20, description: 'Grants Gemstone Fortune.', powder: 'gemstone', baseCost: 20, scale: 2.2 },
  daily_grind: { name: 'Daily Grind', max: 1, description: 'Grants powder from daily mining activity.' },
  anomalous_desire: { name: 'Anomalous Desire', max: 1, description: 'Pickaxe ability that increases the chance of mining events.' },
  blockhead: { name: 'Blockhead', max: 20, description: 'Grants Block Fortune.', powder: 'gemstone', baseCost: 20, scale: 2.2 },
  subterranean_fisher: { name: 'Subterranean Fisher', max: 40, description: 'Grants Fishing Speed and Sea Creature Chance in mining areas.', powder: 'gemstone', baseCost: 30, scale: 2.1 },
  keep_it_cool: { name: 'Keep It Cool', max: 50, description: 'Grants Heat Resistance.', powder: 'gemstone', baseCost: 30, scale: 2.1 },
  speedy_mineman: { name: 'Speedy Mineman', max: 50, description: 'Grants additional Mining Speed.', powder: 'gemstone', baseCost: 40, scale: 2.3 },
  fortunate_mineman: { name: 'Fortunate Mineman', max: 50, description: 'Grants additional Mining Fortune.', powder: 'gemstone', baseCost: 40, scale: 2.3 },
  miners_blessing: { name: "Miner's Blessing", max: 1, description: 'Grants Magic Find while on Mining Islands.' },
  no_stone_unturned: { name: 'No Stone Unturned', max: 50, description: 'Improves fossil and excavation-related discovery.', powder: 'glacite', baseCost: 40, scale: 2.2 },
  strong_arm: { name: 'Strong Arm', max: 50, description: 'Improves mining with Dwarven Metals.', powder: 'glacite', baseCost: 40, scale: 2.2 },
  steady_hand: { name: 'Steady Hand', max: 100, description: 'Grants a chance for Gemstone Spread in Glacite Mineshafts.', powder: 'glacite', baseCost: 45, scale: 2.1 },
  surveyor: { name: 'Surveyor', max: 20, description: 'Improves Glacite Mineshaft discovery.', powder: 'glacite', baseCost: 40, scale: 2.2 },
  cold_hearted: { name: 'Cold-Hearted', max: 50, description: 'Grants Cold Resistance.', powder: 'glacite', baseCost: 40, scale: 2.2 },
  warm_hearted: { name: 'Cold-Hearted', max: 50, description: 'Grants Cold Resistance.', powder: 'glacite', baseCost: 40, scale: 2.2 },
  mineshaft_mayhem: { name: 'Mineshaft Mayhem', max: 1, description: 'Improves rewards or events connected to Glacite Mineshafts.' },
  metalhead: { name: 'Metalhead', max: 20, description: 'Grants Dwarven Metal Fortune.', powder: 'glacite', baseCost: 40, scale: 2.2 },
  rags_to_riches: { name: 'Rags to Riches', max: 50, description: 'Grants Mining Fortune.', powder: 'glacite', baseCost: 45, scale: 2.2 },
  eager_adventurer: { name: 'Eager Adventurer', max: 50, description: 'Grants Mining Speed.', powder: 'glacite', baseCost: 45, scale: 2.2 },
  gemstone_infusion: { name: 'Gemstone Infusion', max: 1, description: 'Pickaxe ability that improves gemstone mining.' },
  crystalline: { name: 'Crystalline', max: 50, description: 'Increases chances to find a Gemstone Mineshaft with a Crystal.', powder: 'glacite', baseCost: 50, scale: 3.3 },
  gifts_from_the_departed: { name: 'Gifts from the Departed', max: 1, description: 'Improves rewards connected to corpses in the Glacite Tunnels.' },
  mining_master: { name: 'Mining Master', max: 10, description: 'Grants Pristine.', powder: 'glacite', baseCost: 50, scale: 5 },
  dead_mans_chest: { name: "Dead Man's Chest", max: 1, description: 'Improves loot from Glacite Tunnels corpse-related rewards.' },
  vanguard_seeker: { name: 'Vanguard Seeker', max: 50, description: 'Increases the chance of finding Vanguard corpses in Glacite Mineshafts.', powder: 'glacite', baseCost: 45, scale: 2.2 },
  sheer_force: { name: 'Sheer Force', max: 1, description: 'Pickaxe ability that grants Mining Spread.' },
};

// Cumulative thresholds. The in-game table lists per-tier requirements.
const HOTM_XP = [0, 0, 3_000, 12_000, 37_000, 97_000, 197_000, 347_000, 557_000, 847_000, 1_247_000];
const rec = (v: unknown): Record<string, unknown> | null => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
const num = (v: unknown): number => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0;
const title = (id: string) => id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function buildPerks(nodes: Record<string, unknown>): HOTMPerk[] {
  const unlockedPerks = Object.entries(nodes)
    .filter(([id, value]) => !id.startsWith('toggle_') && ((typeof value === 'number' && value > 0) || (value === true && PERKS[id]?.max === 1)))
    .map(([id, value]): HOTMPerk => {
      const definition = PERKS[id];
      const perkLevel = value === true ? 1 : num(value);
      const maxLevel = definition?.max ?? (id.startsWith('special_') ? 10 : null);
      const cost = definition?.powder && maxLevel !== null && perkLevel < maxLevel
        ? Math.round((definition.baseCost ?? 1) * Math.pow(perkLevel + 1, definition.scale ?? 2))
        : null;
      return { id, name: definition?.name ?? title(id), level: perkLevel, maxLevel, description: definition?.description ?? 'Unlocked Heart of the Mountain perk.', powder: definition?.powder ?? null, costToNextLevel: cost, enabled: nodes[`toggle_${id}`] !== false };
    });
  const seen = new Set(unlockedPerks.map((perk) => perk.id));
  return [
    ...unlockedPerks,
    ...Object.entries(PERKS).filter(([id]) => !seen.has(id)).map(([id, definition]): HOTMPerk => ({
      id,
      name: definition.name,
      level: 0,
      maxLevel: definition.max,
      description: definition.description,
      powder: definition.powder ?? null,
      costToNextLevel: definition.powder ? Math.round((definition.baseCost ?? 1) * Math.pow(1, definition.scale ?? 2)) : null,
      enabled: false,
    })),
  ].sort((a, b) => a.id.startsWith('special_') ? -1 : b.level - a.level || a.name.localeCompare(b.name));
}

export function parseHOTM(member: unknown): HOTMProgress {
  const memberRecord = rec(member);
  const core = rec(memberRecord?.mining_core);
  const tree = rec(memberRecord?.skill_tree);
  const treeNodes = rec(tree?.nodes);
  const slots = rec(tree?.selected_skill_tree_slot);
  const slot = Math.max(1, num(slots?.mining) || 1);
  const nodes = rec(treeNodes?.[slot === 1 ? 'mining' : `mining_${slot}`]) ?? rec(treeNodes?.mining) ?? rec(core?.nodes) ?? {};
  const treeSlots: HOTMTreeSlot[] = treeNodes
    ? Object.entries(treeNodes)
        .filter(([key, value]) => /^mining(?:_\d+)?$/.test(key) && rec(value))
        .map(([key, value]) => ({ slot: key === 'mining' ? 1 : num(key.split('_')[1]), perks: buildPerks(rec(value) ?? {}) }))
        .sort((a, b) => a.slot - b.slot)
    : [];
  const treeExperience = rec(tree?.experience);
  const experience = num(treeExperience?.mining ?? core?.experience);
  let level = 0;
  for (let i = 1; i < HOTM_XP.length; i += 1) if (experience >= HOTM_XP[i]) level = i;
  const currentThreshold = HOTM_XP[level] ?? 0;
  const nextThreshold = level < HOTM_XP.length - 1 ? HOTM_XP[level + 1] : null;
  const powder = (kind: PowderType): HOTMPowder => {
    const powderValue = num(core?.[`powder_${kind}`]);
    const spent = num(core?.[`powder_spent_${kind}`]);
    const reportedTotal = num(core?.[`powder_${kind}_total`]);
    // Current API: powder_* is lifetime earned and powder_*_total is unspent.
    // Legacy API: powder_* is unspent and powder_*_total is lifetime earned.
    const currentLayout = reportedTotal <= powderValue && powderValue >= spent && Math.abs((powderValue - spent) - reportedTotal) <= Math.max(5, powderValue * 0.01);
    const available = currentLayout ? reportedTotal : powderValue;
    const total = currentLayout ? powderValue : Math.max(reportedTotal, powderValue + spent);
    return { available, spent, total };
  };
  const perks = buildPerks(nodes);
  const mithril = powder('mithril'); const gemstone = powder('gemstone'); const glacite = powder('glacite');
  return {
    available: core !== null || treeExperience?.mining !== undefined || Object.keys(nodes).length > 0, level, maxLevel: HOTM_XP.length - 1, currentXp: experience,
    xpIntoLevel: Math.max(0, experience - currentThreshold), xpToNextLevel: nextThreshold === null ? null : Math.max(0, nextThreshold - experience),
    progressPercent: nextThreshold === null ? 100 : Math.min(100, Math.round(((experience - currentThreshold) / Math.max(1, nextThreshold - currentThreshold)) * 100)),
    powder: { mithril, gemstone, glacite }, totalPowderSpent: mithril.spent + gemstone.spent + glacite.spent,
    coreOfTheMountainLevel: num(nodes.core_of_the_mountain ?? nodes.special_0), miningSpeed: num(nodes.mining_speed) + num(nodes.mining_speed_2), miningFortune: num(nodes.mining_fortune) + num(nodes.mining_fortune_2),
    miningSpeedBoost: num(nodes.mining_speed_boost), dailyPowder: num(nodes.daily_powder), pickaxeAbility: typeof rec(tree?.selected_ability)?.mining === 'string' ? String(rec(tree?.selected_ability)?.mining) : typeof core?.selected_pickaxe_ability === 'string' ? core.selected_pickaxe_ability : null,
    selectedTreeSlot: slot,
    perks, treeSlots: treeSlots.length > 0 ? treeSlots : [{ slot: 1, perks }], rawFields: { mining_core: core ?? {}, skill_tree: tree ?? {} },
  };
}
