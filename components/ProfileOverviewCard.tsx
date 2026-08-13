export type ProfileOverviewMember = {
  uuid: string;
  name: string;
  status: 'active' | 'former';
  departedAt: number | null;
};

export type ProfileOverviewPet = {
  name: string;
  rarity: string;
};

export type ProfileOverviewData = {
  ign: string;
  profileName: string;
  gameMode: string | null;
  skyblockLevel: number;
  purse: number | null;
  bank: number | null;
  networth: {
    source: 'skyhelper' | 'local-fallback';
    skyhelperTopPercent: number | null;
    total: number;
    liquid: number;
    inventory: number;
    pets: number;
    soulboundItems: number;
    pricedInventorySlots: number;
    unpricedInventorySlots: number;
    pricedPets: number;
    unpricedPets: number;
    pricedSoulboundSlots: number;
  };
  networthTopPercent?: number | null;
  networthRankSource?: 'skyhelper' | 'local-saved' | null;
  magicalPower: number;
  skillAverage: number;
  catacombsLevel: number;
  activePet: ProfileOverviewPet | null;
  fairySouls: { collected: number; total: number };
  members: ProfileOverviewMember[];
};

function compactNumber(value: number | null): string {
  if (value === null) return 'Unavailable';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

function coins(value: number | null): string {
  return value === null ? 'Unavailable' : `${compactNumber(value)} coins`;
}

function displayMode(mode: string | null): string {
  if (!mode) return 'Normal';
  return mode.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ProfileOverviewCard({
  overview,
}: {
  overview: ProfileOverviewData;
}) {
  const stats = [
    ['SkyBlock Level', overview.skyblockLevel.toLocaleString()],
    ['Purse', coins(overview.purse)],
    ['Bank', coins(overview.bank)],
    ['Magical Power', overview.magicalPower.toLocaleString()],
    ['Skill Average', overview.skillAverage.toFixed(2)],
    ['Catacombs Level', overview.catacombsLevel.toLocaleString()],
    [
      'Active Pet',
      overview.activePet
        ? `${overview.activePet.name} · ${overview.activePet.rarity}`
        : 'None',
    ],
    [
      'Fairy Souls',
      `${overview.fairySouls.collected} / ${overview.fairySouls.total}`,
    ],
  ] as const;

  return (
    <section className="mb-8 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      <div className="border-b border-neutral-800 bg-neutral-900/80 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-emerald-400">
              Profile Overview
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-white">{overview.ign}</h2>
          </div>
          <div className="text-right text-sm">
            <div className="font-medium text-neutral-200">{overview.profileName}</div>
            <div className="text-neutral-500">{displayMode(overview.gameMode)}</div>
          </div>
        </div>
      </div>

      <div className="border-b border-neutral-800 bg-neutral-950/40 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-amber-400">
              Estimated Net Worth
            </div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {coins(overview.networth.total)}
            </div>
            <div className="mt-1 text-xs text-amber-200">
              {overview.networthTopPercent == null
                ? 'Top rank learns from saved local snapshots'
                : overview.networthRankSource === 'skyhelper'
                  ? `Top ${overview.networthTopPercent}% of all SkyHelper net worth records`
                  : `Top ${overview.networthTopPercent}% of saved net worth snapshots`}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-x-5 gap-y-1 text-right text-xs">
            <span className="text-neutral-500">Liquid</span>
            <span className="text-neutral-500">Items</span>
            <span className="text-neutral-500">Soulbound</span>
            <span className="text-neutral-500">Pets</span>
            <span className="text-neutral-200">{compactNumber(overview.networth.liquid)}</span>
            <span className="text-neutral-200">{compactNumber(overview.networth.inventory)}</span>
            <span className="text-neutral-200">{compactNumber(overview.networth.soulboundItems)}</span>
            <span className="text-neutral-200">{compactNumber(overview.networth.pets)}</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-neutral-500">
          {overview.networth.source === 'skyhelper'
            ? 'Full SkyCrypt-compatible valuation includes storage, bags, sacks, essence, museum contents, item upgrades, and soulbound value.'
            : <>Valued {overview.networth.pricedInventorySlots.toLocaleString()} item slots and {overview.networth.pricedPets.toLocaleString()} pets. Soulbound value is included in Items and the total.</>}
          {overview.networth.source === 'local-fallback' && (overview.networth.unpricedInventorySlots > 0 || overview.networth.unpricedPets > 0) && (
            <span className="text-amber-300">
              {' '}Missing prices for {overview.networth.unpricedInventorySlots.toLocaleString()} item slots and{' '}
              {overview.networth.unpricedPets.toLocaleString()} pets; the estimate may be low.
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-neutral-800 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-neutral-900 p-4">
            <div className="text-[11px] uppercase tracking-wide text-neutral-500">
              {label}
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-neutral-100" title={value}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-800 p-4">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-neutral-500">
          Active Co-op Members
        </div>
        <div className="flex flex-wrap gap-2">
          {overview.members.filter(member => member.status === 'active' && member.name !== overview.ign).map((member) => (
            <span
              key={member.uuid}
              className="rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-300"
            >
              {member.name}
            </span>
          ))}
          {!overview.members.some(member => member.status === 'active' && member.name !== overview.ign) && <span className="text-xs text-neutral-600">No other active co-op members.</span>}
        </div>
        {overview.members.some(member => member.status === 'former') && <><div className="mb-2 mt-4 text-[11px] uppercase tracking-wide text-neutral-600">Former Co-op Members</div><div className="flex flex-wrap gap-2">{overview.members.filter(member => member.status === 'former').map(member => <span key={member.uuid} className="rounded-md border border-red-900/60 bg-red-950/20 px-2.5 py-1 text-xs text-red-300">{member.name}{member.departedAt ? ` · left ${new Date(member.departedAt).toLocaleDateString()}` : ''}</span>)}</div></>}
      </div>
    </section>
  );
}
