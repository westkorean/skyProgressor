interface SkillBarProps {
  skill: string;
  level: number;
  currentXp: number;
  xpForNextLevel: number | null;
  progressPercent: number;
}

export default function SkillBar({
  skill,
  level,
  xpForNextLevel,
  progressPercent,
}: SkillBarProps) {
  const maxed = xpForNextLevel === null;
  return (
    <div className={`mb-4 rounded-lg p-2 transition-all duration-300 last:mb-0 ${maxed ? 'border border-amber-400/60 bg-amber-950/25 shadow-[0_0_18px_rgba(251,191,36,0.35)]' : ''}`}>
      <div className="flex justify-between mb-1">
        <span className={`capitalize font-medium ${maxed ? 'text-amber-200' : ''}`}>{skill}</span>
        <span className={maxed ? 'font-bold text-amber-300' : 'text-neutral-400'}>{maxed ? 'MAX' : `Level ${level}`}</span>
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
          : 'Max level reached'}
      </div>
    </div>
  );
}
