"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Analysing } from "@/components/demo/Analysing";
import { PhotoPicker } from "@/components/demo/PhotoPicker";
import { predict, PredictError } from "@/lib/demo/api";
import { isLowConfidence } from "@/lib/demo/report";
import { UNCLEAR_SAMPLE } from "@/lib/demo/samples";
import type { AnalysisResult, Photo, Report, Sample } from "@/lib/demo/types";
import { PANEL, ReportPanel } from "./ReportPanel";

type View =
  | { name: "choose" }
  | { name: "analysing"; photo: Photo }
  | { name: "report"; photo: Photo; report: Report; isSample: boolean }
  | { name: "unclear"; photo: Photo };

const GENERIC_ERROR =
  "Something went wrong reading that photo. Try one of the sample photos instead.";

const AGAIN =
  "inline-flex items-center justify-center gap-2 rounded-full border-2 border-black px-7 py-3.5 font-bold transition-colors hover:bg-wheat-tint";

function releasePhoto(photo: Photo): void {
  if (photo.src.startsWith("blob:")) URL.revokeObjectURL(photo.src);
}

/** The working dashboard: choose a photo, watch it being read, get the report. */
export function ScanDashboard() {
  const [view, setView] = useState<View>({ name: "choose" });
  const [error, setError] = useState<string | null>(null);
  const result = useRef<HTMLDivElement>(null);
  const finishAnimation = useRef<(() => void) | null>(null);
  const latestRun = useRef(0);
  const hasMounted = useRef(false);

  const analyse = useCallback(
    async (photo: Photo, getResult: () => Promise<AnalysisResult>, isSample: boolean) => {
      const run = ++latestRun.current;
      setError(null);
      const animationDone = new Promise<void>((resolve) => {
        finishAnimation.current = resolve;
      });
      setView({ name: "analysing", photo });

      try {
        const [outcome] = await Promise.all([getResult(), animationDone]);
        if (run !== latestRun.current) return;
        if (outcome.kind === "report" && !isLowConfidence(outcome.report)) {
          setView({ name: "report", photo, report: outcome.report, isSample });
        } else {
          setView({ name: "unclear", photo });
        }
      } catch (caught) {
        if (run !== latestRun.current) return;
        releasePhoto(photo);
        setError(caught instanceof PredictError ? caught.message : GENERIC_ERROR);
        setView({ name: "choose" });
      }
    },
    [],
  );

  const runSample = useCallback(
    (sample: Sample) => {
      void analyse(sample.photo, async () => ({ kind: "report", report: sample.report }), true);
    },
    [analyse],
  );

  const runUpload = (file: File) => {
    const photo = { src: URL.createObjectURL(file), alt: "Your crop photo" };
    void analyse(photo, () => predict(file), false);
  };

  const reset = () => {
    if (view.name !== "choose") releasePhoto(view.photo);
    setError(null);
    setView({ name: "choose" });
  };

  // For demos: press U on the picker to show the unclear state on purpose.
  useEffect(() => {
    if (view.name !== "choose") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "u" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        runSample(UNCLEAR_SAMPLE);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view.name, runSample]);

  // Each step replaces the last, so bring the user and their focus to the new one.
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    result.current?.focus({ preventScroll: true });
  }, [view.name]);

  return (
    <>
      {view.name === "choose" && (
        <div className={`${PANEL} p-5 sm:p-8`}>
          <PhotoPicker error={error} onSample={runSample} onUpload={runUpload} />
        </div>
      )}

      {view.name === "analysing" && (
        <div className={`${PANEL} p-5 sm:p-8`}>
          <Analysing photo={view.photo} onFinished={() => finishAnimation.current?.()} />
        </div>
      )}

      {view.name === "report" && (
        <ReportPanel
          report={view.report}
          photo={view.photo}
          isSample={view.isSample}
          focusRef={result}
          showDownload
          showAssistant
          action={
            <button type="button" onClick={reset} className={AGAIN}>
              <RotateCcw aria-hidden="true" className="size-5" />
              Scan another photo
            </button>
          }
        />
      )}

      {view.name === "unclear" && (
        <div
          ref={result}
          tabIndex={-1}
          className={`${PANEL} grid gap-8 p-5 outline-none sm:p-8 md:grid-cols-2 md:items-center md:gap-12`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- may be a blob: upload */}
          <img
            src={view.photo.src}
            alt={view.photo.alt}
            className="aspect-[4/3] w-full rounded-2xl object-cover"
          />
          <div>
            <h2 className="font-display text-heading font-black">
              Photo unclear. Retake it closer, in daylight, with the crop filling the frame.
            </h2>
            <button
              type="button"
              onClick={reset}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-wheat px-8 py-3.5 font-bold transition-colors hover:bg-wheat-deep"
            >
              <RotateCcw aria-hidden="true" className="size-5" />
              Try another photo
            </button>
          </div>
        </div>
      )}
    </>
  );
}
