import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import type { Photo } from "@/lib/demo/types";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const STEPS = ["Identifying crop", "Reading growth stage", "Checking health", "Writing report"];
const STEP_SECONDS = 0.5;

type AnalysingProps = {
  photo: Photo;
  onFinished: () => void;
};

export function Analysing({ photo, onFinished }: AnalysingProps) {
  const scope = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [done, setDone] = useState(0);

  useGSAP(
    () => {
      if (reducedMotion) {
        onFinished();
        return;
      }
      const frame = scope.current?.querySelector("[data-frame]");
      gsap.to("[data-scan]", {
        y: () => frame?.clientHeight ?? 0,
        duration: 1,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
      const steps = gsap.timeline({ onComplete: onFinished });
      STEPS.forEach((_, index) => {
        steps.call(() => setDone(index + 1), undefined, (index + 1) * STEP_SECONDS);
      });
      steps.to({}, { duration: 0.3 });
    },
    { scope, dependencies: [reducedMotion], revertOnUpdate: true },
  );

  return (
    <div ref={scope} className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
      <div data-frame className="relative aspect-[4/3] overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- may be a blob: upload */}
        <img src={photo.src} alt={photo.alt} className="size-full object-cover" />
        <div
          data-scan
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-wheat shadow-[0_0_24px_6px_#E3C07E] motion-reduce:hidden"
        />
      </div>
      <ol aria-live="polite" className="space-y-5">
        {STEPS.map((step, index) => {
          const finished = index < done;
          return (
            <li
              key={step}
              className={`flex items-center gap-4 font-display text-heading font-black ${finished ? "text-black" : "text-charcoal"}`}
            >
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full border-2 ${finished ? "border-wheat bg-wheat text-black" : "border-charcoal"}`}
              >
                {finished && <Check aria-hidden="true" className="size-5" strokeWidth={3} />}
              </span>
              <span>
                {step}
                {finished && <span className="sr-only">, done</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
