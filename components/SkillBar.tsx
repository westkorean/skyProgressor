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
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{skill}</span>
        <span>Level {level}</span>
      </div>
      <div style={{ background: '#333', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${progressPercent}%`,
            background: '#4ade80',
            height: '100%',
          }}
        />
      </div>
      <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>
        {xpForNextLevel !== null
          ? `${progressPercent}% to Level ${level + 1}`
          : 'Max level reached'}
      </div>
    </div>
  );
}