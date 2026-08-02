import type { ProgressionRecommendation } from '@/lib/recommendationEngine';

const CATEGORY_LABELS: Record<ProgressionRecommendation['category'], string> = {
  accessories: 'Accessories',
  collections: 'Collections',
  dungeons: 'Dungeons',
  'fairy-souls': 'Fairy Souls',
  skills: 'Skills',
  slayers: 'Slayers',
  minions: 'Minions',
  bestiary: 'Bestiary',
  museum: 'Museum',
  pets: 'Pets',
};

function priorityColor(priority: number): string {
  if (priority >= 85) return 'border-red-500/50 bg-red-500/10 text-red-300';
  if (priority >= 70) return 'border-orange-500/50 bg-orange-500/10 text-orange-300';
  return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
}

export default function ProgressionRecommendationsSection({
  recommendations,
}: {
  recommendations: readonly ProgressionRecommendation[];
}) {
  return (
    <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Progression Recommendations</h2>
          <p className="mt-1 text-sm text-neutral-500">Ranked deterministically from the selected profile</p>
        </div>
        <span className="rounded-full border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-400">
          {recommendations.length} issues
        </span>
      </div>

      {recommendations.length === 0 ? (
        <p className="text-sm text-neutral-500">No recommendation rule currently applies to this profile.</p>
      ) : (
        <div className="space-y-3">
          {recommendations.map((recommendation) => (
            <article key={recommendation.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${priorityColor(recommendation.priority)}`}>
                  Priority {recommendation.priority}
                </span>
                <span className="text-xs text-neutral-500">{CATEGORY_LABELS[recommendation.category]}</span>
              </div>
              <h3 className="mt-2 font-semibold text-neutral-100">{recommendation.title}</h3>
              <p className="mt-1 text-sm text-neutral-400">{recommendation.reason}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {recommendation.evidence.map((entry) => (
                  <span key={entry.label} className="rounded-md bg-neutral-900 px-2 py-1 text-xs text-neutral-300">
                    <span className="text-neutral-500">{entry.label}:</span> {entry.value}
                  </span>
                ))}
              </div>

              <div className="mt-3 text-xs text-neutral-300">
                <span className="text-neutral-500">Estimated benefit:</span> {recommendation.estimatedBenefit}
              </div>
              {recommendation.factors && (
                <details className="mt-2 text-xs text-neutral-500">
                  <summary className="cursor-pointer hover:text-neutral-300">Priority factors</summary>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(recommendation.factors).map(([factor, value]) => <span key={factor} className="rounded bg-neutral-900 px-2 py-1">{factor.replace(/([A-Z])/g, ' $1')}: {value}</span>)}
                  </div>
                </details>
              )}
              {recommendation.knowledgeReferences.length > 0 && (
                <div className="mt-2 text-xs text-neutral-500">
                  Knowledge: {recommendation.knowledgeReferences.join(', ')}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
