"use client";

import { useState } from 'react';
import SkillBar from '@/components/SkillBar';
import { parseSkills } from '@/lib/parseProfile';

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

      setResult({ skills });
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

      {result?.skills && (
        <div style={{ marginTop: '2rem' }}>
          {result.skills.map((s: any) => (
            <SkillBar key={s.skill} {...s} />
          ))}
        </div>
      )}
    </main>
  );
}