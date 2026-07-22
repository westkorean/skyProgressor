"use client";

import { useState } from 'react';
import SkillBar from '@/components/SkillBar';
import SuggestionCard from '@/components/SuggestionCard';
import { parseSkills, parseSlayers, parseCatacombs, parseFairySouls } from '@/lib/parseProfile';
import { getTopSuggestions } from '@/lib/getSuggestions';

export default function Home() {
  const [ign, setIgn] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const uuidRes = await fetch(`/api/uuid?ign=${ign}`);
      const uuidData = await uuidRes.json();
      if (!uuidRes.ok) throw new Error(uuidData.error);

      const profileRes = await fetch(`/api/profile?uuid=${uuidData.id}`);
      const profileData = await profileRes.json();
      if (!profileData.success) throw new Error(profileData.cause || 'Failed to fetch profile');

      const selectedProfile = profileData.profiles.find((p: any) => p.selected);
      const member = selectedProfile.members[uuidData.id];

      const skills = parseSkills(member);
      const slayers = parseSlayers(member);
      const catacombs = parseCatacombs(member);
      const fairySouls = parseFairySouls(member);
      const suggestions = getTopSuggestions(skills, slayers, catacombs);

      setResult({ skills, slayers, catacombs, fairySouls, suggestions });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
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
            className="bg-emerald-600 hover:bg-emerald-500 transition-colors px-5 py-2 rounded-lg font-medium"
          >
            Search
          </button>
        </div>

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
            {result.skills.map((s: any) => (
              <SkillBar key={s.skill} {...s} />
            ))}
          </section>
        )}

        {result?.slayers && (
          <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-xl font-semibold mb-4">Slayers</h2>
            {result.slayers.map((s: any) => (
              <SkillBar key={s.slayer} skill={s.slayer} {...s} />
            ))}
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