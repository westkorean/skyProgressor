import PixelLock from './PixelLock';
import type { RiftProgress } from '@/lib/parseRift';

const name = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

export default function RiftCard({ progress }: { progress: RiftProgress }) {
  if (!progress.available) {
    return <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5"><h2 className="mb-3 text-xl font-semibold">The Rift</h2><div className="flex items-center gap-3 text-sm text-neutral-400"><PixelLock reason="Rift API data is unavailable." />Progress unavailable.</div></section>;
  }
  return <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
    <div className="mb-2 flex justify-between gap-4"><div><h2 className="text-xl font-semibold">The Rift</h2><p className="text-xs text-neutral-500">Status: {progress.currentStatus}</p></div><span className="text-fuchsia-300">{progress.completionPercent}% tracked completion</span></div>
    <div className="mb-5 h-3 overflow-hidden rounded bg-neutral-800"><div className="h-full bg-fuchsia-500" style={{ width: `${progress.completionPercent}%` }} /></div>
    <div className="mb-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <div>Rift Time<b className="block">Not exposed by API</b></div>
      <div>Timecharms<b className="block">{progress.timecharmsFound} / {progress.timecharmsTotal}</b></div>
      <div>Enigma Souls<b className="block">{progress.enigmaSouls.found} / {progress.enigmaSouls.total}</b></div>
      <div>Vampire Slayer<b className="block">Level {progress.vampireSlayer.level} / {progress.vampireSlayer.maxLevel}</b><small className="text-neutral-500">{progress.vampireSlayer.bossKills} bosses</small></div>
    </div>
    <div className="mb-5 grid gap-4 lg:grid-cols-2">
      <div><h3 className="mb-2 font-semibold">Timecharms</h3><div className="grid gap-1 text-xs sm:grid-cols-2">{progress.timecharms.map(charm => <div key={charm.id} className={charm.value === true ? 'text-emerald-400' : 'text-neutral-500'}>{charm.value === true ? '✓' : '○'} {charm.name}</div>)}</div></div>
      <div><h3 className="mb-2 font-semibold">Area progression</h3><div className="grid gap-1 text-xs sm:grid-cols-2">{progress.areas.map(area => <div key={area.id} className={area.value === true ? 'text-emerald-400' : 'text-neutral-500'}>{area.value === true ? '✓' : '○'} {area.name}</div>)}</div></div>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <div><h3 className="mb-2 font-semibold">Currencies and collections</h3><p className="text-xs text-neutral-400">{Object.entries(progress.currencies).map(([key, value]) => `${name(key)} ${value.toLocaleString()}`).join(' · ')}</p><p className="mt-2 text-xs text-neutral-400">{progress.collections.map(collection => `${collection.name} ${Number(collection.value).toLocaleString()}`).join(' · ') || 'No Rift collections reported'}</p></div>
      <div><h3 className="mb-2 font-semibold">Missing unlocks</h3>{progress.missingUnlocks.length ? <ul className="text-xs text-neutral-400">{progress.missingUnlocks.map(unlock => <li key={unlock}>• {unlock}</li>)}</ul> : <p className="text-xs text-emerald-400">All tracked unlocks obtained.</p>}</div>
    </div>
  </section>;
}
