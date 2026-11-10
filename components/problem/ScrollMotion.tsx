"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

/** Keeps the scrubbed motion tied to the scroll while taking out its jitter. */
const SETTLE = { stiffness: 140, damping: 30, restDelta: 0.001 };

/**
 * Set explicitly under reduced motion: dropping the animated values after the page
 * has loaded would leave their first frame behind, with the text still invisible.
 */
const AT_REST = { y: 0, rotate: 0, scale: 1, opacity: 1 };

type ScrollRiseProps = {
  children: ReactNode;
  /** Starts later in the scroll, for a stagger: 0 is first. */
  order?: number;
  /** Tilt it starts from, in degrees. */
  tilt?: number;
  /** How far below its place it starts, in pixels. */
  distance?: number;
  as?: "div" | "span";
  className?: string;
};

/** Rises, straightens and fades in as it scrolls up the screen, and reverses going back. */
export function ScrollRise({
  children,
  order = 0,
  tilt = 0,
  distance = 120,
  as = "div",
  className,
}: ScrollRiseProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 100%", "start 68%"],
  });
  const progress = useSpring(scrollYProgress, SETTLE);
  const from = order * 0.1;
  const to = Math.min(1, 0.6 + from);

  const y = useTransform(progress, [from, to], [distance, 0]);
  const rotate = useTransform(progress, [from, to], [tilt, 0]);
  const scale = useTransform(progress, [from, to], [0.94, 1]);
  const opacity = useTransform(progress, [from, from + (to - from) * 0.7], [0, 1]);

  const Element = as === "span" ? motion.span : motion.div;

  return (
    <Element
      ref={ref}
      data-scroll-motion
      className={className}
      style={reducedMotion ? AT_REST : { y, rotate, scale, opacity }}
    >
      {children}
    </Element>
  );
}

function ScrollWord({
  children,
  progress,
  index,
  total,
}: {
  children: string;
  progress: MotionValue<number>;
  index: number;
  total: number;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const start = index / total;
  const opacity = useTransform(progress, [start, Math.min(1, start + 1.6 / total)], [0.14, 1]);
  return (
    <motion.span data-scroll-motion style={{ opacity: reducedMotion ? 1 : opacity }}>
      {children}
    </motion.span>
  );
}

/** Darkens a heading word by word as it scrolls into place. */
export function ScrollWords({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 92%", "start 42%"],
  });
  const progress = useSpring(scrollYProgress, SETTLE);
  const words = text.split(" ");

  return (
    <span ref={ref}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          <ScrollWord progress={progress} index={index} total={words.length}>
            {word}
          </ScrollWord>
          {index < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}
