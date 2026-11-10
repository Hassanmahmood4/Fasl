"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { WheatStalk } from "./WheatStalk";

type WheatEdgeProps = {
  placement: "bottom" | "left" | "right";
  className?: string;
};

/** Stable pseudo-random value, so server and client render the same stalks. */
function wobble(index: number): number {
  const value = Math.sin(index * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Rounded because the browser shortens long decimals in inline styles, which
 * React would otherwise report as a server and client mismatch.
 */
function heightRem(placement: WheatEdgeProps["placement"], index: number, count: number): number {
  // Side clusters rise towards the outer edge, framing the content.
  const fromEdge = placement === "left" ? index : count - 1 - index;
  const height =
    placement === "bottom" ? 5 + wobble(index) * 5 : 26 - fromEdge * 3 - wobble(index) * 3;
  return Math.round(height * 100) / 100;
}

const LAYOUT = {
  bottom: "inset-x-0 bottom-0 justify-between px-1",
  left: "bottom-0 left-2 hidden w-[72px] justify-between min-[1360px]:flex",
  right: "right-2 bottom-0 hidden w-[72px] justify-between min-[1360px]:flex",
};

/** A row of stalks that grow up when their section scrolls into view. */
export function WheatEdge({ placement, className = "" }: WheatEdgeProps) {
  const scope = useRef<HTMLDivElement>(null);
  const count = placement === "bottom" ? 56 : 6;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from("[data-stalk]", {
          scaleY: 0,
          transformOrigin: "50% 100%",
          duration: 1.2,
          ease: "power3.out",
          stagger: { each: 0.012, from: "random" },
          scrollTrigger: { trigger: scope.current, start: "top bottom-=40", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div
      ref={scope}
      aria-hidden="true"
      className={`pointer-events-none absolute flex items-end ${LAYOUT[placement]} ${className}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          data-stalk
          // On narrow screens the bottom row keeps every other stalk.
          className={`flex flex-col items-center ${placement === "bottom" && index % 2 === 1 ? "max-md:hidden" : ""}`}
          style={{ height: `calc(var(--stalk-scale, 1) * ${heightRem(placement, index, count)}rem)` }}
        >
          <WheatStalk compact className="h-14 w-auto shrink-0" />
          <div className="w-px grow bg-current" />
        </div>
      ))}
    </div>
  );
}
