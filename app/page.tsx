/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Image from 'next/image';
import type { SkillProgress, SlayerProgress, CatacombsProgress, FairySoulProgress, SkyblockLevelProgress } from '@/lib/parseProfile';
import type { PetProgress } from '@/lib/parsePets';

type CoopMember = { uuid: string; name: string };

type CollectionEntry = {
  rawKey: string;
  name: string;
  category: string;
  amount: number;
  tier: number;
  maxTier: number;
  nextTierRequirement: number | null;
  remaining: number | null;
  progressPercent: number;
  detail?: string;
};

type ResultData = {
  skills: SkillProgress[];
  slayers: SlayerProgress[];
  catacombs: CatacombsProgress;
  fairySouls: FairySoulProgress;
  suggestions: unknown[];
  skyblockLevel: SkyblockLevelProgress;
  levelRecommendations: unknown[];
  pets: PetProgress[];
  accessories: { magicalPower: number; bagUpgrades: number };
  dungeons: any;
  inventory: any;
  collections: CollectionEntry[];
  profileName: string;
  coopMembers: CoopMember[];
};

type Profile = {
  profile_id: string;
  cute_name: string;
  selected?: boolean;
  game_mode?: string;
  members?: Record<string, unknown>;
};

import { useState, useRef } from 'react';
import SkillBar from '@/components/SkillBar';
import SuggestionCard from '@/components/SuggestionCard';
import {
  parseSkills,
  parseSlayers,
  parseCatacombs,
  parseFairySouls,
  parseSkyblockLevel,
  parseCollections,
} from '@/lib/parseProfile';
import { getTopSuggestions } from '@/lib/getSuggestions';
import { getSkyblockLevelRecommendations } from '@/lib/getSkyblockLevelRecommendations';
import SkyblockLevelCard from '@/components/SkyblockLevelCard';
import ChatBox from '@/components/ChatBox';
import { parsePets } from '@/lib/parsePets';
import { parseAccessories } from '@/lib/parseAccessories';
import { parseInventory } from '@/lib/parseInventory';
import { parseDungeons } from '@/lib/parseDungeons';

const avatarUrl = (username: string) =>
  `https://minotar.net/helm/${encodeURIComponent(username)}/40.png`;

const formatDisplayName = (value?: string | null) =>
  String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const isValidMinecraftId = (id?: string | null) => {
  if (!id) return false;
  const v = String(id);
  // UUID without dashes (32 hex) or with dashes (36) or a username (1-16 chars)
  return /^(?:[0-9a-fA-F]{32}|[0-9a-fA-F-]{36}|[A-Za-z0-9_]{1,16})$/.test(v);
};

const getPetHeadSrc = (headId?: string | null) => {
  if (isValidMinecraftId(headId)) {
    return `https://minotar.net/helm/${encodeURIComponent(headId)}/64.png`;
  }
  return '/images/pet-placeholder.svg';
};

