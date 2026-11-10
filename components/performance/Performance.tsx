"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ScrollTrigger } from "@/lib/gsap";
import { loadMetrics, type Metrics } from "@/lib/metrics";
import { ConfusionMatrix } from "./ConfusionMatrix";

type Load =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "ready"; metrics: Metrics };

/** Real values come only from the training export; placeholder data shows the token. */
function stats(metrics: Metrics | null) {
  const summary = metrics && !metrics.placeholder ? metrics.summary : null;
  return [
    {
      label: "Overall accuracy",
      value: summary ? `${(summary.accuracy * 100).toFixed(1)}%` : "[ACCURACY]",
      note: "How often the model is right on photos it hasn’t seen.",
    },
    {
      label: "Macro F1 score",
      value: summary ? summary.f1.toFixed(3) : "[F1]",
      note: "Balances missed and false answers, counting every class equally.",
    },
    {
      label: "Images trained on",
      value: summary ? summary.images.toLocaleString("en") : "[IMAGES]",
      note: "The crop photos the model learned from.",
    },
    {
      label: "Average prediction time",
      value: `${summary ? summary.latency_ms : "[LATENCY]"} ms`,
      note: "How long the model takes to read one photo.",
    },
  ];
}

export function Performance() {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    loadMetrics(controller.signal)
      .then((metrics) => setLoad({ state: "ready", metrics }))
      .catch(() => {
        if (!controller.signal.aborted) setLoad({ state: "failed" });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    ScrollTrigger.refresh();
  }, [load.state]);

  const metrics = load.state === "ready" ? load.metrics : null;
  const real = metrics && !metrics.placeholder ? metrics.summary : null;

  return (
    <section
      id="performance"
      // Switching matrix tabs resizes the panel; the page must not scroll to compensate.
      className="[overflow-anchor:none] bg-wheat-tint py-[clamp(3.5rem,2.25rem+5vw,6.5rem)] text-black lg:flex lg:min-h-svh lg:flex-col lg:justify-center lg:py-6 short:py-3"
    >
      <div className="page-width grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-16 short:gap-10">
        <div>
          <SectionHeader
            small
            fit
            label="The model"
            title="How well does the model see?"
            lead={`Trained on ${real ? real.images.toLocaleString("en") : "[IMAGES]"} crop images across ${real ? real.classes : "[CLASSES]"} classes. Here’s how it performs.`}
            tag={
              metrics?.placeholder && (
                <span className="rounded-full bg-wheat px-3 py-1 text-caption font-semibold">
                  Placeholder data
                </span>
              )
            }
          />

          <dl className="mt-8 border-t-[1.5px] border-black lg:mt-6 short:mt-3">
            {stats(metrics).map((stat) => (
              <div
                key={stat.label}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 border-b border-wheat-deep/40 py-3.5 short:py-1.5"
              >
                <dt className="font-semibold">{stat.label}</dt>
                <dd className="font-display text-title font-black whitespace-nowrap tabular-nums">
                  {stat.value}
                </dd>
                <dd className="col-span-2 mt-1 max-w-[46ch] text-caption text-charcoal short:hidden">
                  {stat.note}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* First in the reading order is the claim; on wide screens the evidence sits to its left. */}
        <div className="min-w-0 lg:order-first">
          {load.state === "loading" && (
            <p role="status" className="text-charcoal">Loading model metrics.</p>
          )}
          {load.state === "failed" && (
            <p role="alert" className="border-[1.5px] border-black bg-white px-4 py-3">
              The model metrics couldn&rsquo;t load. Refresh the page to try again.
            </p>
          )}
          {metrics && <ConfusionMatrix confusion={metrics.confusion} />}
        </div>
      </div>
    </section>
  );
}
