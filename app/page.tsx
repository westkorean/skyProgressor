"use client";

import { useState, useRef } from 'react';
import SkillBar from '@/components/SkillBar';
import SuggestionCard from '@/components/SuggestionCard';
import { parseSkills, parseSlayers, parseCatacombs, parseFairySouls } from '@/lib/parseProfile';
import { getTopSuggestions } from '@/lib/getSuggestions';


export default function Home() {
  const [ign, setIgn] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<any[]>([]);
  const [uuid, setUuid] = useState<string | null>(null);
  const searchIdRef = useRef(0);

  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [viewingUuid, setViewingUuid] = useState<string | null>(null);

  const handleSearch = async () => {
    const currentSearchId = ++searchIdRef.current;
    setLoading(true);
    setError(null);
    setResult(null);
    setProfiles([]);
    setUuid(null);
    setCurrentProfile(null);
    setViewingUuid(null);

    try {
      const uuidRes = await fetch(`/api/uuid?ign=${ign}`);
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

      validProfiles.sort((a: any, b: any) => a.cute_name.localeCompare(b.cute_name));

      if (validProfiles.length == 0) {
        throw new Error(`Could not find SkyBlock data for ${ign} on any profile.`);
      }

      setProfiles(validProfiles);
      setUuid(uuidData.id);

      // Default to the selected one, or first available
      const defaultProfile =
        validProfiles.find((p: any) => p.selected) ?? validProfiles[0];

      await loadProfile(defaultProfile, uuidData.id, currentSearchId);
    } catch (err) {
      if (currentSearchId !== searchIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      if (currentSearchId === searchIdRef.current) setLoading(false);
    }
  };

  const loadProfile = async (profile: any, playerUuid: string, searchId?: number) => {
    const member = profile.members[playerUuid];

    const skills = parseSkills(member);
    const slayers = parseSlayers(member);
    const catacombs = parseCatacombs(member);
    const fairySouls = parseFairySouls(member);
    const suggestions = getTopSuggestions(skills, slayers, catacombs);

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

    if (searchId !== undefined && searchId !== searchIdRef.current) return;

    setCurrentProfile(profile);
    setViewingUuid(playerUuid);

    setResult({
      skills,
      slayers,
      catacombs,
      fairySouls,
      suggestions,
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
        <h1 className="text-3xl font-bold mb-6">SkyProgressor</h1>

        <div className="flex gap-2 mb-8">
          <input
            value={ign}
            onChange={(e) => setIgn(e.target.value)}
            placeholder="Enter your IGN"
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 transition-colors px-5 py-2 rounded-lg font-medium"
          >
            {loading ? 'Searching...' : 'Search'}
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

        {result?.coopMembers && result.coopMembers.length > 1 && (
          <div className="mb-6">
            <span className="text-neutral-500 text-sm mr-2">Co-op:</span>
            {result.coopMembers.map((m: any) => (
              <button
                key={m.uuid}
                onClick={() => viewMember(m.uuid)}
                className={`inline-block rounded-lg px-3 py-1 text-sm mr-2 mb-2 border ${
                  viewingUuid === m.uuid
                    ? 'bg-emerald-600 border-emerald-500'
                    : 'bg-neutral-900 border-neutral-700 hover:border-neutral-500'
                }`}
              >
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

        {result?.skills && (
          <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-xl font-semibold mb-4">Skills</h2>
            {result.skills.length > 0 ? (
              result.skills.map((s: any) => <SkillBar key={s.skill} {...s} />)
            ) : (
              <p className="text-neutral-500 text-sm">
                Skills data unavailable — this player may have Skills API access turned off.
              </p>
            )}
          </section>
        )}

        {result?.slayers && (
          <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-xl font-semibold mb-4">Slayers</h2>
            {result.slayers.length > 0 ? (
              result.slayers.map((s: any) => <SkillBar key={s.slayer} skill={s.slayer} {...s} />)
            ) : (
              <p className="text-neutral-500 text-sm">
                Slayer data unavailable — this player may have this API category turned off.
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
              {result.fairySouls.collected} / {result.fairySouls.total} collected ({result.fairySouls.progressPercent}%)
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
    </main>
  );
}