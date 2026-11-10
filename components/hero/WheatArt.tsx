/** Hand-drawn wheat for the opened hero: a single branch, and a tied stack of sheaves. */

const DEEP = "#B8893D";
const WHEAT = "#E3C07E";
const TINT = "#EFD9A8";

function n(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Stable pseudo-random value, so server and client draw the same stalks. */
function wobble(index: number): number {
  const value = Math.sin(index * 12.9898 + 4.1) * 43758.5453;
  return value - Math.floor(value);
}

/** An ear of grain standing on (0, 0), growing up. */
export function Ear({ rows = 6 }: { rows?: number }) {
  const grains = Array.from({ length: rows }, (_, row) => row);
  return (
    <g>
      {grains.map((row) => {
        const y = -row * 6.2;
        return (
          <g key={row}>
            <path d={`M-5 ${y - 3}L-11 ${y - 17}M5 ${y - 3}L11 ${y - 17}`} stroke={DEEP} strokeWidth="0.7" strokeLinecap="round" fill="none" />
            <ellipse cx="-3.6" cy={y} rx="3.5" ry="6" transform={`rotate(-20 -3.6 ${y})`} fill={WHEAT} stroke={DEEP} strokeWidth="0.7" />
            <ellipse cx="3.6" cy={y} rx="3.5" ry="6" transform={`rotate(20 3.6 ${y})`} fill={TINT} stroke={DEEP} strokeWidth="0.7" />
          </g>
        );
      })}
      <path d={`M0 ${-rows * 6.2 - 2}V${-rows * 6.2 - 22}`} stroke={DEEP} strokeWidth="0.7" strokeLinecap="round" />
      <ellipse cx="0" cy={-rows * 6.2} rx="3" ry="5.6" fill={WHEAT} stroke={DEEP} strokeWidth="0.7" />
    </g>
  );
}

type WheatBranchProps = {
  /** Mirrors the curve, so neighbouring branches don't look stamped. */
  flip?: boolean;
  /** Adds a side shoot with a second, smaller ear. */
  fork?: boolean;
  className?: string;
};

export function WheatBranch({ flip = false, fork = false, className }: WheatBranchProps) {
  return (
    <svg data-sway aria-hidden="true" viewBox="0 0 80 240" fill="none" className={className}>
      <g transform={flip ? "translate(80 0) scale(-1 1)" : undefined}>
        {/* Leaf blades. */}
        <path d="M37 196C20 176 12 158 8 132C24 150 36 168 41 188Z" fill={WHEAT} stroke={DEEP} strokeWidth="0.8" />
        <path d="M40 150C52 136 62 128 74 122C68 138 56 150 42 160Z" fill={TINT} stroke={DEEP} strokeWidth="0.8" />
        <path data-stem d="M38 240C40 190 36 130 46 76" stroke={DEEP} strokeWidth="2.2" strokeLinecap="round" />
        {fork && (
          <>
            <path d="M39 170C32 146 26 128 20 112" stroke={DEEP} strokeWidth="1.6" strokeLinecap="round" />
            <g transform="translate(20 112) rotate(-16) scale(0.72)">
              <Ear rows={5} />
            </g>
          </>
        )}
        <g transform="translate(46 78) rotate(9)">
          <Ear />
        </g>
      </g>
    </svg>
  );
}

const STALKS = Array.from({ length: 25 }, (_, index) => {
  const offset = index - 12;
  const spread = offset / 12;
  const tipX = 150 + spread * 84 + (wobble(index) - 0.5) * 10;
  const tipY = 70 + Math.abs(spread) ** 2 * 26 + wobble(index + 40) * 18;
  return {
    id: index,
    d: `M${n(150 + offset * 3.3)} 244Q${n(150 + offset * 1.2)} 172 ${n(tipX)} ${n(tipY)}`,
    tipX: n(tipX),
    tipY: n(tipY),
    angle: n(spread * 30 + (wobble(index + 80) - 0.5) * 8),
    tone: index % 3 === 0 ? DEEP : WHEAT,
  };
});

/** One tied sheaf, used three times to build the stack. */
function Sheaf() {
  return (
    <g>
      {STALKS.map((stalk) => (
        <path key={stalk.id} d={stalk.d} stroke={stalk.tone} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      ))}
      {STALKS.map((stalk) => (
        <g key={stalk.id} transform={`translate(${stalk.tipX} ${stalk.tipY}) rotate(${stalk.angle}) scale(0.92)`}>
          <Ear rows={5} />
        </g>
      ))}
      {/* Twine around the waist. */}
      <path d="M124 178Q150 192 176 178" stroke="#7A5A26" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M125 177Q150 190 175 177" stroke={DEEP} strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  );
}

export function WheatStack({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 520 262" fill="none" className={className}>
      <ellipse cx="260" cy="248" rx="226" ry="13" fill={TINT} />
      <g transform="translate(58 42) rotate(-14 150 244) scale(0.84)">
        <Sheaf />
      </g>
      <g transform="translate(210 42) rotate(14 150 244) scale(0.84)">
        <Sheaf />
      </g>
      <g transform="translate(110 4)">
        <Sheaf />
      </g>
    </svg>
  );
}
