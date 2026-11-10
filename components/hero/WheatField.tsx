"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { createEarSprites, drawField } from "@/lib/wheat/draw";
import { createField, stepField } from "@/lib/wheat/field";

type WheatFieldProps = {
  /** Fades out as soon as the curtain starts to open. */
  hintId: string;
  /** Appears in step with the curtain: 50% open, 50% visible. */
  navId: string;
};

/** Share of the pinned scroll spent opening; the rest holds the headline in view. */
const OPEN_SHARE = 0.72;

/** The wheat curtain: pins the hero and draws the field apart as the page scrolls. */
export function WheatField({ hintId, navId }: WheatFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [painted, setPainted] = useState(false);

  useGSAP(
    () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const hero = canvas?.closest("section");
      if (!canvas || !ctx || !hero) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const sprites = createEarSprites(dpr);
      const mode = reducedMotion ? "bottom" : "full";
      let field = createField(1, 1, mode);

      const resize = () => {
        const { width, height } = canvas.getBoundingClientRect();
        if (width === 0 || height === 0) return;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        if (reducedMotion) {
          // With no curtain to open, the wheat must stay below the text.
          const text = hero.querySelector("h1 + p")?.getBoundingClientRect();
          const canvasBottom = canvas.getBoundingClientRect().bottom;
          const reach = text ? canvasBottom - text.bottom - 12 : Infinity;
          field = createField(width, height, mode, reach);
          stepField(field, 0, 0, null);
          drawField(ctx, field, sprites, dpr);
        } else {
          field = createField(width, height, mode);
        }
      };

      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);

      if (reducedMotion) {
        setPainted(true);
        return () => resizeObserver.disconnect();
      }

      const curtain = { open: 0 };
      const hint = document.getElementById(hintId);
      const nav = document.getElementById(navId);
      // Fully hidden means unreachable too, for keyboard and pointer alike.
      const syncNav = () => {
        if (nav) nav.inert = curtain.open < 0.001;
      };
      syncNav();
      const scroll = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: syncNav,
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "+=150%",
          pin: true,
          scrub: true,
          anticipatePin: 1,
        },
      });
      scroll.to(curtain, { open: 1, duration: OPEN_SHARE }, 0);
      if (hint) scroll.to(hint, { autoAlpha: 0, duration: 0.12 }, 0);
      if (nav) {
        scroll.fromTo(
          nav,
          { opacity: 0, y: -24 },
          { opacity: 1, y: 0, duration: OPEN_SHARE },
          0,
        );
      }
      // Branches pop out one by one as the curtain passes, then the stack rises.
      gsap.utils.toArray<HTMLElement>("[data-pop]", hero).forEach((branch, index) => {
        scroll.fromTo(
          branch,
          { scale: 0, transformOrigin: "50% 100%" },
          { scale: 1, duration: 0.16, ease: "power3.out" },
          0.26 + ((index * 7) % 20) * 0.017,
        );
      });
      const stack = hero.querySelector("[data-stack]");
      if (stack) {
        scroll.fromTo(
          stack,
          { scale: 0.55, y: 60, opacity: 0, transformOrigin: "50% 100%" },
          { scale: 1, y: 0, opacity: 1, duration: 0.2, ease: "power3.out" },
          0.48,
        );
      }
      // Empty tween that stretches the timeline, holding the open headline.
      scroll.to({}, { duration: 1 - OPEN_SHARE }, OPEN_SHARE);

      const tick = (time: number, deltaTime: number) => {
        stepField(field, Math.min(deltaTime / 1000, 1 / 30), time, null, curtain.open);
        drawField(ctx, field, sprites, dpr);
        setPainted(true);
      };

      // Off-screen, the field stops drawing entirely.
      const visibility = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) gsap.ticker.add(tick);
        else gsap.ticker.remove(tick);
      });
      visibility.observe(canvas);
      gsap.ticker.add(tick);

      return () => {
        gsap.ticker.remove(tick);
        if (nav) nav.inert = false;
        visibility.disconnect();
        resizeObserver.disconnect();
      };
    },
    { dependencies: [reducedMotion, hintId, navId], revertOnUpdate: true },
  );

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />
      {/* Hides the text until the first frame paints, so the headline never flashes. */}
      {!painted && (
        <div
          aria-hidden="true"
          className="wheat-cover absolute inset-0 z-10 bg-wheat-deep motion-reduce:hidden"
        />
      )}
      <noscript>
        <style>{`.wheat-cover { display: none; } #${navId} { opacity: 1; }`}</style>
      </noscript>
    </>
  );
}
