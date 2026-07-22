interface SkillBarProps {
  skill: string;
  level: number;
  currentXp: number;
  xpForNextLevel: number | null;
  progressPercent: number;
}

export default function SkillBar({ skill, level, xpForNextLevel, progressPercent }: SkillBarProps) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between mb-1">
        <span className="capitalize font-medium">{skill}</span>
        <span className="text-neutral-400">Level {level}</span>
      </div>
      <div className="bg-neutral-800 rounded-full h-3 overflow-hidden">
        <div
          className="bg-emerald-500 h-full transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="text-xs text-neutral-500 mt-1">
        {xpForNextLevel !== null ? `${progressPercent}% to Level ${level + 1}` : 'Max level reached'}
      </div>
    </div>
  );
}