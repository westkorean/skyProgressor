'use client';

import { useState } from 'react';
import { simulateProfileChange, type SimulationChange, type SimulationProfile, type SimulationResult } from '@/lib/simulation';

type Scenario = 'magical-power' | 'foraging' | 'elephant';

export default function RecommendationSimulator({ profile }: { profile: SimulationProfile }) {
  const [scenario, setScenario] = useState<Scenario>('magical-power');
  const [target, setTarget] = useState(700);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const run = () => {
    const change: SimulationChange = scenario === 'magical-power'
      ? { type: 'set-magical-power', target }
      : scenario === 'foraging'
        ? { type: 'set-skill-level', skill: 'foraging', target }
        : { type: 'acquire-pet', petType: 'ELEPHANT', tier: 'LEGENDARY', level: target };
    setResult(simulateProfileChange(profile, change));
  };

  const defaults: Record<Scenario, number> = { 'magical-power': 700, foraging: 30, elephant: 100 };
  return (
    <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div><h2 className="text-xl font-semibold">Recommendation Simulator</h2><p className="mt-1 text-sm text-neutral-500">Preview deterministic changes without modifying the loaded profile.</p></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <select value={scenario} onChange={(event) => { const value = event.target.value as Scenario; setScenario(value); setTarget(defaults[value]); setResult(null); }} className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200">
          <option value="magical-power">Increase Magical Power</option><option value="foraging">Upgrade Foraging</option><option value="elephant">Buy Legendary Elephant</option>
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-xs text-neutral-500">{scenario === 'elephant' ? 'Pet level' : 'Target'}<input type="number" min={scenario === 'elephant' ? 1 : 0} max={scenario === 'magical-power' ? 100000 : scenario === 'foraging' ? 50 : 100} value={target} onChange={(event) => setTarget(Number(event.target.value))} className="w-20 bg-transparent py-2 text-right text-sm text-white outline-none" /></label>
        <button type="button" onClick={run} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Simulate</button>
      </div>
      {result && <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-neutral-100">{result.title}</h3><span className={`rounded-full px-2 py-0.5 text-xs ${result.applied ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{result.applied ? 'Simulated' : 'No improvement'}</span></div><p className="mt-1 text-sm text-neutral-400">{result.summary}</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{result.impacts.map((item) => <div key={item.id} className="rounded-lg bg-neutral-900 p-3 text-xs"><div className="text-neutral-500">{item.label} · {item.certainty}</div><div className="mt-1 text-neutral-200">{Number(item.before.toFixed(2)).toLocaleString()} → {Number(item.after.toFixed(2)).toLocaleString()} {item.unit}</div><div className="text-emerald-400">+{Number(item.delta.toFixed(2)).toLocaleString()}</div></div>)}</div>{result.unlocks.length > 0 && <div className="mt-3"><div className="text-xs text-neutral-500">Unlock status</div><div className="mt-1 flex flex-wrap gap-1.5">{result.unlocks.map((item) => <span key={item.id} className={`rounded-md px-2 py-1 text-xs ${item.newlyUnlocked ? 'bg-emerald-500/15 text-emerald-300' : 'bg-neutral-900 text-neutral-500'}`}>{item.title} · {item.newlyUnlocked ? 'new' : 'already available'}</span>)}</div>{!result.unlocks.some((item) => item.newlyUnlocked) && <div className="mt-1 text-[11px] text-neutral-500">No new level-only unlock represented by this change.</div>}</div>}{result.warnings.map((warning) => <div key={warning} className="mt-2 text-[11px] text-neutral-500">{warning}</div>)}</div>}
    </section>
  );
}
