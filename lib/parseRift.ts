export interface RiftEntry {
  id: string;
  name: string;
  value: number | boolean | string;
}

export interface RiftProgress {
  available: boolean;
  riftTimeSeconds: number | null;
  maxRiftTimeSeconds: number | null;
  timecharms: RiftEntry[];
  timecharmsFound: number;
  timecharmsTotal: number;
  accessories: string[];
  vampireSlayer: { xp: number; level: number; maxLevel: number; bossKills: number };
  collections: RiftEntry[];
  areas: RiftEntry[];
  currencies: Record<string, number>;
  importantUnlocks: RiftEntry[];
  missingUnlocks: string[];
  enigmaSouls: { found: number; total: number };
  eyes: { found: number; total: number };
  completionPercent: number;
  currentStatus: string;
}

const TIMECHARMS: ReadonlyArray<[string, string]> = [
  ['wyldly_supreme', 'Supreme Timecharm'],
  ['mirrored', 'mrahcemiT esrevrorriM'],
  ['chicken_n_egg', 'Chicken N Egg Timecharm'],
  ['citizen', 'SkyBlock Citizen Timecharm'],
  ['lazy_living', 'Living Timecharm'],
  ['slime', 'Globulate Timecharm'],
  ['vampiric', 'Vampiric Timecharm'],
  ['mountain', 'Mountaintop Timecharm'],
];

const AREAS: ReadonlyArray<[string, string, string[]]> = [
  ['wyld_woods', 'Wyld Woods', []],
  ['black_lagoon', 'Black Lagoon', ['black_lagoon']],
  ['village_plaza', 'Village Plaza', ['village_plaza']],
  ['west_village', 'West Village', ['west_village']],
  ['dreadfarm', 'Dreadfarm', []],
  ['living_cave', 'Living Cave', ['living_cave']],
  ['colosseum', 'Colosseum', ['colosseum']],
  ['castle', 'Stillgore Chateau', []],
  ['mountaintop', 'Mountaintop', ['mountaintop']],
];

const rec = asRecord;
const num = nonNegativeNumber;
const title = titleCaseId;

export function parseRift(member: unknown): RiftProgress {
  const player = rec(member);
  const rift = rec(player?.rift);
  const gallery = rec(rift?.gallery);
  const trophyRows = Array.isArray(gallery?.secured_trophies) ? gallery.secured_trophies : [];
  const secured = new Map<string, Record<string, unknown>>();
  for (const row of trophyRows) {
    const record = rec(row);
    if (typeof record?.type === 'string') secured.set(record.type, record);
  }
  const timecharms = TIMECHARMS.map(([id, name]): RiftEntry => ({ id, name, value: secured.has(id) }));
  const timecharmsFound = timecharms.filter(charm => charm.value === true).length;

  const boundaries = new Set(
    Array.isArray(rift?.lifetime_purchased_boundaries)
      ? rift.lifetime_purchased_boundaries.filter((value): value is string => typeof value === 'string')
      : [],
  );
  const hasObjectData = (id: string) => Object.keys(rec(rift?.[id]) ?? {}).length > 0;
  const areas = AREAS.map(([id, name, boundaryIds]): RiftEntry => {
    const unlocked = hasObjectData(id) || boundaryIds.some(boundary => boundaries.has(boundary));
    return { id, name, value: unlocked };
  });

  const currencies = rec(player?.currencies);
  const stats = rec(rec(player?.player_stats)?.rift);
  const vampire = rec(rec(rec(player?.slayer)?.slayer_bosses)?.vampire);
  const vampireXp = num(vampire?.xp);
  const vampireThresholds = [0, 20, 75, 240, 840, 2_400];
  const vampireLevel = vampireThresholds.reduce((result, threshold, index) => vampireXp >= threshold ? index : result, 0);
  const vampireBossKills = Object.entries(vampire ?? {})
    .filter(([key]) => /^boss_kills_tier_\d+$/.test(key))
    .reduce((sum, [, value]) => sum + num(value), 0);

  const enigma = rec(rift?.enigma);
  const soulsFound = Array.isArray(enigma?.found_souls) ? new Set(enigma.found_souls.filter(value => typeof value === 'string')).size : 0;
  const killedEyes = Array.isArray(rec(rift?.wither_cage)?.killed_eyes)
    ? new Set((rec(rift?.wither_cage)?.killed_eyes as unknown[]).filter(value => typeof value === 'string')).size
    : 0;
  const access = rec(rift?.access);
  const montezumaUnlocked = rec(rift?.dead_cats)?.unlocked_pet === true;
  const importantUnlocks: RiftEntry[] = [
    { id: 'enigma_cloak', name: 'Enigma Cloak', value: enigma?.bought_cloak === true },
    { id: 'montezuma', name: 'Montezuma Pet', value: montezumaUnlocked },
    { id: 'mirrorverse', name: 'Mirrorverse', value: boundaries.has('mirrorverse') || secured.has('mirrored') },
    { id: 'vampire_slayer', name: 'Vampire Slayer', value: vampireXp > 0 || Object.keys(rec(vampire?.claimed_levels) ?? {}).length > 0 },
    { id: 'rift_prism', name: 'Permanent Rift Access', value: access?.consumed_prism === true },
    { id: 'mountaintop', name: 'Mountaintop', value: boundaries.has('mountaintop') || secured.has('mountain') },
  ];

  const collection = rec(player?.collection) ?? {};
  const collections = Object.entries(collection)
    .filter(([id]) => /^(CADUCOUS_STEM|AGARICUS_CAP|METAL_HEART|HEMOVIBE|LIVING_METAL|SHEN_CLUTTER)$/.test(id))
    .map(([id, value]): RiftEntry => ({ id, name: title(id), value: num(value) }));

  const completionParts = [
    timecharmsFound / TIMECHARMS.length,
    Math.min(1, killedEyes / 7),
    Math.min(1, soulsFound / 51),
    areas.filter(area => area.value === true).length / areas.length,
    importantUnlocks.filter(unlock => unlock.value === true).length / importantUnlocks.length,
  ];
  const visits = num(stats?.visits);

  return {
    available: rift !== null,
    // Hypixel exposes neither current nor maximum Rift Time in the profile endpoint.
    riftTimeSeconds: null,
    maxRiftTimeSeconds: null,
    timecharms,
    timecharmsFound,
    timecharmsTotal: TIMECHARMS.length,
    accessories: [
      ...(enigma?.bought_cloak === true ? ['Enigma Cloak'] : []),
      ...(access?.consumed_prism === true ? ['Rift Prism (consumed)'] : []),
    ],
    vampireSlayer: { xp: vampireXp, level: vampireLevel, maxLevel: vampireThresholds.length - 1, bossKills: vampireBossKills },
    collections,
    areas,
    currencies: {
      motes: num(currencies?.motes_purse),
      lifetimeMotes: num(stats?.lifetime_motes_earned),
      moteOrbs: num(stats?.motes_orb_pickup),
    },
    importantUnlocks: importantUnlocks.filter(unlock => unlock.value === true),
    missingUnlocks: importantUnlocks.filter(unlock => unlock.value !== true).map(unlock => unlock.name),
    enigmaSouls: { found: soulsFound, total: 51 },
    eyes: { found: killedEyes, total: 7 },
    completionPercent: Math.round(completionParts.reduce((sum, value) => sum + Math.min(1, value), 0) / completionParts.length * 100),
    currentStatus: rift === null ? 'Unavailable' : visits > 0 ? `${visits} Rift visits` : 'Rift data present',
  };
}
import { asRecord, nonNegativeNumber, titleCaseId } from './parserUtils.ts';