export default function Home() {
  const [ign, setIgn] = useState('');
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [uuid, setUuid] = useState<string | null>(null);
  const searchIdRef = useRef(0);

  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [viewingUuid, setViewingUuid] = useState<string | null>(null);

  const DEFAULT_DEVELOPER_IGN = 'westkorean';

  const handleSearch = async (searchIgn?: string) => {
    const ignToUse = searchIgn ?? ign;
    const currentSearchId = ++searchIdRef.current;
    setLoading(true);
    setError(null);
    setResult(null);
    setProfiles([]);
    setUuid(null);
    setCurrentProfile(null);
    setViewingUuid(null);

    try {
      const uuidRes = await fetch(
        `/api/uuid?ign=${encodeURIComponent(ignToUse)}`
      );
      const uuidData = await uuidRes.json();
      if (!uuidRes.ok) throw new Error(uuidData.error);

      const profileRes = await fetch(`/api/profile?uuid=${uuidData.id}`);
      const profileData = await profileRes.json();

      if (!profileData.success) {
        throw new Error(profileData.cause || 'Failed to fetch profile');
      }

      // Hypixel returns profiles: null specifically when there's no data
      // (either no SkyBlock profiles exist, or API access is off)
      if (!profileData.profiles || profileData.profiles.length == 0) {
        throw new Error(
          `No profile available for ${ign}. They may not play SkyBlock, or their API access may be turned off (SkyBlock Menu → Settings → API Settings).`
        );
      }

      // Filter to only profiles where THIS player has member data
      const validProfiles = profileData.profiles.filter(
        (p: any) => p.members && p.members[uuidData.id]
      );

      validProfiles.sort((a: any, b: any) =>
        a.cute_name.localeCompare(b.cute_name)
      );

      if (validProfiles.length == 0) {
        throw new Error(
          `Could not find SkyBlock data for ${ign} on any profile.`
        );
      }

      setProfiles(validProfiles);
      setUuid(uuidData.id);

      // Default to the selected one, or first available
      const defaultProfile =
        validProfiles.find((p: any) => p.selected) ?? validProfiles[0];

      await loadProfile(defaultProfile, uuidData.id, currentSearchId);
    } catch (err) {
      if (currentSearchId != searchIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      if (currentSearchId == searchIdRef.current) setLoading(false);
    }
  };

  const loadProfile = async (
    profile: any,
    playerUuid: string,
    searchId?: number
  ) => {
    const member = profile.members[playerUuid];

    const skills = parseSkills(member);
    const slayers = parseSlayers(member);
    const catacombs = parseCatacombs(member);
    const fairySouls = parseFairySouls(member);
    const suggestions = getTopSuggestions(skills, slayers, catacombs);
    const skyblockLevel = parseSkyblockLevel(member);
    const levelRecommendations = getSkyblockLevelRecommendations(
      member,
      slayers
    );
    const pets = parsePets(member);
    const accessories = parseAccessories(member);
    const inventory = parseInventory(member);
    const dungeons = parseDungeons(member);
    const collections = parseCollections(member);

    const memberUuids = Object.keys(profile.members);
    const memberNames = await Promise.all(
      memberUuids.map(async (mUuid) => {
        try {
          const res = await fetch(`/api/username?uuid=${mUuid}`);
          const data = await res.json();
          return { uuid: mUuid, name: data.name ?? 'Unavailable' };
        } catch {
          return { uuid: mUuid, name: 'Unavailable' };
        }
      })
    );

    if (searchId != undefined && searchId != searchIdRef.current) return;

    setCurrentProfile(profile);
    setViewingUuid(playerUuid);

    setResult({
      skills,
      slayers,
      catacombs,
      fairySouls,
      suggestions,
      skyblockLevel,
      levelRecommendations,
      pets,
      accessories,
      dungeons,
      inventory,
      collections,
      profileName: profile.cute_name,
      coopMembers: memberNames,
    });
  };

  const viewMember = (targetUuid: string) => {
    if (!currentProfile) return;
    loadProfile(currentProfile, targetUuid);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">SkyProgressor</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Built by <strong>westkorean</strong>, developer of SkyProgressor.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            value={ign}
            onChange={(e) => setIgn(e.target.value)}
            placeholder="Enter your IGN"
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 transition-colors px-5 py-2 rounded-lg font-medium"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div className="mb-6">
          <button
            onClick={() => handleSearch(DEFAULT_DEVELOPER_IGN)}
            className="w-full flex items-center gap-4 rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-left transition hover:border-emerald-500"
          >
            <Image
              src={avatarUrl(DEFAULT_DEVELOPER_IGN)}
              alt="westkorean skin"
              width={48}
              height={48}
              className="rounded-lg border border-neutral-800"
            />
            <div>
              <div className="font-semibold">westkorean</div>
              <div className="text-xs text-neutral-500">
                Developer of SkyProgressor
              </div>
              <div className="text-sm text-neutral-400">
                Click to view the developer profile
              </div>
            </div>
          </button>
        </div>

        {profiles.length > 0 && (
          <div className="flex gap-2 mb-6 items-center">
            <span className="text-neutral-500 text-sm">Profile:</span>
            {profiles.map((p: any) => (
              <button
                key={p.profile_id}
                onClick={() => loadProfile(p, uuid!)}
                disabled={profiles.length == 1}
                className={`px-3 py-1 rounded-lg text-sm border ${
                  result?.profileName == p.cute_name
                    ? 'bg-emerald-600 border-emerald-500'
                    : 'bg-neutral-900 border-neutral-700'
                } ${profiles.length == 1 ? 'cursor-default' : 'hover:border-neutral-500'}`}
              >
                {p.cute_name} {p.game_mode ? `(${p.game_mode})` : ''}
              </button>
            ))}
          </div>
        )}

        {result && viewingUuid && (
          <div className="flex items-center gap-3 mb-6">
            <Image
              src={
                result?.coopMembers.find((m) => m.uuid === viewingUuid)?.name ?? ''
              }
              alt="Current player skin"
              width={40}
              height={40}
              className="rounded-lg border border-neutral-700"
            />
            <div>
              <div className="text-neutral-500 text-xs uppercase tracking-wide">
                Current Player
              </div>
              <div className="font-semibold">
                {result.coopMembers.find((m: any) => m.uuid === viewingUuid)
                  ?.name ?? 'Unknown'}
              </div>
            </div>
          </div>
        )}

        {result?.coopMembers && result.coopMembers.length > 1 && (
          <div className="mb-6">
            <span className="text-neutral-500 text-sm mr-2">Co-op:</span>
            {result.coopMembers.map((m: CoopMember) => (
              <button
                key={m.uuid}
                onClick={() => viewMember(m.uuid)}
                className={`inline-flex items-center rounded-lg px-3 py-1 text-sm mr-2 mb-2 border ${
                  viewingUuid == m.uuid
                    ? 'bg-emerald-600 border-emerald-500'
                    : 'bg-neutral-900 border-neutral-700 hover:border-neutral-500'
                }`}
              >
                <Image
                  src={avatarUrl(m.name)}
                  alt={`${m.name} skin`}
                  width={24}
                  height={24}
                  className="rounded-full border border-neutral-800 mr-2"
                />
                {m.name}
              </button>
            ))}
          </div>
        )}

        {loading && <p className="text-neutral-400">Loading...</p>}
        {error && <p className="text-red-400">{error}</p>}

        {result?.suggestions && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Focus On Next</h2>
            {result.suggestions.map((s: any, i: number) => (
              <SuggestionCard key={i} suggestion={s} />
            ))}
          </section>
        )}

        {result?.skyblockLevel && (
          <SkyblockLevelCard
            level={result.skyblockLevel.level}
            progressPercent={result.skyblockLevel.progressPercent}
            recommendations={result.levelRecommendations}
          />
        )}

        {result && (
          <ChatBox
            playerData={{
              skyblockLevel: result.skyblockLevel,
              skills: result.skills,
              slayers: result.slayers,
              catacombs: result.catacombs,
              fairySouls: result.fairySouls,
              pets: result.pets,
              accessories: result.accessories,
              dungeons: result.dungeons,
              collections: result.collections?.slice(0, 15),
            }}
          />
        )}

        {result?.skills && (
          <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-xl font-semibold mb-4">Skills</h2>
            {result.skills.length > 0 ? (
              result.skills.map((s: any) => <SkillBar key={s.skill} {...s} />)
            ) : (
              <p className="text-neutral-500 text-sm">
                Skills data unavailable — this player may have Skills API access
                turned off.
              </p>
            )}
          </section>
        )}

        {result?.slayers && (
          <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-xl font-semibold mb-4">Slayers</h2>
            {result.slayers.length > 0 ? (
              result.slayers.map((s: any) => (
                <SkillBar key={s.slayer} skill={s.slayer} {...s} />
              ))
            ) : (
              <p className="text-neutral-500 text-sm">
                Slayer data unavailable — this player may have this API category
                turned off.
              </p>
            )}
          </section>
        )}

        {result?.catacombs && (
          <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-xl font-semibold mb-4">Catacombs</h2>
            <SkillBar skill="catacombs" {...result.catacombs} />
          </section>
        )}

        {result?.fairySouls && (
          <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-xl font-semibold mb-4">Fairy Souls</h2>
            <div className="text-neutral-300 mb-2">
              {result.fairySouls.collected} / {result.fairySouls.total}{' '}
              collected ({result.fairySouls.progressPercent}%)
            </div>
            <div className="bg-neutral-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-purple-500 h-full"
                style={{ width: `${result.fairySouls.progressPercent}%` }}
              />
            </div>
          </section>
        )}

        {result?.pets && result.pets.length > 0 && (
          <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Pets</h2>
              <span className="text-sm text-neutral-500">
                {result.pets.length} active
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-1">
              {result.pets.map((p: any, i: number) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-visible rounded-3xl p-1"
                >
                  <div className="relative flex h-full w-full items-center justify-center rounded-3xl">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
                      <div
                        className="rounded-3xl"
                        style={{
                          width: 64,
                          height: 64,
                          // stronger, but still subtle glow using 40% alpha
                          boxShadow: `0 12px 48px 12px ${p.tierColor}66`,
                          borderRadius: '12px',
                        }}
                      />
                    </div>

                    <div
                      className="relative h-16 w-16 overflow-hidden rounded-3xl shadow-lg"
                      style={{ backgroundColor: p.tierColor, zIndex: 10 }}
                    >
                      <Image
                        src={getPetHeadSrc(p.headUuid)}
                        alt={p.headUuid ? `${p.displayName} pet head` : 'placeholder pet head'}
                        width={64}
                        height={64}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>

                  {/* (name badge removed - names shown in hover popup only) */}

                  {/* Hover popup - positioned above the tile and allowed to overflow */}
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full w-56 z-50 opacity-0 pointer-events-none transition duration-200 group-hover:opacity-100 group-hover:pointer-events-auto">
                    <div className="bg-neutral-900/95 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-200 shadow-xl">
                      <div className="font-semibold text-white leading-tight capitalize">
                        {p.displayName}
                      </div>
                      <div className="text-neutral-400 text-[11px] mt-1">
                        Rarity: {p.tier}
                      </div>
                      <div className="mt-2 text-[11px] text-neutral-200">
                        XP: {Math.round(p.exp).toLocaleString()}
                      </div>
                      {p.heldItem && (
                        <div className="mt-1 text-[11px] text-neutral-200">
                          {formatDisplayName(p.heldItem)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {result?.accessories && (
          <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-xl font-semibold mb-4">Accessories</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-neutral-500 text-xs uppercase">
                  Magical Power
                </div>
                <div className="font-medium">
                  {result.accessories.magicalPower.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-neutral-500 text-xs uppercase">
                  Bag Upgrades
                </div>
                <div className="font-medium">
                  {result.accessories.bagUpgrades}
                </div>
              </div>
            </div>
          </section>
        )}

        {result?.dungeons?.classes && result.dungeons.classes.length > 0 && (
          <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-xl font-semibold mb-4">Dungeon Classes</h2>
            {result.dungeons.classes.map((c: any) => (
              <SkillBar
                key={c.name}
                skill={c.name}
                level={c.level}
                currentXp={c.xp}
                xpForNextLevel={c.level < 50 ? 1 : null}
                progressPercent={c.progressPercent}
              />
            ))}
          </section>
        )}

        {result?.collections && (
          <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-xl font-semibold mb-4">Collections</h2>
            {[
              'Boss',
              'Combat',
              'Farming',
              'Fishing',
              'Foraging',
              'Mining',
              'Rift',
            ].map((category) => {
              const items = result.collections.filter(
                (c: any) => c.category == category
              );
              if (items.length == 0) return null;

              return (
                <div key={category} className="mb-6">
                  <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {items.map((c: any) => (
                      <div
                        key={c.rawKey}
                        className="bg-neutral-800 rounded-lg p-3"
                      >
                        <div className="font-semibold text-sm">{c.name}</div>
                        <div className="text-xs text-neutral-400">
                          {c.maxTier > 0
                            ? `Tier ${c.tier}/${c.maxTier}`
                            : 'Tier data unavailable'}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">
                          {c.amount.toLocaleString()} collected
                        </div>
                        {c.detail && (
                          <div className="text-xs text-neutral-500 mt-2">
                            {c.detail}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
