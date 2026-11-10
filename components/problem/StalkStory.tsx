"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { Ear } from "@/components/hero/WheatArt";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const DEEP = "#B8893D";
const WHEAT = "#E3C07E";
const TINT = "#EFD9A8";

const SETTLE = { stiffness: 120, damping: 28, restDelta: 0.001 };
/** How much of the stalk's growth each problem takes to unfold once it's reached. */
const UNFOLD = 0.13;

const NARROW_ART_WIDTH = 42;
/** Space kept between the art and the text. */
const ART_GAP = 22;
const ART_RATIO = 120 / 170;
const NARROW_INDENT = 16;

function RustLeaf() {
  return (
    <>
      <path d="M0 60C40 16 112 8 166 30C124 64 60 84 0 60Z" fill={WHEAT} stroke={DEEP} strokeWidth="1.5" />
      <path d="M0 60C50 48 104 38 166 30" stroke={DEEP} strokeWidth="1.2" />
      {[[42, 43, 4], [62, 56, 5], [80, 32, 3.5], [92, 54, 5.5], [112, 36, 4], [122, 49, 3.5], [58, 34, 3], [138, 36, 3]].map(([x, y, r]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={r} ry={r * 0.72} fill="#9C5F24" />
      ))}
    </>
  );
}

function DroopingLeaf() {
  return (
    <>
      <path d="M0 60C50 26 116 42 162 112C104 104 44 92 0 60Z" fill={TINT} stroke={DEEP} strokeWidth="1.5" />
      <path d="M0 60C56 52 116 70 162 112" stroke={DEEP} strokeWidth="1.2" />
    </>
  );
}

function SheddingEar() {
  return (
    <>
      <path d="M0 60C40 58 72 48 102 32" stroke={DEEP} strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(100 32) rotate(62) scale(1.2)">
        <Ear />
      </g>
      {[[122, 72, 20], [98, 90, -24], [140, 96, 40], [116, 112, 10]].map(([x, y, angle]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="3.5" ry="6" transform={`rotate(${angle} ${x} ${y})`} fill={WHEAT} stroke={DEEP} strokeWidth="0.8" />
      ))}
    </>
  );
}

function FullEar() {
  return (
    <>
      <path d="M0 60C36 70 66 66 92 50" stroke={DEEP} strokeWidth="3" strokeLinecap="round" />
      <path d="M26 66C44 86 72 96 104 100C78 112 42 104 24 72Z" fill={WHEAT} stroke={DEEP} strokeWidth="1.2" />
      <g transform="translate(90 52) rotate(60) scale(1.28)">
        <Ear />
      </g>
    </>
  );
}

type ProblemItem = { title: string; body: string; art: ReactNode };

/** In the order a season goes wrong, from the growing crop to the sale. */
const PROBLEMS: ProblemItem[] = [
  {
    title: "Disease spotted too late",
    body: "Diseases like wheat rust spread fast across a field. By the time the damage is obvious to the eye, much of the yield is already lost.",
    art: <RustLeaf />,
  },
  {
    title: "No expert nearby",
    body: "Departments have too few agriculture officers and extension workers to cover every field. Advice that’s needed today often takes days to reach the field.",
    art: <DroopingLeaf />,
  },
  {
    title: "Harvesting at the wrong time",
    body: "Cut too early and the grain is shrivelled and light. Cut too late and grain falls from the ear, plants lodge, or a rain spell ruins the standing crop.",
    art: <SheddingEar />,
  },
  {
    title: "Unsure crop quality at the mandi",
    body: "Without a clear picture of crop condition across fields, departments can’t forecast yield, plan harvest support, or advise on quality before produce reaches the mandi.",
    art: <FullEar />,
  },
];

type Layout = {
  width: number;
  height: number;
  wide: boolean;
  /** Where each problem joins the stalk, in pixels down the list. */
  joints: number[];
  /** The top of each row, in pixels down the list. */
  tops: number[];
  /** Art fills the gap between the stalk and the text, whatever the screen size. */
  artWidth: number;
  /** Laptops and up have room for the larger ear. */
  large: boolean;
};

/** Matches the centre column in the row grid below. */
function centreColumn(viewport: number): number {
  return Math.min(320, Math.max(176, viewport * 0.22));
}

function stemX(y: number, layout: Layout): number {
  const centre = layout.wide ? layout.width / 2 : NARROW_INDENT;
  return centre + Math.sin(y * 0.006) * (layout.wide ? 12 : 3);
}

function stemPath(layout: Layout): string {
  let d = `M${stemX(0, layout).toFixed(1)} 0`;
  for (let y = 24; y < layout.height; y += 24) {
    d += `L${stemX(y, layout).toFixed(1)} ${y}`;
  }
  return `${d}L${stemX(layout.height, layout).toFixed(1)} ${layout.height}`;
}

type StoryRowProps = {
  item: ProblemItem;
  index: number;
  growth: MotionValue<number>;
  layout: Layout | null;
  rowRef: (element: HTMLLIElement | null) => void;
};

