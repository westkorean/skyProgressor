import Image from 'next/image';
import type { MinionProgress } from '@/lib/parseMinions';

export default function MinionProgressSection({ progress }: { progress: MinionProgress }) {
  return (
    <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div><h2 className="text-xl font-semibold">Minion Progress</h2><p className="text-xs text-neutral-500">{progress.uniqueCrafts} unique crafts · approximately {progress.estimatedSlots} slots</p></div>
        <span className="text-sm text-neutral-400">{progress.progressPercent}%</span>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-neutral-800"><div className="h-full bg-emerald-500" style={{ width: `${progress.progressPercent}%` }} /></div>
      {progress.craftsUntilNextSlot !== null && <p className="mb-4 text-sm text-neutral-300">Next slot in {progress.craftsUntilNextSlot} unique craft{progress.craftsUntilNextSlot === 1 ? '' : 's'}.</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {progress.families.map((family) => (
          <div key={family.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
            <div className="flex items-center gap-2">
              <Image src={`https://sky.shiiyu.moe/api/item/${encodeURIComponent(`${family.id}_GENERATOR_1`)}`} alt="" width={44} height={44} unoptimized className="h-11 w-11 shrink-0 object-contain [image-rendering:pixelated]" />
              <div className="text-sm font-medium">{family.name}</div>
            </div>
            <div className="mt-2 text-xs text-neutral-400">Highest tier: {family.highestTier || 'Not crafted'} / {family.maxTier}</div>
            <div className="text-xs text-neutral-500">Missing: {family.missingTiers.length ? family.missingTiers.join(', ') : 'None'}</div>
          </div>
        ))}
      </div>
      <h3 className="mb-2 mt-5 font-semibold">Closest unlocks</h3>
      <div className="space-y-1 text-sm text-neutral-300">{progress.closestUnlocks.map((upgrade) => <div key={upgrade.id}>{upgrade.name} Tier {upgrade.tier}</div>)}</div>
      <h3 className="mb-2 mt-5 font-semibold">Cheapest missing upgrades</h3>
      {progress.cheapestMissingUpgrades.length ? <div className="space-y-1 text-sm text-neutral-300">{progress.cheapestMissingUpgrades.map((upgrade) => <div key={upgrade.id}>{upgrade.name} Tier {upgrade.tier} · {Math.round(upgrade.estimatedCost ?? 0).toLocaleString()} coins</div>)}</div> : <p className="text-sm text-neutral-500">No missing upgrade has a fully Bazaar-priceable verified recipe.</p>}
    </section>
  );
}
