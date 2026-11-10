"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { createEarSprites, drawField } from "@/lib/wheat/draw";
import { createField, stepField, type Cursor } from "@/lib/wheat/field";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

/** The hero's stalk physics at a smaller scale: sways, and bends away from the cursor. */
export function FooterWheat() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const sprites = createEarSprites(dpr);
      let field = createField(1, 1, "row");

      const paint = (dt: number, time: number, cursor: Cursor | null) => {
        stepField(field, dt, time, cursor);
        drawField(ctx, field, sprites, dpr);
      };

      const resize = () => {
        const { width, height } = canvas.getBoundingClientRect();
        if (width === 0 || height === 0) return;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        field = createField(width, height, "row");
        paint(0, 0, null);
      };
      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);

      if (reducedMotion) return () => resizeObserver.disconnect();

      let pointer: { x: number; y: number } | null = null;
      const onPointerMove = (event: PointerEvent) => {
        pointer = { x: event.clientX, y: event.clientY };
      };
      const onTouch = (event: TouchEvent) => {
        const touch = event.touches[0];
        pointer = touch ? { x: touch.clientX, y: touch.clientY } : null;
      };
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("touchmove", onTouch, { passive: true });
      window.addEventListener("touchend", onTouch);

      const tick = (time: number, deltaTime: number) => {
        const rect = canvas.getBoundingClientRect();
        const cursor = pointer && { x: pointer.x - rect.left, y: pointer.y - rect.top, strength: 1 };
        paint(Math.min(deltaTime / 1000, 1 / 30), time, cursor);
      };

      // Only animates while the footer is on screen.
      const visibility = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) gsap.ticker.add(tick);
        else gsap.ticker.remove(tick);
      });
      visibility.observe(canvas);

      return () => {
        gsap.ticker.remove(tick);
        visibility.disconnect();
        resizeObserver.disconnect();
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("touchmove", onTouch);
        window.removeEventListener("touchend", onTouch);
      };
    },
    { dependencies: [reducedMotion], revertOnUpdate: true },
  );

  return <canvas ref={canvasRef} aria-hidden="true" className="block h-24 w-full sm:h-40" />;
}
