'use client';

import { useMemo, useState } from 'react';
import {
  COLLECTION_CATEGORY_ORDER,
  type CollectionEntry,
  type CollectionCategory,
} from '@/lib/parseCollections';
import CollectionItemImage from '@/components/CollectionItemImage';

type SortMode = 'name' | 'amount' | 'tier' | 'closest';

function sortCollections(items: CollectionEntry[], mode: SortMode) {
  return [...items].sort((a, b) => {
    if (mode === 'amount') return b.amount - a.amount || a.name.localeCompare(b.name);
    if (mode === 'tier') return (b.tier ?? -1) - (a.tier ?? -1) || a.name.localeCompare(b.name);
    if (mode === 'closest') {
      const aComplete = a.remaining === null;
      const bComplete = b.remaining === null;
      if (aComplete !== bComplete) return aComplete ? 1 : -1;
      return b.progressPercent - a.progressPercent || (a.remaining ?? Infinity) - (b.remaining ?? Infinity);
    }
    return a.name.localeCompare(b.name);
  });
}

export default function CollectionsSection({ collections }: { collections: CollectionEntry[] }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('name');
  const [collapsed, setCollapsed] = useState<Set<CollectionCategory>>(new Set());
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = useMemo(
    () => collections.filter((entry) =>
      !normalizedSearch || entry.name.toLowerCase().includes(normalizedSearch) || entry.rawKey.toLowerCase().includes(normalizedSearch)
    ),
    [collections, normalizedSearch]
  );

  const toggle = (category: CollectionCategory) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Collections</h2>
          <p className="text-xs text-neutral-500">{filtered.length} of {collections.length} collections</p>
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search collections"
            className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            aria-label="Sort collections"
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="name">Name</option>
            <option value="amount">Amount</option>
            <option value="tier">Tier</option>
            <option value="closest">Closest completion</option>
          </select>
        </div>
      </div>

      {COLLECTION_CATEGORY_ORDER.map((category) => {
        const items = sortCollections(filtered.filter((entry) => entry.category === category), sort);
        if (!items.length) return null;
        const isCollapsed = collapsed.has(category);
        return (
          <div key={category} className="mb-4 overflow-hidden rounded-lg border border-neutral-800 last:mb-0">
            <button
              type="button"
              onClick={() => toggle(category)}
              className="flex w-full items-center justify-between bg-neutral-950/70 px-4 py-3 text-left hover:bg-neutral-800"
              aria-expanded={!isCollapsed}
            >
              <span className="text-sm font-semibold uppercase tracking-wide text-neutral-300">{category}</span>
              <span className="text-xs text-neutral-500">{items.length} {isCollapsed ? '▸' : '▾'}</span>
            </button>
            {!isCollapsed && (
              <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((entry) => (
                  <article data-item-slot key={entry.rawKey} className="rounded-lg border border-neutral-700 bg-neutral-800/70 p-3">
                    <div className="flex items-start gap-3">
                      <CollectionItemImage collectionId={entry.rawKey} name={entry.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-sm text-neutral-100">{entry.name}</div>
                          <div className="whitespace-nowrap text-[11px] text-neutral-400">
                            {entry.tier && entry.maxTier
                              ? `Tier ${entry.tier} / ${entry.maxTier}`
                              : 'Unknown Tier Data'}
                          </div>
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-neutral-500">{entry.rawKey.replace(/_/g, ' ')}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-neutral-400">
                      <span>{entry.amount.toLocaleString()} collected</span>
                      <span>{entry.progressPercent}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-950">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${entry.progressPercent}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-neutral-500">
                      {entry.remaining === null
                        ? entry.maxTier ? 'Maximum tier reached' : 'Remaining unavailable'
                        : `${entry.remaining.toLocaleString()} remaining to next tier`}
                    </div>
                    {entry.nextReward && (
                      <div className="mt-2 border-t border-neutral-700 pt-2 text-xs text-neutral-400">
                        <span className="text-neutral-500">Next reward: </span>{entry.nextReward}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && <p className="py-8 text-center text-sm text-neutral-500">No collections match your search.</p>}
    </section>
  );
}
