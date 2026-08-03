'use client';
import { useMemo, useState } from 'react';
import type { ProgressionRoadmap as Roadmap, RoadmapGoal, RoadmapTrackId } from '@/lib/progressionRoadmap';

const categoryName = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

export default function ProgressionRoadmap({ roadmap }: { roadmap: Roadmap }) {
  const [selectedTrack, setSelectedTrack] = useState<RoadmapTrackId>('overall');
  const track = roadmap.tracks.find(item => item.id === selectedTrack) ?? roadmap.tracks[0];
  const goals = useMemo(() => track ? [track.current, track.next, ...track.future].filter((goal): goal is RoadmapGoal => Boolean(goal)) : [], [track]);
  if (!roadmap.tracks.length) return null;
  return <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
    <h2 className="mb-1 text-xl font-semibold">Progression Roadmap</h2>
    <p className="mb-4 text-xs text-neutral-500">Choose the main roadmap or focus on one activity.</p>
    <div className="mb-4 flex gap-2 overflow-x-auto pb-2">{roadmap.tracks.map(item => <button key={item.id} type="button" onClick={() => setSelectedTrack(item.id)} className={`shrink-0 rounded border px-3 py-2 text-xs font-semibold ${item.id === track?.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-white'}`}>{item.name}</button>)}</div>
    {track && <div className="mb-4"><h3 className="font-semibold">{track.name} Roadmap</h3><p className="text-xs text-neutral-500">{track.description}</p></div>}
    {!goals.length ? <div className="rounded border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">No urgent deterministic goals in this category. This does not mean the category is complete.</div> : <div className="space-y-3">{goals.map((goal, index) => <div key={goal.id} className="relative rounded-lg border border-neutral-800 bg-neutral-950 p-4">
      <div className="mb-2 flex justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">{index === 0 ? 'Current Goal' : index === 1 ? 'Next Goal' : 'Future Goal'} · {categoryName(goal.category)}</span><h3 className="font-semibold">{goal.goal}</h3></div><span className="shrink-0 text-sm text-neutral-400">{goal.estimatedTime}</span></div>
      <p className="text-xs text-neutral-400">{goal.reason}</p>
      <div className="my-3 h-2 overflow-hidden rounded bg-neutral-800"><div className="h-full bg-emerald-500" style={{ width: `${goal.progressPercent}%` }} /></div>
      <div className="grid gap-1 text-[11px] text-neutral-500 sm:grid-cols-3"><span>Cost: {goal.estimatedCost}</span><span>Benefit: {goal.expectedBenefit}</span><span>Activity: {goal.recommendedActivity}</span></div>
      {index < goals.length - 1 && <span className="absolute -bottom-4 left-1/2 z-10 text-emerald-500">↓</span>}
    </div>)}</div>}
  </section>;
}
