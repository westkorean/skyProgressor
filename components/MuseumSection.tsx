import type { MuseumProgress } from '@/lib/parseMuseum';
import PixelLock from './PixelLock';

export default function MuseumSection({ progress }: { progress: MuseumProgress }) {
  return <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
    <h2 className="text-xl font-semibold mb-3">Museum</h2>
    {!progress.available ? <div className="flex items-center gap-3 text-sm text-neutral-500"><PixelLock reason="Enable Museum API access in Hypixel SkyBlock settings, then refresh this profile." />Museum data is unavailable.</div> : <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
        <div><div className="text-xs text-neutral-500">Donated</div>{progress.donatedItems.length}</div>
        <div><div className="text-xs text-neutral-500">Missing</div>{progress.missingDonations.length}</div>
        <div><div className="text-xs text-neutral-500">Museum value</div>{progress.museumValue?.toLocaleString() ?? 'Unavailable'}</div>
        <div><div className="text-xs text-neutral-500">SkyBlock XP</div>{progress.skyblockXp.toLocaleString()}</div>
      </div>
      <h3 className="font-semibold text-sm mb-2">Donated items</h3><p className="text-xs text-neutral-400 max-h-24 overflow-y-auto">{progress.donatedItems.length ? progress.donatedItems.map((item) => item.name).join(', ') : 'None'}</p>
      <h3 className="font-semibold text-sm mt-4 mb-2">Missing donations</h3><p className="text-xs text-neutral-400 max-h-24 overflow-y-auto">{progress.missingDonations.length ? progress.missingDonations.map((item) => item.name).join(', ') : 'None'}</p>
      <h3 className="font-semibold text-sm mt-4 mb-1">Cheapest next donation</h3>{progress.cheapestNextDonation ? <p className="text-xs text-neutral-300">{progress.cheapestNextDonation.name} · approximately {Math.round(progress.cheapestNextDonation.estimatedCost).toLocaleString()} coins in Bazaar ingredients</p> : <p className="text-xs text-neutral-500">No missing donation has a fully Bazaar-priceable verified recipe.</p>}
    </>}
  </section>;
}