function StoryRow({ item, index, growth, layout, rowRef }: StoryRowProps) {
  const reducedMotion = usePrefersReducedMotion();
  const onRight = index % 2 === 1;

  const joint = layout ? layout.joints[index] : 0;
  const start = layout
    ? Math.min(1 - UNFOLD, joint / layout.height)
    : (index + 0.5) / PROBLEMS.length;
  const end = start + UNFOLD;

  const unfold = useTransform(growth, [start, end], [0, 1]);
  const opacity = useTransform(growth, [start + UNFOLD * 0.25, end], [0, 1]);
  const textY = useTransform(growth, [start, end], [36, 0]);

  const artWidth = layout?.artWidth ?? NARROW_ART_WIDTH;
  const artHeight = artWidth * ART_RATIO;
  const artFlipped = Boolean(layout?.wide && !onRight);

  return (
    <li
      ref={rowRef}
      className="relative py-8 pl-16 md:grid md:grid-cols-[1fr_clamp(11rem,22vw,20rem)_1fr] md:py-7 md:pl-0"
    >
      <motion.div
        data-scroll-motion
        style={reducedMotion ? { opacity: 1, y: 0 } : { opacity, y: textY }}
        className={onRight ? "md:col-start-3" : "md:col-start-1 md:justify-self-end"}
      >
        <h3 className="max-w-[16ch] font-display text-heading font-black">{item.title}</h3>
        <p className="mt-4 max-w-[42ch] text-lead text-charcoal">{item.body}</p>
      </motion.div>

      {layout && (
        <motion.div
          aria-hidden="true"
          data-stalk-art
          className="pointer-events-none absolute"
          style={{
            left: stemX(joint, layout) - (artFlipped ? artWidth : 0),
            top: joint - layout.tops[index] - artHeight / 2,
            width: artWidth,
            height: artHeight,
            scale: reducedMotion ? 1 : unfold,
            transformOrigin: artFlipped ? "100% 50%" : "0% 50%",
          }}
        >
          <svg
            viewBox="0 0 170 120"
            fill="none"
            overflow="visible"
            className="block size-full"
            style={{ transform: artFlipped ? "scaleX(-1)" : undefined }}
          >
            {item.art}
          </svg>
        </motion.div>
      )}
    </li>
  );
}

/** One wheat stalk traced down the page by your scroll, with each problem unfolding from it. */
export function StalkStory() {
  const listRef = useRef<HTMLOListElement>(null);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const [layout, setLayout] = useState<Layout | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 78%", "end 62%"],
  });
  const growth = useSpring(scrollYProgress, SETTLE);
  const tip = useTransform(growth, [0, 0.05], [0, 1]);
  const roots = useTransform(growth, [0.96, 1], [0, 1]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const wide = window.matchMedia("(min-width: 768px)").matches;
      const elements = rows.current.filter((row): row is HTMLLIElement => row !== null);
      // While the page is hidden during navigation its rows are detached; measure on return.
      if (elements.length !== PROBLEMS.length || list.clientWidth === 0) return;
      setLayout({
        width: list.clientWidth,
        height: list.offsetHeight,
        wide,
        joints: elements.map((row) => row.offsetTop + (wide ? row.offsetHeight / 2 : 56)),
        tops: elements.map((row) => row.offsetTop),
        artWidth: wide
          ? centreColumn(window.innerWidth) / 2 - ART_GAP
          : NARROW_ART_WIDTH,
        large: window.matchMedia("(min-width: 1024px)").matches,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative mt-[calc(var(--spacing-block)+3.5rem)]">
      <ol ref={listRef} className="relative">
        {layout && (
          <svg
            aria-hidden="true"
            data-stalk-stem
            width={layout.width}
            height={layout.height}
            fill="none"
            overflow="visible"
            className="pointer-events-none absolute top-0 left-0"
          >
            <motion.g style={{ opacity: reducedMotion ? 1 : tip }}>
              <g transform={`translate(${stemX(0, layout)} 2) ${layout.wide ? (layout.large ? "scale(2)" : "scale(1.3)") : "scale(1.1)"}`}>
                <Ear />
              </g>
            </motion.g>
            <motion.path
              d={stemPath(layout)}
              stroke={DEEP}
              strokeWidth={layout.wide ? 5 : 3.5}
              strokeLinecap="round"
              style={{ pathLength: reducedMotion ? 1 : growth }}
            />
            {/* Roots: the stalk ends in the ground, not in mid-air. */}
            <motion.g
              stroke={DEEP}
              strokeWidth={layout.wide ? 2.5 : 2}
              strokeLinecap="round"
              style={{ opacity: reducedMotion ? 1 : roots }}
              transform={`translate(${stemX(layout.height, layout)} ${layout.height})`}
            >
              <path d="M0 0C-8 10 -20 14 -32 26" />
              <path d="M0 0C-3 12 -9 22 -12 38" />
              <path d="M0 0C3 12 8 20 14 36" />
              <path d="M0 0C8 8 22 14 34 22" />
            </motion.g>
          </svg>
        )}
        {PROBLEMS.map((item, index) => (
          <StoryRow
            key={item.title}
            item={item}
            index={index}
            growth={growth}
            layout={layout}
            rowRef={(element) => {
              rows.current[index] = element;
            }}
          />
        ))}
      </ol>
    </div>
  );
}
