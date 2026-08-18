'use client';
/* eslint-disable react-hooks/set-state-in-effect -- saved planner state is hydrated from the browser after SSR. */

import { useEffect, useState, type FormEvent } from 'react';
import type { ProgressPlanner as Planner } from '@/lib/progressPlanner';

const statusStyle: Record<string, string> = { completed: 'text-emerald-300 bg-emerald-500/15', current: 'text-amber-300 bg-amber-500/15', upcoming: 'text-sky-300 bg-sky-500/15', locked: 'text-neutral-500 bg-neutral-800' };
const storageKey = (profileKey: string) => `skyprogressor:planner:${encodeURIComponent(profileKey)}`;

function readPlanner(profileKey: string): Planner | null {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(profileKey)) ?? 'null') as Planner | null;
    return value?.generatedBy === 'ai-progress-planner' && Array.isArray(value.goals) ? value : null;
  } catch { return null; }
}

export default function ProgressPlanner({ planner: defaultPlanner, profileKey, playerData }: { planner: Planner; profileKey: string; playerData: unknown }) {
  const [planner, setPlanner] = useState(defaultPlanner);
  const [panelOpen, setPanelOpen] = useState(false);
  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPlanner(readPlanner(profileKey) ?? defaultPlanner), [defaultPlanner, profileKey]);

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    if (!preferences.trim() || loading) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/progress-planner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ preferences, playerData }) });
      const payload = await response.json() as { planner?: Planner; error?: string };
      if (!response.ok || !payload.planner) throw new Error(payload.error ?? 'Unable to generate a planner.');
      localStorage.setItem(storageKey(profileKey), JSON.stringify(payload.planner));
      setPlanner(payload.planner);
      setPanelOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to generate a planner.');
    } finally { setLoading(false); }
  };

  const restoreDefault = () => {
    localStorage.removeItem(storageKey(profileKey));
    setPlanner(defaultPlanner); setError(null); setPanelOpen(false);
  };

  if (!planner.goals.length) return null;
  const curated = planner.generatedBy === 'ai-progress-planner';
  return <section className="relative mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
    <button type="button" onClick={() => setPanelOpen(true)} aria-haspopup="dialog" className="absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-2 rounded-l-lg border border-r-0 border-violet-500/50 bg-violet-950 px-2 py-4 text-[10px] font-bold uppercase tracking-wider text-violet-200 shadow-lg [writing-mode:vertical-rl] hover:bg-violet-900">AI planner</button>
    <div className="flex flex-wrap items-start justify-between gap-3 pr-5"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">Progress Planner</h2>{curated && <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-300">AI curated</span>}</div><p className="mt-1 text-xs text-neutral-500">{curated ? 'Curated by the AI advisor for this visitor and profile.' : 'Default goals generated deterministically for every visitor to this profile.'}</p>{planner.cheapestProgressionGoal && <p className="mt-1 text-[11px] text-amber-300">Cheapest actionable path: {planner.cheapestProgressionGoal.title} · {planner.cheapestProgressionGoal.estimatedCostCoins.toLocaleString()} coins</p>}</div><div className="text-right"><div className="text-sm font-semibold text-emerald-300">{planner.overallProgressPercent}%</div><div className="text-[10px] text-neutral-500">{planner.completedGoals} / {planner.goals.length} completed</div></div></div>
    <div className="mt-4 space-y-3">{planner.goals.map((goal, index) => <article key={goal.id} className="relative rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Goal {index + 1} · {goal.category}</div><h3 className="font-semibold text-neutral-100">{goal.title}</h3></div><span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${statusStyle[goal.status]}`}>{goal.status}</span></div>
      <p className="mt-1 text-xs text-neutral-400">{goal.reason}</p>
      <div className="mt-3 flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-800"><div className="h-full bg-emerald-500" style={{ width: `${goal.progressPercent}%` }} /></div><span className="w-10 text-right text-xs text-neutral-400">{goal.progressPercent}%</span></div>
      <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2"><div><span className="text-neutral-500">Estimated time:</span> {goal.estimatedTime}</div><div><span className="text-neutral-500">Estimated cost:</span> {goal.estimatedCost}</div><div><span className="text-neutral-500">Prerequisites:</span> {goal.prerequisites.length ? goal.prerequisites.join(', ') : 'None'}</div><div><span className="text-neutral-500">Expected reward:</span> {goal.expectedReward}</div></div>
      {index < planner.goals.length - 1 && <span className="absolute -bottom-4 left-1/2 z-10 text-emerald-500">↓</span>}
    </article>)}</div>

    {panelOpen && <div className="fixed inset-0 z-[90] bg-black/60" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPanelOpen(false); }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="planner-panel-title" className="ml-auto flex h-full w-full max-w-md flex-col border-l border-violet-500/40 bg-neutral-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div><h3 id="planner-panel-title" className="text-lg font-semibold text-violet-200">Curate with the AI advisor</h3><p className="mt-1 text-xs leading-5 text-neutral-400">Tell the advisor what matters to you. It will use this profile’s levels, equipment, and recommendations to build a saved personal plan.</p></div><button type="button" onClick={() => setPanelOpen(false)} aria-label="Close planner panel" className="rounded px-2 py-1 text-xl text-neutral-500 hover:bg-neutral-800 hover:text-white">×</button></div>
        <form onSubmit={generate} className="mt-6 flex flex-1 flex-col"><label htmlFor="planner-preferences" className="text-sm font-medium">What are your goals?</label><textarea id="planner-preferences" value={preferences} onChange={(event) => setPreferences(event.target.value.slice(0, 500))} rows={7} placeholder="Example: Prioritize combat and dungeons, keep costs under 20 million coins, and give me goals I can finish in short sessions." className="mt-2 resize-none rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-sm outline-none focus:border-violet-500" /><div className="mt-1 text-right text-[10px] text-neutral-600">{preferences.length}/500</div>
          <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-400"><span className="font-semibold text-neutral-200">Default stays available.</span> Your curated plan is stored only in this browser for this profile, and can be reset at any time.</div>
          {error && <p role="alert" className="mt-3 text-xs text-red-400">{error}</p>}
          <div className="mt-auto space-y-2 pt-6"><button type="submit" disabled={loading || !preferences.trim()} className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold hover:bg-violet-500 disabled:opacity-40">{loading ? 'Advisor is building your plan…' : curated ? 'Regenerate curated goals' : 'Generate curated goals'}</button>{curated && <button type="button" onClick={restoreDefault} className="w-full rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-400 hover:border-neutral-500 hover:text-white">Restore default planner</button>}</div>
        </form>
      </aside>
    </div>}
  </section>;
}
