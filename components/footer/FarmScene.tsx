"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import {
  createFarmScene,
  createPoses,
  createWorkTimelines,
  drawFarmScene,
  fitViewport,
} from "@/lib/scene/scene";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { FooterWheat } from "./FooterWheat";

/** A painted, living farm behind the footer panel. The panel floats over its sky. */
export function FarmScene({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      const canvas = canvasRef.current;
      const sceneWindow = windowRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !sceneWindow || !ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const poses = createPoses();
      const timelines = reducedMotion ? [] : createWorkTimelines(gsap, poses);
      let scene: ReturnType<typeof createFarmScene> | null = null;
      let elapsed = 40;

      const paint = () => {
        if (scene) drawFarmScene(ctx, scene, poses, elapsed);
      };

      const resize = () => {
        const { width, height } = canvas.getBoundingClientRect();
        if (width === 0 || height === 0) return;
        if (scene && scene.view.width === width && scene.view.height === height) return;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        scene = createFarmScene(fitViewport(width, height, sceneWindow.clientHeight, dpr));
        paint();
      };
      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);

      if (reducedMotion) return () => resizeObserver.disconnect();

      const tick = (_time: number, deltaTime: number) => {
        elapsed += Math.min(deltaTime / 1000, 1 / 20);
        paint();
      };

      // Only runs while the footer is on screen.
      const visibility = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          gsap.ticker.add(tick);
          timelines.forEach((timeline) => timeline.play());
        } else {
          gsap.ticker.remove(tick);
          timelines.forEach((timeline) => timeline.pause());
        }
      });
      visibility.observe(canvas);

      return () => {
        gsap.ticker.remove(tick);
        visibility.disconnect();
        resizeObserver.disconnect();
        timelines.forEach((timeline) => timeline.kill());
      };
    },
    { dependencies: [reducedMotion], revertOnUpdate: true },
  );

  return (
    <div className="relative overflow-hidden lg:flex lg:h-svh lg:flex-col">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="An illustrated Pakistani farm. Farmers harvest and winnow golden wheat while oxen plough behind them, with a village and snow-capped mountains beyond."
        className="absolute inset-0 h-full w-full"
      />
      <div className="relative lg:shrink-0">{children}</div>
      <div ref={windowRef} className="relative h-[clamp(340px,44vw,680px)] lg:h-auto lg:min-h-0 lg:flex-1">
        <div className="absolute inset-x-0 bottom-0">
          <FooterWheat />
        </div>
      </div>
    </div>
  );
}
