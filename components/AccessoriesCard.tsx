import PixelLock from './PixelLock';
import type { AccessoriesData, AccessoryOpportunity } from '@/lib/parseAccessories';
import { marketPriceFor, type MarketPrices } from '@/lib/marketPrices';
import { displayItemId } from '@/lib/itemPresentation';

const name = (value: string) => displayItemId(value);
const price = (opportunity: AccessoryOpportunity) => opportunity.estimatedPrice !== null
  ? `${Math.round(opportunity.estimatedPrice).toLocaleString()} coins · ${opportunity.priceSource}`
  : 'price unavailable';

function OpportunityList({ rows, empty }: { rows: AccessoryOpportunity[]; empty: string }) {
  return rows.length ? <ul className="space-y-1 text-xs text-neutral-400">{rows.map(row => <li key={row.id}>{row.title} — {price(row)}</li>)}</ul> : <p className="text-xs text-neutral-500">{empty}</p>;
}

export default function AccessoriesCard({ data, prices }: { data: AccessoriesData; prices: MarketPrices }) {
  const upgrades = data.opportunities.filter(item => item.id.startsWith('upgrade-'));
  const newAccessories = data.opportunities.filter(item => item.id.startsWith('missing-'));
  return <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
    <div className="mb-4 flex justify-between"><h2 className="text-xl font-semibold">Accessories</h2>{!data.available && <PixelLock compact reason="Enable inventory API access to analyze individual accessories." />}</div>
    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><span className="text-xs text-neutral-500">Magical Power</span><b className="block">{data.magicalPower.toLocaleString()}</b></div><div><span className="text-xs text-neutral-500">Active Power</span><b className="block">{data.activePower ? name(data.activePower) : 'Unavailable'}</b></div><div><span className="text-xs text-neutral-500">Recombobulated</span><b className="block">{data.recombobulatedCount}</b></div><div><span className="text-xs text-neutral-500">Bag upgrades</span><b className="block">{data.bagUpgrades}</b></div></div>
    {data.duplicates.length > 0 && <div className="mt-4 rounded-lg border border-amber-800/60 bg-amber-950/20 p-3"><h3 className="text-sm font-semibold text-amber-300">Duplicate warning</h3><div className="mt-1 space-y-1 text-xs text-neutral-400">{data.duplicates.map(item => { const itemPrice = marketPriceFor(item.id, prices); return <p key={item.id}>{item.name} ×{item.count}{itemPrice ? ` · ${Math.round(itemPrice.unitPrice * item.count).toLocaleString()} coins total` : ' · price unavailable'}</p>; })}</div></div>}
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <div><h3 className="mb-2 text-sm font-semibold">Enrichments</h3><p className="text-xs text-neutral-400">{Object.keys(data.enrichments).length ? Object.entries(data.enrichments).map(([key, value]) => `${name(key)} ${value}`).join(' · ') : 'None detected'}</p></div>
      <div><h3 className="mb-2 text-sm font-semibold">Talisman upgrades</h3><OpportunityList rows={upgrades} empty="No known upgrades available." /></div>
      <div><h3 className="mb-2 text-sm font-semibold">New talismans</h3><OpportunityList rows={newAccessories} empty="No catalog-backed new talismans available." /></div>
    </div>
    {data.missingAccessories.length > 0 && <div className="mt-4 text-xs text-neutral-400">Missing accessories: {data.missingAccessories.map(name).join(', ')}</div>}
    {data.missingRarityUpgrades.length > 0 && <div className="mt-2 text-xs text-neutral-400">Available upgrades: {data.missingRarityUpgrades.map(name).join(', ')}</div>}
    {data.missingFamilies.length > 0 && <div className="mt-2 text-xs text-neutral-400">Missing families: {data.missingFamilies.map(name).join(', ')}</div>}
  </section>;
}
