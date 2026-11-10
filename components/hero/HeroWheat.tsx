"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { WheatBranch, WheatStack } from "./WheatArt";

type Branch = {
  /** Base position, as a percentage of the hero. */
  x: number;
  y: number;
  /** Direction of growth in degrees: 0 is straight up, 90 points right. */
  angle: number;
  /** Length in vmin. */
  length: number;
  flip?: boolean;
  fork?: boolean;
};

const BRANCHES: Branch[] = [
  { x: 0, y: 17, angle: 62, length: 25, fork: true },
  { x: 0, y: 36, angle: 80, length: 15, flip: true },
  { x: 0, y: 55, angle: 72, length: 13 },
  { x: 0, y: 73, angle: 58, length: 24, flip: true, fork: true },
  { x: 0, y: 92, angle: 44, length: 33 },
  { x: 7, y: 100, angle: 18, length: 29, flip: true },
  { x: 15, y: 100, angle: 31, length: 19, fork: true },
  { x: 24, y: 100, angle: -9, length: 23 },
  { x: 32, y: 100, angle: 13, length: 14, flip: true },
  { x: 67, y: 100, angle: -15, length: 15 },
  { x: 76, y: 100, angle: 8, length: 25, flip: true, fork: true },
  { x: 85, y: 100, angle: -27, length: 18 },
  { x: 93, y: 100, angle: -14, length: 31, fork: true },
  { x: 100, y: 88, angle: -48, length: 30, flip: true },
  { x: 100, y: 69, angle: -64, length: 22 },
  { x: 100, y: 51, angle: -76, length: 13, flip: true },
  { x: 100, y: 31, angle: -68, length: 17, fork: true },
  { x: 100, y: 13, angle: -58, length: 26, flip: true },
  { x: 11, y: 0, angle: 152, length: 15, flip: true },
  { x: 90, y: 0, angle: -150, length: 13 },
];

/** A branch's width as a share of its length, to two places: see the note in WheatEdge. */
const BRANCH_RATIO = 0.33;
const STACK_RATIO = 520 / 262;
const STACK_MIN_HEIGHT = 56;

/** Hides branches that would cross the text, and sizes the stack to the space below it. */
function fitToText(hero: HTMLElement): void {
  const area = hero.getBoundingClientRect();
  const unit = Math.min(window.innerWidth, window.innerHeight) / 100;
  const text = [hero.querySelector("h1"), hero.querySelector("h1 + p"), hero.querySelector("p")]
    .filter((element): element is Element => element !== null)
    .map((element) => element.getBoundingClientRect());

  hero.querySelectorAll<HTMLElement>("[data-branch]").forEach((element) => {
    const x = (Number(element.dataset.x) / 100) * area.width;
    const y = (Number(element.dataset.y) / 100) * area.height;
    const angle = (Number(element.dataset.angle) * Math.PI) / 180;
    const length = Number(element.dataset.length) * unit;
    const clearance = length * 0.2 + 12;
    let clear = true;
    for (let step = 0; step <= 12 && clear; step++) {
      const px = area.left + x + (Math.sin(angle) * length * step) / 12;
      const py = area.top + y - (Math.cos(angle) * length * step) / 12;
      clear = text.every(
        (rect) =>
          px < rect.left - clearance ||
          px > rect.right + clearance ||
          py < rect.top - clearance ||
          py > rect.bottom + clearance,
      );
    }
    element.style.display = clear ? "" : "none";
  });

  const stack = hero.querySelector<HTMLElement>("[data-stack-frame]");
  const lowest = hero.querySelector("h1 + p")?.getBoundingClientRect().bottom;
  if (stack && lowest !== undefined) {
    const room = area.bottom - lowest - 16;
    const height = Math.min(room, area.height * 0.3, (area.width * 0.86) / STACK_RATIO);
    stack.style.display = height < STACK_MIN_HEIGHT ? "none" : "";
    stack.style.height = `${height}px`;
    stack.style.width = `${height * STACK_RATIO}px`;
  }
}

/** Wheat revealed by the opening curtain. WheatField plays the pop-out as you scroll. */
export function HeroWheat() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const hero = scope.current?.closest("section");
      if (!hero) return;

      const refit = () => fitToText(hero);
      refit();
      const resizeObserver = new ResizeObserver(refit);
      resizeObserver.observe(hero);
      let active = true;
      void document.fonts.ready.then(() => {
        if (active) refit();
      });

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // Each branch sways at its own pace, in a light breeze.
        gsap.utils.toArray<SVGElement>("[data-sway]").forEach((branch, index) => {
          gsap.fromTo(
            branch,
            { rotation: -1.6, transformOrigin: "50% 100%" },
            {
              rotation: 1.6,
              duration: 2.2 + (index % 5) * 0.35,
              delay: (index % 7) * -0.4,
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
            },
          );
        });
      });

      return () => {
        active = false;
        resizeObserver.disconnect();
        mm.revert();
      };
    },
    { scope },
  );

  return (
    <div
      ref={scope}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
    >
      {BRANCHES.map((branch) => (
        <div
          key={`${branch.x}-${branch.y}`}
          data-branch
          data-x={branch.x}
          data-y={branch.y}
          data-angle={branch.angle}
          data-length={branch.length}
          className="absolute size-0"
          style={{ left: `${branch.x}%`, top: `${branch.y}%`, rotate: `${branch.angle}deg` }}
        >
          <div
            data-pop
            className="absolute bottom-0 origin-bottom"
            style={{
              height: `${branch.length}vmin`,
              width: `${Math.round(branch.length * BRANCH_RATIO * 100) / 100}vmin`,
              left: `${Math.round((-branch.length * BRANCH_RATIO * 100) / 2) / 100}vmin`,
            }}
          >
            <WheatBranch
              flip={branch.flip}
              fork={branch.fork}
              className="block size-full"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Sits apart from the branches: under reduced motion it must stand in front of the static field. */
export function HeroStack() {
  return (
    <div
      data-stack-frame
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 left-1/2 z-[5] h-40 w-80 -translate-x-1/2 motion-reduce:z-[15]"
    >
      <div data-stack className="size-full origin-bottom">
        <WheatStack className="block size-full" />
      </div>
    </div>
  );
}
