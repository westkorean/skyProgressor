'use client';
/* eslint-disable react-hooks/set-state-in-effect -- feedback is hydrated from the browser's external localStorage store. */

import { useEffect, useMemo, useState } from 'react';
import type { DeterministicRecommendation } from '@/lib/recommendations';
import { LocalStorageEvaluationRepository, type EvaluationFeedback } from '@/lib/evaluation';

const CATEGORY_LABELS: Record<DeterministicRecommendation['category'], string> = {
  accessories: 'Accessories',
  collections: 'Collections',
  dungeons: 'Dungeons',
  skills: 'Skills',
  slayers: 'Slayers',
  pets: 'Pets',
  hotm: 'HOTM',
  hotf: 'HOTF',
  garden: 'Garden',
  fishing: 'Fishing',
  crimson: 'Crimson Isle',
  rift: 'Rift',
};

const FEEDBACK: Array<{ value: EvaluationFeedback; label: string }> = [
  { value: 'helpful', label: 'Helpful' },
  { value: 'incorrect', label: 'Incorrect' },
  { value: 'outdated', label: 'Outdated' },
  { value: 'too-generic', label: 'Too generic' },
];

function priorityColor(priority: number): string {
  if (priority >= 85) return 'border-red-500/50 bg-red-500/10 text-red-300';
  if (priority >= 70) return 'border-orange-500/50 bg-orange-500/10 text-orange-300';
  return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
}

export default function ProgressionRecommendationsSection({
  recommendations,
  profileHash,
}: {
  recommendations: readonly DeterministicRecommendation[];
  profileHash: string;
}) {
  const repository = useMemo(() => new LocalStorageEvaluationRepository(), []);
  const [feedback, setFeedback] = useState<Record<string, EvaluationFeedback>>({});

  useEffect(() => {
    setFeedback(Object.fromEntries(recommendations.flatMap((recommendation) => {
      const saved = repository.find(profileHash, recommendation.id);
      return saved ? [[recommendation.id, saved.userFeedback]] : [];
    })));
  }, [profileHash, recommendations, repository]);

  const markRecommendation = (recommendation: DeterministicRecommendation, userFeedback: EvaluationFeedback) => {
    const now = new Date().toISOString();
    const existing = repository.find(profileHash, recommendation.id);
    repository.save({
      id: existing?.id ?? `${profileHash}:${recommendation.id}`,
      schemaVersion: 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      question: `Why was ${recommendation.title} recommended?`,
      playerProfileHash: profileHash,
      retrievedKnowledgeIds: [...recommendation.knowledgeReferences],
      finalRecommendation: {
        id: recommendation.id, title: recommendation.title, category: recommendation.category,
        priority: recommendation.priority, explanation: recommendation.explanation,
        evidence: recommendation.evidence.map((entry) => ({ ...entry })),
        expectedBenefit: recommendation.expectedBenefit, estimatedEffort: recommendation.estimatedEffort,
        suggestedAction: recommendation.suggestedAction,
      },
      confidence: recommendation.confidence,
      userFeedback,
    });
    setFeedback((current) => ({ ...current, [recommendation.id]: userFeedback }));
  };
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
              <p className="mt-1 text-sm text-neutral-400">{recommendation.explanation}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {recommendation.evidence.map((entry) => (
                  <span key={entry.label} className="rounded-md bg-neutral-900 px-2 py-1 text-xs text-neutral-300">
                    <span className="text-neutral-500">{entry.label}:</span> {entry.value}
                  </span>
                ))}
              </div>

              <div className="mt-3 text-xs text-neutral-300">
                <span className="text-neutral-500">Expected benefit:</span> {recommendation.expectedBenefit}
              </div>
              <div className="mt-1 text-xs text-neutral-300"><span className="text-neutral-500">Estimated effort:</span> {recommendation.estimatedEffort}</div>
              <div className="mt-1 text-xs text-neutral-300"><span className="text-neutral-500">Confidence:</span> {recommendation.confidence}%</div>
              <div className="mt-1 text-xs text-neutral-300"><span className="text-neutral-500">Suggested action:</span> {recommendation.suggestedAction}</div>
              {recommendation.knowledgeReferences.length > 0 && (
                <div className="mt-2 text-xs text-neutral-500">
                  Knowledge sources used: {recommendation.knowledgeReferences.join(', ')}
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-neutral-800 pt-3">
                <span className="mr-1 text-[11px] text-neutral-500">Was this useful?</span>
                {FEEDBACK.map((option) => (
                  <button key={option.value} type="button" onClick={() => markRecommendation(recommendation, option.value)} aria-pressed={feedback[recommendation.id] === option.value} className={`rounded-md border px-2 py-1 text-[11px] transition ${feedback[recommendation.id] === option.value ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300' : 'border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300'}`}>
                    {option.label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
