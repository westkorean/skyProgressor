export type ProfileOverviewMember = {
  uuid: string;
  name: string;
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
          Profile Members
        </div>
        <div className="flex flex-wrap gap-2">
          {overview.members.map((member) => (
            <span
              key={member.uuid}
              className="rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-300"
            >
              {member.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
