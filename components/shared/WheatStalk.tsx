const GRAINS = [0, 1, 2, 3, 4];

type WheatStalkProps = {
  /** Draws only the ear and a short stem, for icons and stretchable stalks. */
  compact?: boolean;
  className?: string;
};

/** Decorative stalk drawn in currentColor. Scales from a small icon to a tall stem. */
export function WheatStalk({ compact = false, className }: WheatStalkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox={compact ? "0 0 24 60" : "0 0 24 120"}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      className={className}
    >
      <path d={`M12 ${compact ? 60 : 120}V42`} strokeWidth="1.6" />
      {GRAINS.map((row) => {
        const y = 44 - row * 7;
        return (
          <g key={row}>
            <ellipse cx="8.4" cy={y} rx="3" ry="5" transform={`rotate(-18 8.4 ${y})`} fill="currentColor" stroke="none" />
            <ellipse cx="15.6" cy={y} rx="3" ry="5" transform={`rotate(18 15.6 ${y})`} fill="currentColor" stroke="none" />
            <path d={`M7 ${y - 4}L4 ${y - 16}M17 ${y - 4}L20 ${y - 16}`} strokeWidth="0.7" />
          </g>
        );
      })}
    </svg>
  );
}
