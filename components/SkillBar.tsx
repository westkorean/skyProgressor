interface SkillBarProps {
  skill: string;
  level: number;
  currentXp: number;
  xpForNextLevel: number | null;
  progressPercent: number;
  maxLevel?: number;
  absoluteMaxLevel?: number;
  overflowXp?: number;
  overflowLevel?: number;
}

export default function SkillBar({
  skill,
  level,
  xpForNextLevel,
  progressPercent,
  maxLevel,
  absoluteMaxLevel,
  overflowXp = 0,
  overflowLevel,
}: SkillBarProps) {
  const maxed = xpForNextLevel === null;
  const upgradeableCap = maxLevel != null && absoluteMaxLevel != null && maxLevel < absoluteMaxLevel;
  const hasOverflow = upgradeableCap && overflowXp > 0;
  const glow = !maxed ? '' : hasOverflow
    ? 'skill-overflow-glow border border-cyan-400/70 bg-cyan-950/20'
    : upgradeableCap
      ? 'border border-amber-400/60 bg-amber-950/25 shadow-[0_0_18px_rgba(251,191,36,0.35)]'
      : 'skill-true-max-glow border border-amber-300/80 bg-amber-950/25';
  return (
    <div className={`mb-4 rounded-lg p-2 transition-all duration-300 last:mb-0 ${glow}`}>
      <div className="flex justify-between mb-1">
        <span className={`capitalize font-medium ${maxed ? 'text-amber-200' : ''}`}>{skill}</span>
        <span className={maxed ? 'font-bold text-amber-300' : 'text-neutral-400'}>{maxed ? (upgradeableCap ? `Level ${level} · CAP ${maxLevel}` : 'MAX') : `Level ${level}`}</span>
      </div>
      <div className="bg-neutral-800 rounded-full h-3 overflow-hidden">
        <div
          className={`${maxed ? 'bg-gradient-to-r from-amber-500 via-yellow-200 to-amber-400 shadow-[0_0_12px_#fbbf24]' : 'bg-emerald-500'} h-full transition-all duration-500`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="text-xs text-neutral-500 mt-1">
        {xpForNextLevel != null
          ? `${progressPercent}% to Level ${level + 1}`
          : upgradeableCap
            ? hasOverflow
              ? overflowLevel != null && overflowLevel > level
                ? `${overflowXp.toLocaleString()} overflow XP banked · enough for Level ${overflowLevel} after cap upgrades (max ${absoluteMaxLevel})`
                : `${overflowXp.toLocaleString()} overflow XP banked toward Level ${level + 1} · unlock cap upgrades to apply it (max ${absoluteMaxLevel})`
              : `Current cap reached · upgradeable to Level ${absoluteMaxLevel}`
            : 'Max level reached'}
      </div>
    </div>
  );
}
