import type { SkyProgressorAchievementSummary } from '@/lib/skyProgressorAchievements';

const category = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function SkyProgressorAchievements({ summary }: { summary: SkyProgressorAchievementSummary }) {
  return <section className="mb-8 rounded-xl border border-violet-800/50 bg-neutral-900 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">SkyProgressor Achievements</h2><p className="mt-1 text-xs text-neutral-500">Custom profile milestones created by SkyProgressor. These are separate from Hypixel achievements.</p></div><div className="text-right"><div className="text-xl font-black text-violet-300">{summary.overallCompletionPercent}%</div><div className="text-[10px] text-neutral-500">{summary.completed} / {summary.total} completed</div></div></div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">{summary.achievements.map((achievement) => <article key={achievement.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-start justify-between gap-2"><div><div className="text-[10px] font-bold uppercase tracking-wide text-violet-400">{category(achievement.category)}</div><h3 className="font-semibold text-neutral-100">{achievement.title}</h3></div><span className={`rounded-full px-2 py-0.5 text-xs ${achievement.completed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-violet-500/15 text-violet-300'}`}>{achievement.completionPercent}%</span></div>
      <p className="mt-1 text-xs text-neutral-400">{achievement.description}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-800"><div className={`h-full ${achievement.completed ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${achievement.completionPercent}%` }} /></div>
      <div className="mt-3 space-y-1">{achievement.criteria.map((item) => <div key={item.id} className="flex justify-between gap-3 text-[11px]"><span className="text-neutral-500">{item.label}</span><span className="text-neutral-300">{Number(item.current.toFixed(1)).toLocaleString()} / {Number(item.target.toFixed(1)).toLocaleString()} {item.unit}</span></div>)}</div>
    </article>)}</div>
  </section>;
}
