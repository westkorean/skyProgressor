'use client';

import { useMemo, useState } from 'react';
import { simulateProfileChange, type SimulationChange, type SimulationProfile, type SimulationResult } from '@/lib/simulation';

type Scenario = 'magical-power' | 'skill' | 'elephant';
const title = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function RecommendationSimulator({ profile }: { profile: SimulationProfile }) {
  const skills = useMemo(() => Object.keys(profile.skills).sort((a, b) => title(a).localeCompare(title(b))), [profile.skills]);
  const [scenario, setScenario] = useState<Scenario>('magical-power');
  const [skill, setSkill] = useState(() => skills.includes('foraging') ? 'foraging' : skills[0] ?? 'foraging');
  const [target, setTarget] = useState(() => Math.max(700, Math.ceil(profile.magicalPower / 50) * 50 + 50));
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  const caps = profile.skillCaps?.[skill];
  const current = scenario === 'magical-power' ? profile.magicalPower : scenario === 'skill' ? profile.skills[skill] ?? 0 : profile.pets.filter((pet) => pet.type.toUpperCase() === 'ELEPHANT').reduce((best, pet) => Math.max(best, pet.level), 0);
  const maximum = scenario === 'skill' ? caps?.absolute ?? 50 : scenario === 'elephant' ? 100 : undefined;

  const suggestedTarget = (nextScenario: Scenario, nextSkill = skill) => {
    if (nextScenario === 'magical-power') return Math.max(Math.floor(profile.magicalPower) + 50, Math.ceil(profile.magicalPower / 50) * 50);
    if (nextScenario === 'elephant') return 100;
    const level = profile.skills[nextSkill] ?? 0;
    const skillCaps = profile.skillCaps?.[nextSkill];
    return Math.min(skillCaps?.absolute ?? 50, Math.max(level + 1, Math.ceil((level + 1) / 5) * 5));
  };

  const run = () => {
    setAlert(null);
    setResult(null);
    if (!Number.isFinite(target) || !Number.isInteger(target)) {
      setAlert('Enter a whole-number goal.');
      return;
    }
    if (target <= current) {
      setAlert(`Choose a goal above the profile's current ${scenario === 'skill' ? `${title(skill)} level` : scenario === 'elephant' ? 'Elephant level' : 'Magical Power'} of ${Math.floor(current)}.`);
      return;
    }
    if (maximum != null && target > maximum) {
      const goalName = scenario === 'skill' ? title(skill) : 'Elephant pet level';
      setAlert(`${goalName} ${target} is not possible. The current maximum is ${maximum}.`);
      return;
    }
    const change: SimulationChange = scenario === 'magical-power'
      ? { type: 'set-magical-power', target }
      : scenario === 'skill'
        ? { type: 'set-skill-level', skill, target }
        : { type: 'acquire-pet', petType: 'ELEPHANT', tier: 'LEGENDARY', level: target };
    setResult(simulateProfileChange(profile, change));
  };

  return (
    <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div><h2 className="text-xl font-semibold">Recommendation Simulator</h2><p className="mt-1 text-sm text-neutral-500">Test a goal against this profile&apos;s current levels, caps, accessories, and pets.</p></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <select value={scenario} onChange={(event) => { const value = event.target.value as Scenario; setScenario(value); setTarget(suggestedTarget(value)); setResult(null); setAlert(null); }} className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200">
          <option value="magical-power">Increase Magical Power</option><option value="skill">Set a Skill Goal</option><option value="elephant">Buy Legendary Elephant</option>
        </select>
        {scenario === 'skill' && <select aria-label="Skill" value={skill} onChange={(event) => { const value = event.target.value; setSkill(value); setTarget(suggestedTarget('skill', value)); setResult(null); setAlert(null); }} className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200">{skills.map((entry) => <option key={entry} value={entry}>{title(entry)} · current {profile.skills[entry] ?? 0} / max {profile.skillCaps?.[entry]?.absolute ?? 50}</option>)}</select>}
        <label className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-xs text-neutral-500">{scenario === 'elephant' ? 'Pet level' : 'Goal'}<input aria-label="Goal" type="number" min={scenario === 'elephant' ? 1 : 0} value={target} onChange={(event) => { setTarget(Number(event.target.value)); setAlert(null); }} className="w-20 bg-transparent py-2 text-right text-sm text-white outline-none" /></label>
        <button type="button" onClick={run} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Check goal</button>
      </div>
      {scenario === 'skill' && caps && <p className="mt-2 text-xs text-neutral-500">Profile cap: {caps.current} · game maximum: {caps.absolute}{caps.current < caps.absolute ? ' · further cap upgrades are available' : ''}</p>}
      {alert && <div role="alert" aria-live="assertive" className="mt-4 rounded-lg border border-red-500/50 bg-red-950/35 px-4 py-3 text-sm text-red-200">{alert}</div>}
      {result && <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-neutral-100">{result.title}</h3><span className={`rounded-full px-2 py-0.5 text-xs ${result.applied ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{result.applied ? 'Possible goal' : 'No improvement'}</span></div><p className="mt-1 text-sm text-neutral-400">{result.summary}</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{result.impacts.map((item) => <div key={item.id} className="rounded-lg bg-neutral-900 p-3 text-xs"><div className="text-neutral-500">{item.label} · {item.certainty}</div><div className="mt-1 text-neutral-200">{Number(item.before.toFixed(2)).toLocaleString()} → {Number(item.after.toFixed(2)).toLocaleString()} {item.unit}</div><div className="text-emerald-400">+{Number(item.delta.toFixed(2)).toLocaleString()}</div></div>)}</div>{result.unlocks.length > 0 && <div className="mt-3"><div className="text-xs text-neutral-500">Unlock status</div><div className="mt-1 flex flex-wrap gap-1.5">{result.unlocks.map((item) => <span key={item.id} className={`rounded-md px-2 py-1 text-xs ${item.newlyUnlocked ? 'bg-emerald-500/15 text-emerald-300' : 'bg-neutral-900 text-neutral-500'}`}>{item.title} · {item.newlyUnlocked ? 'new' : 'already available'}</span>)}</div></div>}{result.warnings.map((warning) => <div key={warning} className="mt-2 text-[11px] text-neutral-500">{warning}</div>)}</div>}
    </section>
  );
}
