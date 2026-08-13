'use client';

import { useEffect, useMemo, useState } from 'react';
import { createDerivedSnapshot, diffSnapshots, type ProfileSnapshot } from '@/lib/profileSnapshots';
import type { DerivedProfileSnapshot } from '@/lib/userProgressDatabase';

const KEY = 'skyprogressor:profile-snapshots:v1';

function loadSnapshots(): ProfileSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value) ? value as ProfileSnapshot[] : [];
  } catch { return []; }
}

function compact(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function linePoints(points: number[], y: (value: number) => number) {
  if (points.length < 2) return '';
  return points.map((value, index) => `${((index / Math.max(1, points.length - 1)) * 100).toFixed(2)},${y(value).toFixed(2)}`).join(' ');
}

const BENCHMARKS = [
  { id: 'early', label: 'Early', color: '#38bdf8', networth: 50_000_000, skillAverage: 18, skyblockLevel: 60 },
  { id: 'mid', label: 'Mid', color: '#10b981', networth: 500_000_000, skillAverage: 32, skyblockLevel: 120 },
  { id: 'late', label: 'Late', color: '#f59e0b', networth: 3_000_000_000, skillAverage: 45, skyblockLevel: 220 },
  { id: 'end', label: 'End', color: '#f43f5e', networth: 12_000_000_000, skillAverage: 55, skyblockLevel: 320 },
] as const;

function profileStage(metrics?: DerivedProfileSnapshot['metrics']) {
  if (!metrics) return null;
  if (metrics.networth >= 8_000_000_000 && metrics.skillAverage >= 50 && metrics.skyblockLevel >= 280) return 'end';
  if (metrics.networth >= 2_000_000_000 && metrics.skillAverage >= 42 && metrics.skyblockLevel >= 180) return 'late';
  if (metrics.networth >= 250_000_000 && metrics.skillAverage >= 28 && metrics.skyblockLevel >= 90) return 'mid';
  return 'early';
}

function yScale(values: number[]) {
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  return (value: number) => 40 - ((value - min) / Math.max(1, max - min)) * 38;
}

function BenchmarkChart({ title, currentLabel, current, history, benchmarkKey, activeStage }: { title: string; currentLabel: string; current: number; history: number[]; benchmarkKey: 'networth' | 'skillAverage'; activeStage: string | null }) {
  const values = [...history, current, ...BENCHMARKS.map((benchmark) => benchmark[benchmarkKey])];
  const y = yScale(values);
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex justify-between text-xs"><span className="text-neutral-500">{title}</span><span className="text-neutral-100">{currentLabel}</span></div>
      <svg viewBox="0 0 100 42" className="mt-3 h-32 w-full overflow-visible">
        {BENCHMARKS.map((benchmark) => <g key={benchmark.id}><line x1="0" x2="100" y1={y(benchmark[benchmarkKey])} y2={y(benchmark[benchmarkKey])} stroke={benchmark.color} strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" /><text x="1" y={Math.max(4, y(benchmark[benchmarkKey]) - 1)} fill={benchmark.color} fontSize="3">{benchmark.label}</text></g>)}
        <polyline points={linePoints(history, y)} fill="none" stroke={benchmarkKey === 'networth' ? '#f59e0b' : '#10b981'} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        <circle cx="100" cy={y(current)} r="2.2" fill="#ffffff" stroke={benchmarkKey === 'networth' ? '#f59e0b' : '#10b981'} strokeWidth="1" />
        <line x1="0" x2="100" y1="41" y2="41" stroke="#262626" strokeWidth="1" />
      </svg>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        {BENCHMARKS.map((benchmark) => <span key={benchmark.id} className={`rounded border px-2 py-1 ${activeStage === benchmark.id ? 'border-white bg-white/10 text-white' : 'border-neutral-800 text-neutral-500'}`}>{benchmark.label} avg {benchmarkKey === 'networth' ? compact(benchmark.networth) : benchmark.skillAverage.toFixed(0)}</span>)}
      </div>
    </div>
  );
}

export default function ProfileSnapshots({ profileKey, parsedProfile, history }: { profileKey:string; parsedProfile:unknown; history?: { snapshots: DerivedProfileSnapshot[]; networthTopPercent: number | null } }) {
  const [snapshots, setSnapshots] = useState<ProfileSnapshot[]>(loadSnapshots);
  const [savedHistory, setSavedHistory] = useState<typeof history>();
  const databaseHistory = savedHistory ?? history;
  const mine = snapshots.filter(snapshot => snapshot.profileKey === profileKey).sort((a,b) => b.timestamp-a.timestamp);
  const delta = mine[0] ? diffSnapshots(parsedProfile, mine[0].parsedProfile) : null;
  const timeline = useMemo(() => (databaseHistory?.snapshots ?? []).slice().sort((a,b) => a.timestamp - b.timestamp), [databaseHistory]);
  const latest = timeline.at(-1);
  const currentSnapshot = latest ?? createDerivedSnapshot(profileKey, parsedProfile);
  const currentStage = profileStage(currentSnapshot.metrics);
  const changes = delta ? [['Skill XP',delta.skillXp],['Collections',delta.collection],['HOTM XP',delta.hotmXp],['HOTF XP',delta.hotfXp],['Magical Power',delta.magicalPower],['Pets',delta.pets]] as const : [];

  useEffect(() => {
    const snapshot = createDerivedSnapshot(profileKey, parsedProfile);
    let cancelled = false;
    fetch('/api/profile-history', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(snapshot) })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (!cancelled && payload) setSavedHistory(payload as { snapshots: DerivedProfileSnapshot[]; networthTopPercent: number | null }); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [profileKey, parsedProfile]);

  const save = () => {
    const next = [...snapshots, { id:crypto.randomUUID(), profileKey, timestamp:Date.now(), parsedProfile }]
      .sort((a,b) => b.timestamp-a.timestamp).slice(0,30);
    localStorage.setItem(KEY, JSON.stringify(next));
    setSnapshots(next);
  };

  return (
    <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Progress Market</h2>
          <p className="text-xs text-neutral-500">Derived metrics only, saved locally on this server and in this browser. No raw Hypixel profile payloads are stored.</p>
        </div>
        <button type="button" onClick={save} className="rounded border border-emerald-700 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-900/40">Pin browser delta</button>
      </div>
      <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><div className="text-xs text-neutral-500">Current profile benchmark</div><div className="mt-1 text-lg font-semibold text-white">{currentStage ? `${BENCHMARKS.find((benchmark) => benchmark.id === currentStage)?.label} game track` : 'Waiting for data'}</div></div>
          <div className="grid grid-cols-3 gap-2 text-right text-xs"><span className="text-neutral-500">Net worth</span><span className="text-neutral-500">Skill avg</span><span className="text-neutral-500">SB level</span><b className="text-amber-300">{compact(currentSnapshot.metrics.networth)}</b><b className="text-emerald-300">{currentSnapshot.metrics.skillAverage.toFixed(2)}</b><b className="text-sky-300">{currentSnapshot.metrics.skyblockLevel}</b></div>
        </div>
        <p className="mt-2 text-[11px] text-neutral-500">Benchmarks are transparent local averages for early, mid, late, and end game comparison. They are not scraped from Discord and can be tuned as better public data becomes available.</p>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <BenchmarkChart title="Net worth vs stage averages" currentLabel={compact(currentSnapshot.metrics.networth)} current={currentSnapshot.metrics.networth} history={timeline.map((snapshot) => snapshot.metrics.networth)} benchmarkKey="networth" activeStage={currentStage} />
        <BenchmarkChart title="Skill average vs stage averages" currentLabel={currentSnapshot.metrics.skillAverage.toFixed(2)} current={currentSnapshot.metrics.skillAverage} history={timeline.map((snapshot) => snapshot.metrics.skillAverage)} benchmarkKey="skillAverage" activeStage={currentStage} />
      </div>
      <p className="mt-2 text-[11px] text-neutral-500">{timeline.length} database snapshots {databaseHistory?.networthTopPercent ? `- top ${databaseHistory.networthTopPercent}% of saved profiles` : '- ranking needs at least 2 profiles'}{latest ? ` - latest save ${new Date(latest.timestamp).toLocaleString()}` : ''}</p>
      {delta ? <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-6">{changes.map(([label,value])=><div key={label} className="rounded border border-neutral-800 bg-neutral-950 p-3"><div className="text-xs text-neutral-500">{label}</div><b className={value>0?'text-emerald-400':value<0?'text-red-400':'text-neutral-400'}>{value>0?'+':''}{value.toLocaleString()}</b></div>)}</div> : <p className="mt-4 text-sm text-neutral-500">Pin a browser delta if you want an extra before/after comparison on this device.</p>}
    </section>
  );
}
