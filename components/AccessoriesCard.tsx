import PixelLock from './PixelLock';
import type { AccessoriesData } from '@/lib/parseAccessories';
import { marketPriceFor, type MarketPrices } from '@/lib/marketPrices';

const name = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function AccessoriesCard({ data, prices }: { data: AccessoriesData; prices: MarketPrices }) {
  return <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
    <div className="mb-4 flex justify-between"><h2 className="text-xl font-semibold">Accessories</h2>{!data.available && <PixelLock compact reason="Enable inventory API access to analyze individual accessories." />}</div>
    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><span className="text-xs text-neutral-500">Magical Power</span><b className="block">{data.magicalPower.toLocaleString()}</b></div><div><span className="text-xs text-neutral-500">Active Power</span><b className="block">{data.activePower ? name(data.activePower) : 'Unavailable'}</b></div><div><span className="text-xs text-neutral-500">Recombobulated</span><b className="block">{data.recombobulatedCount}</b></div><div><span className="text-xs text-neutral-500">Bag upgrades</span><b className="block">{data.bagUpgrades}</b></div></div>
    {data.duplicates.length > 0 && <div className="mt-4 rounded-lg border border-amber-800/60 bg-amber-950/20 p-3"><h3 className="text-sm font-semibold text-amber-300">Duplicate warning</h3><div className="mt-1 space-y-1 text-xs text-neutral-400">{data.duplicates.map((item) => { const price = marketPriceFor(item.id, prices); return <p key={item.id}>{item.name} ×{item.count}{price ? ` · ${Math.round(price.unitPrice * item.count).toLocaleString()} coins total` : ' · price unavailable'}</p>; })}</div></div>}
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div><h3 className="mb-2 text-sm font-semibold">Enrichments</h3><p className="text-xs text-neutral-400">{Object.keys(data.enrichments).length ? Object.entries(data.enrichments).map(([key, value]) => `${name(key)} ${value}`).join(' · ') : 'None detected'}</p></div>
      <div><h3 className="mb-2 text-sm font-semibold">Cheapest progression opportunities</h3>{data.opportunities.length ? <ul className="space-y-1 text-xs text-neutral-400">{data.opportunities.map((opportunity) => <li key={opportunity.id}>{opportunity.title} — {opportunity.estimatedPrice !== null ? `${Math.round(opportunity.estimatedPrice).toLocaleString()} coins · ${opportunity.priceSource}` : 'market price unavailable'}</li>)}</ul> : <p className="text-xs text-neutral-500">No catalog-backed opportunities available yet.</p>}</div>
    </div>
    {(data.missingAccessories.length > 0 || data.missingRarityUpgrades.length > 0 || data.missingFamilies.length > 0) && <div className="mt-4 text-xs text-neutral-400">Missing: {[...data.missingAccessories, ...data.missingRarityUpgrades, ...data.missingFamilies].join(', ')}</div>}
  </section>;
}
