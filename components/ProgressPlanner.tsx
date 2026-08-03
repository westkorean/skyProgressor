import type { ProgressPlanner as Planner } from '@/lib/progressPlanner';

const statusStyle: Record<string, string> = { completed: 'text-emerald-300 bg-emerald-500/15', current: 'text-amber-300 bg-amber-500/15', upcoming: 'text-sky-300 bg-sky-500/15', locked: 'text-neutral-500 bg-neutral-800' };

export default function ProgressPlanner({ planner }: { planner: Planner }) {
  if (!planner.goals.length) return null;
  return <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Progress Planner</h2><p className="mt-1 text-xs text-neutral-500">Dependency-ordered goals generated deterministically from this profile.</p>{planner.cheapestProgressionGoal && <p className="mt-1 text-[11px] text-amber-300">Cheapest actionable path: {planner.cheapestProgressionGoal.title} · {planner.cheapestProgressionGoal.estimatedCostCoins.toLocaleString()} coins</p>}</div><div className="text-right"><div className="text-sm font-semibold text-emerald-300">{planner.overallProgressPercent}%</div><div className="text-[10px] text-neutral-500">{planner.completedGoals} / {planner.goals.length} completed</div></div></div>
    <div className="mt-4 space-y-3">{planner.goals.map((goal, index) => <article key={goal.id} className="relative rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Goal {index + 1} · {goal.category}</div><h3 className="font-semibold text-neutral-100">{goal.title}</h3></div><span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${statusStyle[goal.status]}`}>{goal.status}</span></div>
      <p className="mt-1 text-xs text-neutral-400">{goal.reason}</p>
      <div className="mt-3 flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-800"><div className="h-full bg-emerald-500" style={{ width: `${goal.progressPercent}%` }} /></div><span className="w-10 text-right text-xs text-neutral-400">{goal.progressPercent}%</span></div>
      <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2"><div><span className="text-neutral-500">Estimated time:</span> {goal.estimatedTime}</div><div><span className="text-neutral-500">Estimated cost:</span> {goal.estimatedCost}</div><div><span className="text-neutral-500">Prerequisites:</span> {goal.prerequisites.length ? goal.prerequisites.join(', ') : 'None'}</div><div><span className="text-neutral-500">Expected reward:</span> {goal.expectedReward}</div></div>
      {index < planner.goals.length - 1 && <span className="absolute -bottom-4 left-1/2 z-10 text-emerald-500">↓</span>}
    </article>)}</div>
  </section>;
}
