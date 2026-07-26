import { ExtrasData } from '@/lib/parseProfile';

export default function ExtrasCard({ extras }: { extras: ExtrasData }) {
  const stats = [
    { label: 'Magical Power', value: extras.magicalPower.toLocaleString() },
    { label: 'Purse', value: extras.purse.toLocaleString() + ' coins' },
    { label: 'Fairy Souls Collected', value: extras.fairySoulsCollected },
    { label: 'Pets Owned', value: extras.petCount },
    { label: 'Unique Pet Types', value: extras.uniquePetTypes },
    { label: 'Highest Pet Score', value: extras.highestPetScore },
    { label: 'Total Bestiary Kills', value: extras.bestiaryKillsTotal.toLocaleString() },
  ];

  return (
    <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <h2 className="text-xl font-semibold mb-4">Extras</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-neutral-500 text-xs uppercase tracking-wide">{s.label}</div>
            <div className="font-medium mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}