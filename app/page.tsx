'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import type { OwnedItemMetadata } from '@/lib/ownedItemMetadata';
import { marketPriceFor, petMarketKey } from '@/lib/marketPrices';
import { estimateRecipeCost } from '@/lib/itemPricing';
import { validateIgn } from '@/lib/ignValidation';
import type { GardenProgress } from '@/lib/parseGarden';
import type { ProfileViewModel, SkyBlockProfile } from '@/lib/profileViewModel';
import { fetchGardenPayload, fetchMemberName, fetchSkyBlockProfiles, resolveMinecraftUuid } from '@/lib/skyblockProfileApi';
import { minecraftAvatarUrl } from '@/lib/avatar';
import ProfileContextControls from '@/components/ProfileContextControls';

import { useEffect, useMemo, useState, useRef } from 'react';
import SkillBar from '@/components/SkillBar';
import MainMenuResources from '@/components/MainMenuResources';
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
import {
  getSkyblockLevelRecommendations,
} from '@/lib/getSkyblockLevelRecommendations';
import SkyblockLevelCard from '@/components/SkyblockLevelCard';
import { parsePets } from '@/lib/parsePets';
import { parseAccessories } from '@/lib/parseAccessories';
import { parseInventory } from '@/lib/parseInventory';
import { parseDungeons } from '@/lib/parseDungeons';
import { getPetSkinDisplayName, getPetTextureHash } from '@/lib/petTextures';
import { getPetItemMetadata } from '@/lib/petItems';
import ProfileOverviewCard from '@/components/ProfileOverviewCard';
import { parseProfileEconomy } from '@/lib/parseProfileOverview';
import { getProgressionIssues, getProgressionRecommendations } from '@/lib/recommendationEngine';
import { parseMinions } from '@/lib/parseMinions';
import { parseBestiary } from '@/lib/parseBestiary';
import { parseMuseum } from '@/lib/parseMuseum';
import type { PricingSnapshot } from '@/lib/pricing';
import { priceAccessoryOpportunities } from '@/lib/pricing';
import { createInventoryOwnershipSummary, inventoryMetadataKey } from '@/lib/inventoryContext';
import { parseHOTM } from '@/lib/parseHOTM';
import { parseHOTF } from '@/lib/parseHOTF';
import { parseGarden } from '@/lib/parseGarden';
import { parseRift } from '@/lib/parseRift';
import { parseCrimson } from '@/lib/parseCrimson';
import { parseFishing } from '@/lib/parseFishing';
import { calculateProgressionScore } from '@/lib/progressionScore';
import { generateDeterministicRecommendations } from '@/lib/recommendations';
import { createProgressionRoadmap } from '@/lib/progressionRoadmap';
import { createProgressPlanner } from '@/lib/progressPlanner';
import { calculateNetworth, parseSkyhelperNetworth } from '@/lib/calculateNetworth';
import { hashPlayerProfile } from '@/lib/evaluation';
import type { SimulatedPetTier } from '@/lib/simulation';
import { generateSkyProgressorAchievements } from '@/lib/skyProgressorAchievements';
import { buildComparisonProfile, type ComparisonCandidate } from '@/lib/profileComparisonData';
import { memoizeProfileParser } from '@/lib/profileParseCache';

const ChatBox = dynamic(() => import('@/components/ChatBox'));
const CollectionsSection = dynamic(() => import('@/components/CollectionsSection'));
const MinionProgressSection = dynamic(() => import('@/components/MinionProgressSection'));
const BestiarySection = dynamic(() => import('@/components/BestiarySection'));
const MuseumSection = dynamic(() => import('@/components/MuseumSection'));
const DungeonsSection = dynamic(() => import('@/components/DungeonsSection'));
const EquipmentSection = dynamic(() => import('@/components/EquipmentSection'));
const ProgressionRecommendationsSection = dynamic(() => import('@/components/ProgressionRecommendationsSection'));
const InventoryStorageSection = dynamic(() => import('@/components/InventoryStorageSection'));
const RecommendationSimulator = dynamic(() => import('@/components/RecommendationSimulator'));
const ProgressPlanner = dynamic(() => import('@/components/ProgressPlanner'));
const SkyProgressorAchievements = dynamic(() => import('@/components/SkyProgressorAchievements'));
const HOTMCard = dynamic(() => import('@/components/HOTMCard'));
const HOTFCard = dynamic(() => import('@/components/HOTFCard'));
const GardenCard = dynamic(() => import('@/components/GardenCard'));
const RiftCard = dynamic(() => import('@/components/RiftCard'));
const CrimsonCard = dynamic(() => import('@/components/CrimsonCard'));
const FishingCard = dynamic(() => import('@/components/FishingCard'));
const AccessoriesCard = dynamic(() => import('@/components/AccessoriesCard'));
const ProgressionScoreCard = dynamic(() => import('@/components/ProgressionScoreCard'));
const ProgressionRoadmap = dynamic(() => import('@/components/ProgressionRoadmap'));
const ProfileSnapshots = dynamic(() => import('@/components/ProfileSnapshots'));
const ProfileComparisonCard = dynamic(() => import('@/components/ProfileComparisonCard'));

