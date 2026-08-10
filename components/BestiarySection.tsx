import type { BestiaryFamilyProgress, BestiaryProgress } from '@/lib/parseBestiary';
import PixelLock from './PixelLock';
import Image from 'next/image';

function mobIcon(family: BestiaryFamilyProgress): string | null {
  const texture = family.texture;
  if (!texture) return null;
  const head = /^\/head\/([a-f0-9]+)$/i.exec(texture)?.[1];
  if (head) return `https://mc-heads.net/head/${head}/64`;
  const item = /^\/item\/(.+)$/i.exec(texture)?.[1];
  if (item) return `https://sky.shiiyu.moe/api/item/${encodeURIComponent(item)}`;
  return null;
}

export default function BestiarySection({ progress }: { progress: BestiaryProgress }) {
  if (!progress.available) return <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5"><h2 className="mb-3 text-xl font-semibold">Bestiary</h2><div className="flex items-center gap-3 text-sm text-neutral-400"><PixelLock reason="Enable Bestiary API access in Hypixel SkyBlock settings, then refresh this profile." />Bestiary data is unavailable.</div></section>;
  return <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
    <h2 className="text-xl font-semibold">Bestiary</h2>
    <div className="my-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><div className="text-xs text-neutral-500">Total kills</div>{progress.totalKills.toLocaleString()}</div><div><div className="text-xs text-neutral-500">Bestiary level</div>{progress.bestiaryLevel.toFixed(1)}</div><div><div className="text-xs text-neutral-500">Families</div>{progress.unlockedFamilies} / {progress.totalFamilies}</div><div><div className="text-xs text-neutral-500">SkyBlock XP</div>{progress.skyblockXp.toLocaleString()}</div></div>
    {progress.closestMilestone && <p className="mb-4 text-sm"><span className="text-neutral-500">Closest milestone:</span> {progress.closestMilestone.name} · {progress.closestMilestone.remainingKills?.toLocaleString()} kills remaining</p>}
    <div className="max-h-96 space-y-2 overflow-y-auto pr-1">{progress.families.filter((family) => family.kills > 0).sort((a, b) => b.kills - a.kills).map((family) => { const icon = mobIcon(family); return <div key={family.id} className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3 transition duration-200 hover:border-red-500/50 hover:bg-neutral-900">{icon ? <Image src={icon} alt={`${family.name} mob head`} width={40} height={40} loading="lazy" unoptimized className="h-10 w-10 shrink-0 object-contain [image-rendering:pixelated]" /> : <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center border-2 border-neutral-600 bg-neutral-800 text-sm font-black text-neutral-300 shadow-[2px_2px_0_#000]">{family.name.slice(0, 2).toUpperCase()}</span>}<div className="min-w-0 flex-1"><div className="flex justify-between gap-3 text-sm"><span className="truncate">{family.name}</span><span className="shrink-0 text-neutral-400">Tier {family.tier} · {family.kills.toLocaleString()} kills</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-800"><div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${family.progressPercent}%` }} /></div></div></div>; })}</div>
    <details className="mt-4"><summary className="cursor-pointer text-xs text-neutral-500">Missing families ({progress.missingFamilies.length})</summary><div className="mt-3 flex flex-wrap gap-2">{progress.missingFamilies.map((family) => <span key={family.id} className="inline-flex items-center gap-2 border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-400"><PixelLock compact reason="Encounter and defeat this mob at least once to reveal its Bestiary progress." />{family.name}</span>)}</div></details>
  </section>;
}
