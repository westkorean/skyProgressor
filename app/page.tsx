"use client";

import { useState } from 'react';
import { parseSkills } from '@/lib/parseProfile';
import mockProfile from '@/lib/mockProfile.json';


// inside handleSearch or a test button:
const member = Object.values(mockProfile.profile.members)[0];
console.log(parseSkills(member));

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

      setResult(profileData);
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
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}