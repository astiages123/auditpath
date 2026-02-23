// --- Daily Goal Progress Ring (SVG) ---
export interface GoalRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
}

export const GoalProgressRing = ({
  progress,
  size = 120,
  strokeWidth = 10,
}: GoalRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset =
    circumference - (Math.min(progress, 100) / 100) * circumference;

  // Softer color palette
  const getStrokeColor = () => {
    if (progress >= 100) return 'oklch(85.54% 0.1969 158.6115)'; // primary
    if (progress >= 50) return 'oklch(85.54% 0.1969 158.6115)'; // primary
    if (progress >= 25) return 'oklch(77.596% 0.14766 79.996)'; // accent
    return 'oklch(82.968% 0.0001 271.152)'; // muted-foreground
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Ring */}
        <circle
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress Ring */}
        <circle
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: 'drop-shadow(0 0 4px oklch(85.54% 0.1969 158.6115 / 0.3))',
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold font-heading text-white">
          %{Math.round(Math.min(progress, 100))}
        </span>
        <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
          Hedef
        </span>
      </div>
    </div>
  );
};