const parseSkillsCached = memoizeProfileParser(parseSkills);
const parseSlayersCached = memoizeProfileParser(parseSlayers);
const parseCollectionsCached = memoizeProfileParser(parseCollections);
const parsePetsCached = memoizeProfileParser(parsePets);
const parseHOTMCached = memoizeProfileParser(parseHOTM);
const parseHOTFCached = memoizeProfileParser(parseHOTF);

const formatDisplayName = (value?: string | null) =>
  String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const getPetHeadSrc = (petType: string, skinId?: string | null) => {
  const textureHash = getPetTextureHash(petType, skinId);
  if (textureHash) return `/pet-heads/${textureHash}.png?v=isometric-2`;
  return '/images/pet-placeholder.svg';
};

export default function Home() {
  const [ign, setIgn] = useState('');
  const [loadingIgn, setLoadingIgn] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [result, setResult] = useState<ProfileViewModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<SkyBlockProfile[]>([]);
  const [uuid, setUuid] = useState<string | null>(null);
  const searchIdRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestAbortRef.current?.abort(), []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('skyprogressor:theme');
    // localStorage is an external browser store hydrated after the first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedTheme === 'light') setTheme('light');
  }, []);

  const [currentProfile, setCurrentProfile] = useState<SkyBlockProfile | null>(null);
  const [viewingUuid, setViewingUuid] = useState<string | null>(null);
  const [comparisonCandidates, setComparisonCandidates] = useState<ComparisonCandidate[]>([]);

  const DEFAULT_DEVELOPER_IGN = 'westkorean';
  const ignValidation = validateIgn(ign);

  const handleSearch = async (searchIgn?: string) => {
    const requestedIgn = validateIgn(searchIgn ?? ign);
    if (!requestedIgn.valid) {
      setError(requestedIgn.message ?? 'Enter a valid Minecraft username.');
      return;
    }
    const ignToUse = requestedIgn.normalized;
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    const currentSearchId = ++searchIdRef.current;
    setLoading(true);
    setLoadingIgn(ignToUse);
    setError(null);
    setResult(null);
    setProfiles([]);
    setUuid(null);
    setCurrentProfile(null);
    setViewingUuid(null);
    setComparisonCandidates([]);

    try {
      const playerUuid = await resolveMinecraftUuid(ignToUse, controller.signal);
      const availableProfiles = await fetchSkyBlockProfiles(playerUuid, controller.signal);

      // Hypixel returns profiles: null specifically when there's no data
      // (either no SkyBlock profiles exist, or API access is off)
      if (availableProfiles.length === 0) {
        throw new Error(
          `No profile available for ${ignToUse}. They may not play SkyBlock, or their API access may be turned off (SkyBlock Menu → Settings → API Settings).`
        );
      }

      // Filter to only profiles where THIS player has member data
      const validProfiles = availableProfiles.filter(
        (profile) => profile.members?.[playerUuid] !== undefined
      );

      validProfiles.sort((a, b) =>
        a.cute_name.localeCompare(b.cute_name)
      );

      if (validProfiles.length == 0) {
        throw new Error(
          `Could not find SkyBlock data for ${ignToUse} on any profile.`
        );
      }

      setProfiles(validProfiles);
      setUuid(playerUuid);

      // Default to the selected one, or first available
      const defaultProfile =
        validProfiles.find((profile) => profile.selected) ?? validProfiles[0];

      await loadProfile(defaultProfile, playerUuid, currentSearchId, controller.signal);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (currentSearchId != searchIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      if (currentSearchId == searchIdRef.current) {
        setLoading(false);
        setLoadingIgn(null);
        if (requestAbortRef.current === controller) requestAbortRef.current = null;
      }
    }
  };

  const loadProfile = async (
    profile: SkyBlockProfile,
    playerUuid: string,
    searchId?: number,
    signal?: AbortSignal
  ) => {
    const profileMembers = profile.members ?? {};
    const member = profileMembers[playerUuid];

    const skills = parseSkillsCached(member);
    const slayers = parseSlayersCached(member);
    const catacombs = parseCatacombs(member);
    const fairySouls = parseFairySouls(member);
    const suggestions = getTopSuggestions(skills, slayers, catacombs);
    const skyblockLevel = parseSkyblockLevel(member);
    const levelRecommendations = getSkyblockLevelRecommendations(
      member,
      slayers
    );
    const pets = parsePetsCached(member);
    const inventory = await parseInventory(member);
    let accessories = parseAccessories(member, inventory);
    const inventoryOwnership = createInventoryOwnershipSummary(inventory);
    const dungeons = parseDungeons(member);
    const collections = parseCollectionsCached(member);
    const economy = parseProfileEconomy(member, profile);
    const bestiary = parseBestiary(member);
    const hotm = parseHOTMCached(member);
    const hotf = parseHOTFCached(member);
    const rift = parseRift(member);
    const crimson = parseCrimson(member);
    const fishing = parseFishing(member, skills, collections);
    let itemMetadata: Record<string, OwnedItemMetadata> = {};
    let museumPayload: unknown = null;
    let gardenPayload: unknown = null;
    let pricingSnapshot: PricingSnapshot = { marketPrices: {}, bazaarPrices: {}, cachedAt: '', expiresAt: '', stale: true };
    try {
      const [museumResponse, gardenResponse, pricingResponse] = await Promise.all([
        fetch(`/api/museum?profile=${encodeURIComponent(profile.profile_id)}`, { signal }),
        fetch(`/api/garden?profile=${encodeURIComponent(profile.profile_id)}`, { signal }),
        fetch('/api/pricing', { signal }),
      ]);
      [museumPayload, gardenPayload] = await Promise.all([museumResponse.json(), gardenResponse.json()]);
      if (pricingResponse.ok) pricingSnapshot = await pricingResponse.json() as PricingSnapshot;
    } catch {
      if (signal?.aborted) return;
      museumPayload = null;
    }
    try {
      const metadataResponse = await fetch('/api/item-metadata', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal,
        body: JSON.stringify({
          items: inventoryOwnership.items.map((item) => ({
            id: inventoryMetadataKey(item),
            name: item.name,
          })),
        }),
      });
      if (metadataResponse.ok) {
        const metadataPayload = await metadataResponse.json() as { items?: Record<string, OwnedItemMetadata> };
        itemMetadata = metadataPayload.items ?? {};
      }
    } catch {
      if (signal?.aborted) return;
    }
    const marketPrices = pricingSnapshot.marketPrices;
    const bazaarPrices = pricingSnapshot.bazaarPrices;
    accessories = { ...accessories, opportunities: priceAccessoryOpportunities(accessories.opportunities, marketPrices, bazaarPrices) };
    itemMetadata = Object.fromEntries(Object.entries(itemMetadata).map(([id, metadata]) => {
      const market = marketPriceFor(id, marketPrices, metadata.npcSellPrice);
      const rawCraftCost = estimateRecipeCost(id, bazaarPrices);
      return [id, {
        ...metadata,
        marketPrice: rawCraftCost ?? market?.unitPrice ?? null,
        marketPriceSource: rawCraftCost !== null ? 'craft' as const : market?.source ?? null,
        rawCraftCost,
        lowestBinPrice: market?.lowestBinPrice ?? null,
        recentMedianPrice: market?.recentMedianPrice ?? null,
      }];
    }));
    const localNetworth = calculateNetworth({
      purse: economy.purse,
      bank: economy.bank,
      inventoryItems: inventoryOwnership.items,
      itemMetadata,
      pets,
      marketPrices,
    });
    let networth = localNetworth;
    try {
      const networthResponse = await fetch('/api/networth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal,
        body: JSON.stringify({ member, museum: museumPayload, playerUuid, bank: economy.bank }),
      });
      if (networthResponse.ok) {
        networth = parseSkyhelperNetworth(await networthResponse.json()) ?? localNetworth;
      }
    } catch {
      if (signal?.aborted) return;
    }
    const minions = parseMinions(profile, bazaarPrices);
    const museum = parseMuseum(museumPayload, playerUuid, bazaarPrices, marketPrices);
    const garden = parseGarden(gardenPayload, member);
    const scoreInput = { skills, slayers, catacombs, collections, pets, accessories, hotm, hotf, garden, fishing, crimson, rift };
    const progressionScore = calculateProgressionScore(scoreInput);
    const deterministicRecommendations = generateDeterministicRecommendations(scoreInput);
    const roadmap = createProgressionRoadmap(deterministicRecommendations);
    const planner = createProgressPlanner({ hotm, magicalPower: accessories.magicalPower, ownedItemIds: inventoryOwnership.items.flatMap((item) => item.skyblockId ? [item.skyblockId] : []), marketPrices, bazaarPrices, recommendations: deterministicRecommendations });
    const achievements = generateSkyProgressorAchievements({
      uniqueAccessoryCount: new Set(inventoryOwnership.items.filter((item) => item.section === 'accessoryBag').flatMap((item) => item.skyblockId ? [item.skyblockId] : [])).size,
      magicalPower: accessories.magicalPower,
      catacombsLevel: catacombs.level,
      farmingLevel: skills.find((skill) => skill.skill.toLowerCase() === 'farming')?.level ?? 0,
      gardenLevel: garden.level,
      gardenMaxLevel: garden.maxLevel,
      collections,
    });
    const recommendationProfile = {
      skills,
      slayers,
      catacombs,
      fairySouls,
      skyblockLevel,
      accessories,
      collections,
      inventory,
      minions,
      bestiary,
      museum,
      pets,
    };
    const recommendations = getProgressionRecommendations(recommendationProfile);
    const progressionIssues = getProgressionIssues(recommendationProfile);

    const memberUuids = Object.keys(profileMembers);
    const memberNames = await Promise.all(memberUuids.map((memberUuid) => fetchMemberName(memberUuid, signal)));

    const otherGardens = new Map<string, GardenProgress>();
    await Promise.all(profiles.filter(candidate => candidate.profile_id !== profile.profile_id).map(async candidate => {
      try {
        const payload = await fetchGardenPayload(candidate.profile_id, signal);
        otherGardens.set(candidate.profile_id, parseGarden(payload));
      } catch { otherGardens.set(candidate.profile_id, parseGarden(null)); }
    }));
    const comparisonOptions: ComparisonCandidate[] = [
      ...memberNames.map((profileMember) => ({ id: `${profile.profile_id}:${profileMember.uuid}`, label: `${profile.cute_name} · ${profileMember.name}`, data: buildComparisonProfile(profileMembers[profileMember.uuid], garden) })),
      ...profiles.filter((candidate) => candidate.profile_id !== profile.profile_id && candidate.members?.[playerUuid]).map((candidate) => ({ id: `${candidate.profile_id}:${playerUuid}`, label: `${candidate.cute_name} · same account`, data: buildComparisonProfile(candidate.members?.[playerUuid], otherGardens.get(candidate.profile_id) ?? parseGarden(null)) })),
    ];

    if (signal?.aborted) return;
    if (searchId != undefined && searchId != searchIdRef.current) return;

    setCurrentProfile(profile);
    setViewingUuid(playerUuid);
    setComparisonCandidates(comparisonOptions);

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
      overview: {
        ign:
          memberNames.find((profileMember) => profileMember.uuid === playerUuid)
            ?.name ?? 'Unknown',
        profileName: profile.cute_name,
        gameMode: typeof profile.game_mode === 'string' ? profile.game_mode : null,
        skyblockLevel: skyblockLevel.level,
        purse: economy.purse,
        bank: economy.bank,
        networth,
        magicalPower: accessories.magicalPower,
        skillAverage:
          skills.length > 0
            ? skills.reduce((total, skill) => total + skill.level, 0) /
              skills.length
            : 0,
        catacombsLevel: catacombs.level,
        activePet: (() => {
          const activePet = pets.find((pet) => pet.active);
          return activePet
            ? { name: activePet.displayName, rarity: activePet.tier }
            : null;
        })(),
        fairySouls: {
          collected: fairySouls.collected,
          total: fairySouls.total,
        },
        members: memberNames,
      },
      recommendations,
      progressionIssues,
      minions,
      bestiary,
      museum,
      itemMetadata,
      marketPrices,
      hotm,
      hotf,
      garden,
      rift,
      crimson,
      fishing,
      progressionScore,
      deterministicRecommendations,
      roadmap,
      planner,
      achievements,
    });
  };

  const lookupComparisonProfile = async (comparisonIgn: string): Promise<ComparisonCandidate> => {
    const comparedUuid = await resolveMinecraftUuid(comparisonIgn);
    const comparedProfiles = await fetchSkyBlockProfiles(comparedUuid);
    if (comparedProfiles.length === 0) throw new Error('No public SkyBlock profile found.');
    const selected = comparedProfiles.find(candidate => candidate.selected && candidate.members?.[comparedUuid]) ?? comparedProfiles.find(candidate => candidate.members?.[comparedUuid]);
    if (!selected) throw new Error('This player has no accessible member data.');
    const comparedMember = selected.members?.[comparedUuid];
    let comparedGarden = parseGarden(null);
    try { comparedGarden = parseGarden(await fetchGardenPayload(selected.profile_id)); } catch { comparedGarden = parseGarden(null); }
    return { id:`external:${selected.profile_id}:${comparedUuid}`, label:`${comparisonIgn} · ${selected.cute_name}`, data: buildComparisonProfile(comparedMember, comparedGarden) };
  };

  const selectProfile = async (profile: SkyBlockProfile, targetUuid: string) => {
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    const operationId = ++searchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      await loadProfile(profile, targetUuid, operationId, controller.signal);
    } catch (selectionError) {
      if (controller.signal.aborted) return;
      if (operationId !== searchIdRef.current) return;
      setError(selectionError instanceof Error ? selectionError.message : 'Unable to load profile');
    } finally {
      if (operationId === searchIdRef.current) {
        setLoading(false);
        setLoadingIgn(null);
        if (requestAbortRef.current === controller) requestAbortRef.current = null;
      }
    }
  };

  const viewMember = (targetUuid: string) => {
    if (!currentProfile) return;
    void selectProfile(currentProfile, targetUuid);
  };

  const rotateScannerCard = (event: React.PointerEvent<HTMLDivElement>) => {
    const card = event.currentTarget;
    const bounds = card.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
    card.style.setProperty('--scanner-rotate-x', `${vertical * -8}deg`);
    card.style.setProperty('--scanner-rotate-y', `${horizontal * 12}deg`);
  };

  const resetScannerCard = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.removeProperty('--scanner-rotate-x');
    event.currentTarget.style.removeProperty('--scanner-rotate-y');
  };

  const recommendationProfileHash = useMemo(() => result ? hashPlayerProfile({
    profileName: result.profileName,
    skyblockLevel: result.skyblockLevel,
    skills: result.skills,
    slayers: result.slayers,
    accessories: result.accessories,
    hotm: result.hotm,
    garden: result.garden,
  }) : '', [result]);

  const advisorPlayerData = useMemo(() => result ? {
    pets: result.pets,
    recommendations: result.deterministicRecommendations,
    planner: result.planner,
    progressionScore: result.progressionScore,
    profileSummary: {
      skyblockLevel: result.skyblockLevel,
      skills: result.skills,
      slayers: result.slayers,
      catacombs: result.catacombs,
      accessories: result.accessories,
      hotm: result.hotm,
      hotf: result.hotf,
      garden: result.garden,
      fishing: result.fishing,
      crimson: result.crimson,
      rift: result.rift,
    },
  } : null, [result]);

  const returnHome = () => {
    requestAbortRef.current?.abort();
    setResult(null);
    setProfiles([]);
    setCurrentProfile(null);
    setViewingUuid(null);
    setComparisonCandidates([]);
    setUuid(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('skyprogressor:theme', next);
      return next;
    });
  };

  return (
    <main data-theme={theme} className={`theme-${theme} relative min-h-screen overflow-x-hidden bg-neutral-950 px-4 py-8 text-neutral-100 sm:py-10`}>
      <div className="pointer-events-none fixed inset-0 opacity-35 [background-image:linear-gradient(45deg,#171717_25%,transparent_25%),linear-gradient(-45deg,#171717_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#171717_75%),linear-gradient(-45deg,transparent_75%,#171717_75%)] [background-position:0_0,0_12px,12px_-12px,-12px_0] [background-size:24px_24px]" />
      {loading && (
        <div role="status" aria-live="polite" aria-label="Loading SkyBlock profile" className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/95 px-6 backdrop-blur-md">
          <div className="w-full max-w-sm border-2 border-neutral-600 bg-neutral-900 p-6 text-center shadow-[10px_10px_0_#050505]">
            <div aria-hidden="true" className="mx-auto mb-5 grid w-fit grid-cols-3 gap-1.5">
              {Array.from({ length: 9 }, (_, index) => (
                <span key={index} className={`h-4 w-4 border border-emerald-400/40 bg-emerald-500 ${index === 4 ? 'animate-ping' : 'animate-pulse'}`} style={{ animationDelay: `${index * 90}ms` }} />
              ))}
            </div>
            <div className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">Scanning profile</div>
            <div className="mt-2 truncate text-xs text-neutral-400">{loadingIgn ?? result?.overview.ign ?? 'SkyBlock player'}</div>
            <div className="mt-5 h-2 overflow-hidden border border-neutral-700 bg-neutral-950">
              <div className="profile-loading-bar h-full w-1/3 bg-emerald-500" />
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-wider text-neutral-500">Inventory · Pets · Progression · Collections</p>
          </div>
        </div>
      )}
      <div className="relative mx-auto max-w-5xl">
        {!result ? (
          <section className="relative mb-10 border-2 border-neutral-700 bg-neutral-900 px-5 py-10 shadow-[8px_8px_0_#050505] sm:px-10 sm:py-14">
            <div aria-hidden="true" className="pointer-events-none absolute right-5 top-5 grid grid-cols-4 gap-1 opacity-60">
              {['bg-emerald-500','bg-emerald-700','bg-neutral-600','bg-neutral-800','bg-neutral-700','bg-emerald-600','bg-emerald-800','bg-neutral-600','bg-emerald-800','bg-neutral-700','bg-emerald-500','bg-neutral-800'].map((color, index) => <span key={index} className={`h-3 w-3 ${color}`} />)}
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute bottom-5 left-5 grid grid-cols-3 gap-1 opacity-40">
              {Array.from({ length: 9 }, (_, index) => <span key={index} className={`h-2 w-2 ${index % 3 === 0 ? 'bg-emerald-600' : 'bg-neutral-600'}`} />)}
            </div>
            <div className="relative mx-auto grid max-w-5xl items-center gap-10 xl:grid-cols-[1.12fr_0.88fr]">
              <div className="text-left">
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 border border-emerald-700 bg-emerald-950 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300 shadow-[3px_3px_0_#052e16]">
                    <span className="h-2 w-2 animate-pulse bg-emerald-400" /> Profile scanner online
                  </div>
                  <a href="https://github.com/westkorean/skyProgressor" target="_blank" rel="noopener noreferrer" aria-label="Open SkyProgressor on GitHub" className="inline-flex h-8 items-center gap-2 border border-neutral-600 bg-neutral-950 px-2.5 text-xs font-semibold text-neutral-300 shadow-[3px_3px_0_#171717] transition hover:-translate-y-0.5 hover:border-neutral-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.02c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.71 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.29-5.28-1.29-5.28-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.4-2.72 5.38-5.3 5.67.42.36.79 1.06.79 2.15v3.03c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" /></svg>
                    GitHub
                  </a>
                  <button type="button" onClick={toggleTheme} className="inline-flex h-8 items-center border border-neutral-600 bg-neutral-950 px-2.5 text-xs font-semibold text-neutral-300 shadow-[3px_3px_0_#171717] hover:border-emerald-500" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? '☀ Light' : '☾ Dark'}</button>
                </div>
                <h1 className="text-4xl font-black tracking-tight [text-shadow:4px_4px_0_#0a0a0a] sm:text-6xl">Turn profile data into a <span className="text-emerald-400">game plan.</span></h1>
                <p className="mt-5 max-w-xl text-sm leading-6 text-neutral-400 sm:text-base">Open the whole profile—not just the equipped set. Compare storage, wardrobe, pets, dungeons, collections, and practical next steps.</p>

                <form onSubmit={(event) => { event.preventDefault(); void handleSearch(); }} className="mt-8 flex max-w-xl flex-col gap-2 border-2 border-neutral-600 bg-neutral-950 p-2 shadow-[5px_5px_0_#262626] sm:flex-row">
                  <div className="flex min-w-0 flex-1 items-center gap-3 px-3"><span aria-hidden="true" className="font-mono text-xs text-emerald-400">[IGN]</span><input value={ign} onChange={(event) => setIgn(event.target.value)} placeholder="Minecraft username" aria-label="Minecraft username" aria-invalid={ign.length > 0 && !ignValidation.valid} aria-describedby="ign-validation" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-neutral-600" /></div>
                  <button type="submit" disabled={loading || !ignValidation.valid} className="border border-emerald-400 bg-emerald-600 px-6 py-3 text-sm font-bold shadow-[inset_0_-4px_0_#047857,3px_3px_0_#052e16] transition hover:bg-emerald-500 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[inset_0_-2px_0_#047857,1px_1px_0_#052e16] disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'SCANNING...' : 'SCAN PROFILE'}</button>
                </form>
                <p id="ign-validation" aria-live="polite" className={`mt-2 min-h-4 text-xs ${ignValidation.message ? 'text-amber-300' : 'text-neutral-600'}`}>{ignValidation.message ?? (ignValidation.valid ? 'Minecraft username ready.' : 'Enter 3–16 letters, numbers, or underscores.')}</p>

                <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-neutral-500">{['Deterministic priorities', 'Complete inventory', 'Profile-aware advisor'].map((feature) => <span key={feature} className="border border-neutral-700 bg-neutral-950 px-3 py-1.5 shadow-[2px_2px_0_#171717]">[+] {feature}</span>)}</div>
                <div role="note" className="mt-5 max-w-xl border border-amber-700/80 bg-amber-950/30 px-4 py-3 text-xs leading-5 text-amber-200 shadow-[3px_3px_0_#451a03]">
                  <span className="font-bold uppercase tracking-wider">Beta / in development:</span>{' '}
                  You may encounter bugs or incomplete features. Please{' '}
                  <a href="https://github.com/westkorean/skyProgressor/issues" target="_blank" rel="noopener noreferrer" className="font-bold underline decoration-amber-500 underline-offset-2 hover:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400">
                    report bugs on GitHub
                  </a>.
                </div>
                <button onClick={() => { setIgn(DEFAULT_DEVELOPER_IGN); void handleSearch(DEFAULT_DEVELOPER_IGN); }} disabled={loading} className="group mt-8 inline-flex items-center gap-3 border border-neutral-700 bg-neutral-950 px-4 py-3 text-left shadow-[4px_4px_0_#171717] transition hover:-translate-y-0.5 hover:border-emerald-600 disabled:opacity-50"><Image src={minecraftAvatarUrl(DEFAULT_DEVELOPER_IGN)} alt="westkorean skin" width={36} height={36} className="[image-rendering:pixelated]" /><span><span className="block text-xs font-semibold text-neutral-200">Load westkorean</span><span className="block text-[10px] text-neutral-500">Developer profile / demo</span></span></button>
              </div>

              <div aria-hidden="true" className="voxel-scene relative mx-auto w-full max-w-sm py-6">
                <div
                  className="voxel-console border-2 border-neutral-600 bg-[#121416] p-3 shadow-[10px_12px_0_rgba(0,0,0,0.65)]"
                  onPointerMove={rotateScannerCard}
                  onPointerLeave={resetScannerCard}
                >
                  <div className="mb-3 flex items-center justify-between border-b-2 border-neutral-700 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500"><span>Profile scanner</span><span className="text-emerald-400">Ready</span></div>
                  <div className="flex items-center gap-3 border border-neutral-700 bg-neutral-950 p-3">
                    <div className="border-2 border-neutral-600 bg-neutral-800 p-1 shadow-[3px_3px_0_#262626]"><Image src={minecraftAvatarUrl(DEFAULT_DEVELOPER_IGN, 64)} alt="" width={56} height={56} className="[image-rendering:pixelated]" /></div>
                    <div className="min-w-0 font-mono"><div className="truncate text-sm font-bold text-white">{ign.trim() || 'PLAYER_NAME'}</div><div className="mt-1 text-[10px] text-emerald-400">API LINK: STANDBY</div><div className="text-[10px] text-neutral-600">PROFILE: AUTO-DETECT</div></div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[['LVL','---'],['MP','---'],['CATA','---']].map(([label, value]) => <div key={label} className="border border-neutral-700 bg-neutral-900 p-2 text-center font-mono"><div className="text-[9px] text-neutral-600">{label}</div><div className="text-sm font-bold text-neutral-300">{value}</div></div>)}
                  </div>
                  <div className="mt-3 grid grid-cols-9 gap-1 border-2 border-neutral-700 bg-[#080808] p-2">
                    {Array.from({ length: 18 }, (_, index) => <div key={index} className={`aspect-square border border-neutral-700 shadow-[inset_1px_1px_0_#404040] ${[1,4,7,11,15].includes(index) ? 'bg-emerald-900' : 'bg-neutral-900'}`}><div className="m-auto mt-[35%] h-1/3 w-1/3 bg-neutral-600/60" /></div>)}
                  </div>
                  <div className="mt-3 h-2 border border-neutral-700 bg-neutral-900"><div className="h-full w-2/3 bg-emerald-600" /></div>
                </div>
              </div>
            </div>
            <MainMenuResources />
          </section>
        ) : (
          <>
          <div aria-hidden="true" className="navbar-gaussian-blur fixed inset-x-0 top-0 z-[55] h-28 pointer-events-none" />
          <header className="fixed left-1/2 top-3 z-[60] flex w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 flex-col gap-3 border-2 border-neutral-700 bg-neutral-900/95 p-3 shadow-[5px_5px_0_#050505] backdrop-blur sm:flex-row sm:items-center">
            <button type="button" onClick={returnHome} aria-label="Return to SkyProgressor main menu" className="px-2 text-left transition hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"><div className="font-black tracking-tight">Sky<span className="text-emerald-400">Progressor</span></div><div className="text-[10px] text-neutral-500">Return to main menu</div></button>
            <form onSubmit={(event) => { event.preventDefault(); void handleSearch(); }} className="flex min-w-0 flex-1 gap-2">
              <input value={ign} onChange={(event) => setIgn(event.target.value)} placeholder="Search another IGN" aria-invalid={ign.length > 0 && !ignValidation.valid} title={ignValidation.message ?? undefined} className="min-w-0 flex-1 border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm outline-none focus:border-emerald-500" />
              <button type="submit" disabled={loading || !ignValidation.valid} className="border border-emerald-500 bg-emerald-700 px-4 py-2 text-sm font-bold shadow-[inset_0_-3px_0_#065f46] hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Loading…' : 'Search'}</button>
            </form>
            <div className="flex gap-2">
              <button type="button" onClick={toggleTheme} className="flex h-9 items-center gap-2 border border-neutral-700 bg-neutral-950 px-3 text-xs text-neutral-300 hover:border-emerald-500" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? '☀ Light' : '☾ Dark'}</button>
              <a href="https://github.com/westkorean/skyProgressor" target="_blank" rel="noopener noreferrer" aria-label="Open SkyProgressor on GitHub" className="flex h-9 items-center gap-2 border border-neutral-700 bg-neutral-950 px-3 text-xs font-semibold text-neutral-300 hover:border-neutral-400 hover:text-white"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.02c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.71 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.29-5.28-1.29-5.28-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.4-2.72 5.38-5.3 5.67.42.36.79 1.06.79 2.15v3.03c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" /></svg><span className="hidden md:inline">GitHub</span></a>
            </div>
          </header>
          <div className="h-32 sm:h-20" />
          </>
        )}

        <ProfileContextControls
          profiles={profiles}
          activeProfileName={result?.profileName ?? null}
          members={result?.coopMembers ?? []}
          viewingUuid={viewingUuid}
          loading={loading}
          onSelectProfile={(profile) => { if (uuid) void selectProfile(profile, uuid); }}
          onSelectMember={viewMember}
        />

        {error && <p className="text-red-400">{error}</p>}

        {result && (
          <nav aria-label="Profile section navigation" className="profile-dock group fixed left-0 top-1/2 z-50 -translate-y-1/2">
            <div className="absolute left-0 top-1/2 flex h-16 w-16 -translate-x-8 -translate-y-1/2 items-center justify-end rounded-full border-2 border-emerald-500/70 bg-neutral-900 pr-2 text-emerald-300 shadow-xl transition group-hover:-translate-x-3"><span className="text-xl">◈</span></div>
            <div className="ml-3 max-h-[70vh] w-52 -translate-x-[calc(100%+1rem)] overflow-y-auto rounded-r-xl border border-neutral-700 bg-neutral-950/95 p-2 opacity-0 shadow-2xl backdrop-blur transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 focus-within:translate-x-0 focus-within:opacity-100">
              <div className="px-2 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-400">Profile menu</div>
              {[
                ['overview', 'Overview'], ['progression', 'Next Steps'], ['stats', 'Stats'],
                ['pets', 'Pets'], ['mining', 'Mining & Garden'], ['fishing', 'Fishing'], ['islands', 'Islands'], ['gear', 'Gear & Storage'], ['dungeons', 'Dungeons'], ['collections', 'Collections'], ['completion', 'Completion'],
              ].map(([target, label]) => <a key={target} href={`#${target}`} className="block rounded-lg px-3 py-2 text-sm text-neutral-400 transition hover:bg-emerald-600/15 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500">{label}</a>)}
              <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="mt-2 w-full border-t border-neutral-800 px-3 py-3 text-left text-xs font-semibold text-neutral-400 hover:text-white">↑ Return to top</button>
            </div>
          </nav>
        )}

        {result && <div id="overview" className="scroll-mt-28"><ProfileOverviewCard overview={result.overview} /></div>}

        {result && <ProgressionScoreCard progress={result.progressionScore} />}
        {result && <SkyProgressorAchievements summary={result.achievements} />}
        {result && <ProgressPlanner planner={result.planner} />}
        {result && <ProgressionRoadmap roadmap={result.roadmap} />}
        {result && <ProfileComparisonCard candidates={comparisonCandidates} onLookup={lookupComparisonProfile} />}

        <div id="progression" className="scroll-mt-24">
        {result && (
          <ProgressionRecommendationsSection recommendations={result.deterministicRecommendations} profileHash={recommendationProfileHash} />
        )}

        {result && (
          <RecommendationSimulator profile={{
            magicalPower: result.accessories.magicalPower,
            skills: { foraging: result.skills.find((skill) => skill.skill.toLowerCase() === 'foraging')?.level ?? 0 },
            pets: result.pets.flatMap((pet) => ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'].includes(pet.tier) ? [{ type: pet.type, tier: pet.tier as SimulatedPetTier, level: pet.level }] : []),
          }} />
        )}

        {result?.suggestions && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Focus On Next</h2>
            {result.suggestions.map((s, i) => (
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
        </div>

        <div id="advisor" className="scroll-mt-24">
        {result && (
          <ChatBox
            profileKey={`${viewingUuid}:${result.profileName}`}
            profileLabel={`${result.overview.ign} · ${result.profileName}`}
            onVisitProfile={(profileIgn) => { setIgn(profileIgn); void handleSearch(profileIgn); }}
            playerData={advisorPlayerData}
          />
        )}
        </div>

        <div id="mining" className="scroll-mt-24">{result && <><HOTMCard progress={result.hotm} /><HOTFCard progress={result.hotf} /><GardenCard progress={result.garden} /></>}</div>
        <div id="fishing" className="scroll-mt-24">{result && <FishingCard progress={result.fishing} />}</div>
        <div id="islands" className="scroll-mt-24">{result && <><CrimsonCard progress={result.crimson} /><RiftCard progress={result.rift} /></>}</div>

        <div id="stats" className="mb-8 grid scroll-mt-24 gap-6 lg:grid-cols-2 [&>section]:mb-0 [&>section]:h-full">
        {result?.skills && (
          <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-xl font-semibold mb-4">Skills</h2>
            {result.skills.length > 0 ? (
              result.skills.map((s) => <SkillBar key={s.skill} {...s} />)
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
              result.slayers.map((s) => (
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
        </div>

        <div id="pets" className="scroll-mt-24">
        {result?.pets && result.pets.length > 0 && (
          <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Pets</h2>
              <span className="text-sm text-neutral-500">
                {result.pets.filter((pet) => pet.active).length} active ·{' '}
                {result.pets.length} total
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-1">
              {result.pets.map((p, i) => (
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
                      className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl shadow-lg"
                      style={{
                        backgroundColor: p.tierColor,
                        zIndex: 10,
                        boxShadow: `0 0 10px 3px ${p.tierColor}, 0 0 28px 9px ${p.tierColor}99`,
                      }}
                    >
                      <Image
                        src={getPetHeadSrc(p.type, p.skinId)}
                        alt={
                          getPetTextureHash(p.type, p.skinId)
                            ? `${p.displayName} pet head`
                            : 'placeholder pet head'
                        }
                        width={64}
                        height={64}
                        unoptimized
                        className="h-14 w-14 object-contain"
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
                      <div className="mt-1 text-[11px] text-neutral-200">
                        Level: {p.level}
                      </div>
                      <div className="mt-2 text-[11px] text-neutral-200">
                        XP: {Math.round(p.exp).toLocaleString()}
                      </div>
                      {(() => { const price = marketPriceFor(petMarketKey(p.type, p.tier), result.marketPrices); return <div className="mt-1 text-[11px] text-amber-300">{price ? `${Math.round(price.unitPrice).toLocaleString()} coins · ${price.source === 'auction-median' ? 'recent median' : price.source === 'auction-bin' ? 'lowest BIN' : price.source}` : 'Market price unavailable'}</div>; })()}
                      <div className={`mt-1 text-[11px] ${p.active ? 'text-emerald-400' : 'text-neutral-400'}`}>
                        Status: {p.active ? 'Active' : 'Inactive'}
                      </div>
                      {p.heldItem && (() => {
                        const petItem = getPetItemMetadata(p.heldItem);
                        return (
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-200">
                            {petItem?.imageUrl && (
                              <Image
                                src={petItem.imageUrl}
                                alt=""
                                width={20}
                                height={20}
                                unoptimized
                                className="h-5 w-5 object-contain [image-rendering:pixelated]"
                              />
                            )}
                            <span>{petItem?.name ?? formatDisplayName(p.heldItem)}</span>
                            {(() => { const price = marketPriceFor(p.heldItem, result.marketPrices); return price ? <span className="text-amber-300">· {Math.round(price.unitPrice).toLocaleString()} coins</span> : null; })()}
                          </div>
                        );
                      })()}
                      {!p.heldItem && (
                        <div className="mt-1 text-[11px] text-neutral-400">Held item: None</div>
                      )}
                      <div className="mt-1 text-[11px] text-neutral-200">
                        Candy used: {p.candyUsed}
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-200">
                        Equipped skin: {getPetSkinDisplayName(p.skinId) ?? 'Default'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        </div>

        <div id="gear" className="scroll-mt-24">
        {result?.inventory && <EquipmentSection inventory={result.inventory} metadata={result.itemMetadata} />}

        {result?.inventory && <InventoryStorageSection inventory={result.inventory} metadata={result.itemMetadata} />}

        {result?.accessories && <AccessoriesCard data={result.accessories} prices={result.marketPrices} />}
        </div>

        <div id="dungeons" className="scroll-mt-24">{result?.dungeons && <DungeonsSection progress={result.dungeons} />}</div>

        <div id="collections" className="scroll-mt-24">
        {result?.collections && (
          <CollectionsSection collections={result.collections} />
        )}
        </div>

        <div id="completion" className="scroll-mt-24">
          {result?.minions && <MinionProgressSection progress={result.minions} />}
          {result?.bestiary && <BestiarySection progress={result.bestiary} />}
          {result?.museum && <MuseumSection progress={result.museum} />}
          {result && <ProfileSnapshots profileKey={`${viewingUuid}:${result.profileName}`} parsedProfile={result} />}
        </div>
      </div>
    </main>
  );
}
