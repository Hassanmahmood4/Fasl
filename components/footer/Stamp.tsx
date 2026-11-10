const WIDTH = 150;
const HEIGHT = 178;
const TOOTH = 12;

/** A rectangle with postage-stamp perforations cut along every edge. */
function perforatedEdge(): string {
  const r = TOOTH * 0.36;
  const across = Math.round(WIDTH / TOOTH);
  const down = Math.round(HEIGHT / TOOTH);
  const stepX = WIDTH / across;
  const stepY = HEIGHT / down;
  let d = "M0 0";
  for (let i = 0; i < across; i++) {
    d += `H${i * stepX + stepX / 2 - r}A${r} ${r} 0 0 0 ${i * stepX + stepX / 2 + r} 0`;
  }
  d += `H${WIDTH}`;
  for (let i = 0; i < down; i++) {
    d += `V${i * stepY + stepY / 2 - r}A${r} ${r} 0 0 0 ${WIDTH} ${i * stepY + stepY / 2 + r}`;
  }
  d += `V${HEIGHT}`;
  for (let i = across - 1; i >= 0; i--) {
    d += `H${i * stepX + stepX / 2 + r}A${r} ${r} 0 0 0 ${i * stepX + stepX / 2 - r} ${HEIGHT}`;
  }
  d += "H0";
  for (let i = down - 1; i >= 0; i--) {
    d += `V${i * stepY + stepY / 2 + r}A${r} ${r} 0 0 0 0 ${i * stepY + stepY / 2 - r}`;
  }
  return `${d}Z`;
}

/** Decorative stamp and postmark. The same words appear as real text in the panel. */
export function Stamp() {
  return (
    <div aria-hidden="true" className="relative h-[136px] w-[208px]">
      <svg
        viewBox={`-6 -6 ${WIDTH + 12} ${HEIGHT + 12}`}
        className="absolute top-0 left-0 h-[136px] w-auto -rotate-3 drop-shadow-[0_3px_6px_rgba(90,64,20,0.22)]"
      >
        <path d={perforatedEdge()} fill="#FFFFFF" />
        <clipPath id="stamp-window">
          <rect x="12" y="12" width={WIDTH - 24} height={HEIGHT - 24} rx="2" />
        </clipPath>
        <image
          href="/samples/wheat-ripe.jpg"
          x="12"
          y="12"
          width={WIDTH - 24}
          height={HEIGHT - 24}
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#stamp-window)"
        />
      </svg>
      <svg
        viewBox="0 0 112 62"
        className="absolute top-[62px] left-[96px] w-[112px] rotate-[9deg] text-charcoal opacity-80"
        fill="none"
        stroke="currentColor"
      >
        <rect x="1.5" y="1.5" width="109" height="59" rx="3" strokeWidth="1.5" />
        <path d="M1.5 20.5H110.5M1.5 41.5H110.5" strokeWidth="1" />
        <g fill="currentColor" stroke="none" textAnchor="middle" fontFamily="var(--font-figtree)">
          <text x="56" y="15" fontSize="9" fontWeight="600" letterSpacing="1.6">MADE IN</text>
          <text x="56" y="35" fontSize="12" fontWeight="700" letterSpacing="1">PAKISTAN</text>
          <text x="38" y="54" fontSize="9" fontFamily="var(--font-nastaliq)" lang="ur" direction="rtl">فصل</text>
          <text x="72" y="55" fontSize="9" fontWeight="600" letterSpacing="1.6">2026</text>
        </g>
      </svg>
    </div>
  );
}
