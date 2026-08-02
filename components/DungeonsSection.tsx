import type { DungeonProgress } from '@/lib/parseDungeons';
import DungeonCard from './DungeonCard';

const duration = (ms: number | null) => ms === null ? 'Unavailable' : `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function DungeonsSection({ progress }: { progress: DungeonProgress }) {
  const floorSevenComplete = (progress.floors.find((floor) => floor.floor === 7)?.completions ?? 0) > 0;
  return <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
    <h2 className="mb-4 text-xl font-semibold">Dungeons</h2>
    <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3"><DungeonCard title="Catacombs" value={`Level ${progress.catacombs.level}`} detail={`${progress.catacombs.progressPercent}% to next level`} /><DungeonCard title="Secrets" value={progress.secrets?.toLocaleString() ?? 'Unavailable'} lockedReason={progress.secrets === null ? 'Enable Dungeon API access in Hypixel SkyBlock settings to show secrets.' : undefined} /><DungeonCard title="Classes" value={progress.classes.length} /></div>
    <h3 className="mb-2 font-semibold">Classes</h3><div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">{progress.classes.map((item) => <DungeonCard key={item.name} title={titleCase(item.name)} value={`Level ${item.level}`} detail={`${item.progressPercent}%`} />)}</div>
    <h3 className="mb-2 font-semibold">Floor completions</h3><div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{progress.floors.map((floor) => <DungeonCard key={floor.name} title={floor.name} value={floor.completions.toLocaleString()} detail={`Fastest S+: ${duration(floor.fastestSPlusTimeMs)}`} />)}</div>
    <h3 className="mb-2 font-semibold">Master Mode</h3><div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{progress.masterMode.map((floor) => <DungeonCard key={floor.name} title={floor.name} value={floor.completions.toLocaleString()} detail={`Fastest: ${duration(floor.fastestTimeMs)}`} lockedReason={!floorSevenComplete && floor.completions === 0 ? 'Complete Catacombs Floor VII to unlock Master Mode.' : undefined} />)}</div>
    <h3 className="mb-2 font-semibold">Boss collections</h3><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{progress.bossCollections.map((boss, index) => <DungeonCard key={boss.name} title={boss.name} value={`${boss.completions.toLocaleString()} runs`} lockedReason={boss.completions === 0 ? `Complete Floor ${index + 1} to begin this boss collection.` : undefined} />)}</div>
  </section>;
}
