'use client';
import { useState } from 'react';
import { diffSnapshots, type ProfileSnapshot } from '@/lib/profileSnapshots';
const KEY = 'skyprogressor:profile-snapshots:v1';

function loadSnapshots(): ProfileSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value) ? value as ProfileSnapshot[] : [];
  } catch { return []; }
}

export default function ProfileSnapshots({ profileKey, parsedProfile }: { profileKey:string; parsedProfile:unknown }) {
  const [snapshots, setSnapshots] = useState<ProfileSnapshot[]>(loadSnapshots);
  const mine = snapshots.filter(snapshot => snapshot.profileKey === profileKey).sort((a,b) => b.timestamp-a.timestamp);
  const delta = mine[0] ? diffSnapshots(parsedProfile, mine[0].parsedProfile) : null;
  const save = () => {
    const next = [...snapshots, { id:crypto.randomUUID(), profileKey, timestamp:Date.now(), parsedProfile }]
      .sort((a,b) => b.timestamp-a.timestamp).slice(0,30);
    localStorage.setItem(KEY, JSON.stringify(next)); setSnapshots(next);
  };
  const changes = delta ? [['Skill XP',delta.skillXp],['Collections',delta.collection],['HOTM XP',delta.hotmXp],['HOTF XP',delta.hotfXp],['Magical Power',delta.magicalPower],['Pets',delta.pets]] as const : [];
  return <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5"><div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Profile Snapshots</h2><p className="text-xs text-neutral-500">Stored only in this browser · {mine.length} saved</p></div><button type="button" onClick={save} className="rounded border border-emerald-700 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-900/40">Save snapshot</button></div>{delta?<div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-6">{changes.map(([label,value])=><div key={label} className="rounded border border-neutral-800 bg-neutral-950 p-3"><div className="text-xs text-neutral-500">{label}</div><b className={value>0?'text-emerald-400':value<0?'text-red-400':'text-neutral-400'}>{value>0?'+':''}{value.toLocaleString()}</b></div>)}</div>:<p className="mt-4 text-sm text-neutral-500">Save the first snapshot to begin tracking changes.</p>}</section>;
}
