import { LevelRecommendation } from '@/lib/getSkyblockLevelRecommendations';

export default function SkyblockLevelCard({
  level,
  progressPercent,
  recommendations,
}: {
  level: number;
  progressPercent: number;
  recommendations: LevelRecommendation[];
}) {
  return (
    <section className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <div className="flex justify-between items-baseline mb-1">
        <h2 className="text-xl font-semibold">SkyBlock Level</h2>
        <span className="text-neutral-400">Level {level}</span>
      </div>
      <div className="bg-neutral-800 rounded-full h-3 overflow-hidden mb-4">
        <div
          className="bg-sky-500 h-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <h3 className="text-sm font-semibold text-neutral-400 mb-2 uppercase tracking-wide">
        Recommended Next Steps
      </h3>
      {recommendations.map((r, i) => (
        <div key={i} className="mb-2 last:mb-0">
          <div className="font-medium">{r.title}</div>
          <div className="text-xs text-neutral-500">{r.detail}</div>
        </div>
      ))}
    </section>
  );
}