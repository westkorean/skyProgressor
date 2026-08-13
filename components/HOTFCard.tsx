import PixelLock from './PixelLock';
import type { HOTFProgress } from '@/lib/parseHOTF';

const label = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function HOTFCard({ progress }: { progress: HOTFProgress }) {
  if (!progress.available) {
    return <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5"><h2 className="mb-3 text-xl font-semibold">Heart of the Forest</h2><div className="flex items-center gap-3 text-sm text-neutral-400"><PixelLock reason="Heart of the Forest data is unavailable or has not been unlocked." />HOTF data unavailable.</div></section>;
  }

  return (
    <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-2 flex justify-between">
        <div><h2 className="text-xl font-semibold">Heart of the Forest</h2><p className="text-xs text-neutral-500">{progress.currentXp.toLocaleString()} XP - Tree slot {progress.selectedTreeSlot}</p></div>
        <span className="text-green-300">Level {progress.level} / {progress.maxLevel}</span>
      </div>
      <div className="mb-5 h-3 overflow-hidden rounded-full bg-neutral-800"><div className="h-full bg-green-500" style={{width:`${progress.progressPercent}%`}} /></div>
      <div className="mb-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><div className="rounded border border-neutral-800 bg-neutral-950 p-3"><span className="text-xs text-neutral-500">Forest Whispers</span><b className="block">{progress.forestWhispers.toLocaleString()}</b><small className="text-neutral-500">{progress.totalForestWhispers.toLocaleString()} total</small></div><div className="rounded border border-neutral-800 bg-neutral-950 p-3"><span className="text-xs text-neutral-500">Whispers Spent</span><b className="block">{progress.forestWhispersSpent.toLocaleString()}</b><small className="text-neutral-500">{progress.tokensSpent} tokens spent</small></div><div className="rounded border border-neutral-800 bg-neutral-950 p-3"><span className="text-xs text-neutral-500">Foraging Stats</span><b className="block">{progress.sweep} Sweep</b><small className="text-neutral-500">{progress.foragingFortune} Fortune - {progress.speedBoost} Speed</small></div><div className="rounded border border-neutral-800 bg-neutral-950 p-3"><span className="text-xs text-neutral-500">Axe Ability</span><b className="block">{progress.selectedAbility ? label(progress.selectedAbility) : 'None selected'}</b><small className="text-neutral-500">Center {progress.centerOfTheForestLevel} - Daily Wishes {progress.dailyWishes}</small></div></div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">Perks</h3>
      <div className="grid gap-2 md:grid-cols-2">
        {progress.perks.map((perk) => <article key={perk.id} className={`rounded-lg border bg-neutral-950 p-3 ${perk.level > 0 ? 'border-neutral-800' : 'border-neutral-900 opacity-70'}`}><div className="flex justify-between"><b>{perk.name}</b><span className="text-green-300">{perk.level}{perk.maxLevel === null ? '' : ` / ${perk.maxLevel}`}</span></div><p className="mt-1 text-xs text-neutral-400">{perk.description}</p><p className="mt-2 text-[11px] text-neutral-500">{perk.costToNextLevel === null ? (perk.level === perk.maxLevel ? 'Maxed' : 'Next cost unavailable') : `Next: ${perk.costToNextLevel.toLocaleString()} Forest Whispers`}{perk.level > 0 && !perk.enabled && ' - Purchased but disabled'}</p></article>)}
      </div>
    </section>
  );
}
