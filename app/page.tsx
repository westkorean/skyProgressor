"use client";

import { useState } from 'react';
import SkillBar from '@/components/SkillBar';
import { parseSkills, parseSlayers, parseCatacombs } from '@/lib/parseProfile';
import { getTopSuggestions } from '@/lib/getSuggestions';
import SuggestionCard from '@/components/SuggestionCard';

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

      if (!profileData.success) {
        throw new Error(profileData.cause || 'Failed to fetch profile');
      }

      const selectedProfile = profileData.profiles.find((p: any) => p.selected);
      const member = selectedProfile.members[uuidData.id];

      const skills = parseSkills(member);
      const slayers = parseSlayers(member);
      const catacombs = parseCatacombs(member);

      const suggestions = getTopSuggestions(skills, slayers, catacombs);
      setResult({ skills, slayers, catacombs, suggestions });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };



  return (
    <main style={{ padding: '2rem' }}>
      <h1>SkyProgressor</h1>
      <input
        value={ign}
        onChange={(e) => setIgn(e.target.value)}
        placeholder="Enter your IGN"
      />
      <button onClick={handleSearch}>Search</button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {result?.suggestions && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Focus On Next</h2>
          {result.suggestions.map((s: any, i: number) => (
            <SuggestionCard key={i} suggestion={s} />
          ))}
        </div>
      )}

      {result?.skills && (
        <div style={{ marginTop: '2rem' }}>
          {result.skills.map((s: any) => (
            <SkillBar key={s.skill} {...s} />
          ))}
        </div>
      )}
      {result?.slayers && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Slayers</h2>
          {result.slayers.map((s: any) => (
            <SkillBar key={s.slayer} skill={s.slayer} {...s} />
          ))}
        </div>
      )}

      {result?.catacombs && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Catacombs</h2>
          <SkillBar skill="catacombs" {...result.catacombs} />
        </div>
      )}
    </main>
  );
}