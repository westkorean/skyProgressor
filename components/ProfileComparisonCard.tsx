'use client';
import { useMemo, useState } from 'react';
import { compareProfiles } from '@/lib/profileComparison';
import type { ComparisonCandidate } from '@/lib/profileComparisonData';

export type { ComparisonCandidate } from '@/lib/profileComparisonData';
const format = (value: number, unit: string) => `${value.toLocaleString()}${unit}`;

export default function ProfileComparisonCard({ candidates, onLookup }: { candidates: ComparisonCandidate[]; onLookup?: (ign: string) => Promise<ComparisonCandidate> }) {
  const [external, setExternal] = useState<ComparisonCandidate[]>([]);
  const all = useMemo(() => [...candidates, ...external.filter(item => !candidates.some(candidate => candidate.id === item.id))], [candidates, external]);
  const [left, setLeft] = useState(candidates[0]?.id ?? '');
  const [right, setRight] = useState(candidates[1]?.id ?? candidates[0]?.id ?? '');
  const [ign, setIgn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const comparison = useMemo(() => {
    const first = all.find(candidate => candidate.id === left) ?? all[0];
    const second = all.find(candidate => candidate.id === right) ?? all[1] ?? all[0];
    return first && second ? compareProfiles(first.label, first.data, second.label, second.data) : null;
  }, [all, left, right]);
  const search = async () => {
    if (!onLookup || !ign.trim()) return;
    setLoading(true); setError(null);
    try {
      const found = await onLookup(ign.trim());
      setExternal(current => [...current.filter(item => item.id !== found.id), found]);
      setRight(found.id); setIgn('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load comparison profile.'); }
    finally { setLoading(false); }
  };
  if (!comparison) return null;
  const groups = [...new Set(comparison.areas.map(area => area.group))];
  return <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Profile Comparison</h2>{onLookup && <div className="flex gap-2"><input aria-label="Comparison username" value={ign} onChange={event => setIgn(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void search(); }} placeholder="Compare an IGN" className="w-40 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" /><button type="button" disabled={loading || !ign.trim()} onClick={() => void search()} className="rounded border border-emerald-700 px-3 py-2 text-xs text-emerald-300 disabled:opacity-50">{loading ? 'Loading…' : 'Add player'}</button></div>}</div>
    {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
    <div className="mb-4 grid grid-cols-2 gap-3"><select aria-label="First profile" value={left} onChange={event => setLeft(event.target.value)} className="rounded border border-neutral-700 bg-neutral-950 p-2 text-sm">{all.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select><select aria-label="Second profile" value={right} onChange={event => setRight(event.target.value)} className="rounded border border-neutral-700 bg-neutral-950 p-2 text-sm">{all.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select></div>
    <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded border border-emerald-900 bg-neutral-950 p-2"><b className="block text-lg text-emerald-400">{comparison.summary.leftWins}</b>{comparison.leftLabel} leads</div><div className="rounded border border-neutral-800 bg-neutral-950 p-2"><b className="block text-lg">{comparison.summary.ties}</b>Ties</div><div className="rounded border border-cyan-900 bg-neutral-950 p-2"><b className="block text-lg text-cyan-400">{comparison.summary.rightWins}</b>{comparison.rightLabel} leads</div></div>
    <div className="space-y-4">{groups.map(group => <div key={group} className="overflow-x-auto rounded border border-neutral-800"><h3 className="bg-neutral-950 px-3 py-2 text-xs font-bold uppercase tracking-wide text-neutral-400">{group}</h3><table className="w-full text-sm"><thead className="text-left text-xs text-neutral-500"><tr><th className="p-2">Metric</th><th>{comparison.leftLabel}</th><th>{comparison.rightLabel}</th><th>Difference</th></tr></thead><tbody>{comparison.areas.filter(area => area.group === group).map(area => <tr key={`${area.group}:${area.name}`} className="border-t border-neutral-800"><td className="p-2">{area.name}</td><td className={area.stronger === 'left' ? 'font-bold text-emerald-400' : area.stronger === 'right' ? 'text-red-400' : ''}>{format(area.left, area.unit)}</td><td className={area.stronger === 'right' ? 'font-bold text-emerald-400' : area.stronger === 'left' ? 'text-red-400' : ''}>{format(area.right, area.unit)}</td><td className="text-neutral-500">{area.delta > 0 ? '+' : ''}{format(area.delta, area.unit)}</td></tr>)}</tbody></table></div>)}</div>
  </section>;
}
