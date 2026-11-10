"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollRise, ScrollWords } from "@/components/problem/ScrollMotion";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { WheatEdge } from "@/components/shared/WheatEdge";
import { SAMPLES } from "@/lib/demo/samples";
import { ReportPanel } from "./ReportPanel";

/** Leaf rust uses every block in the report, so it shows the dashboard at its fullest. */
const PREVIEW = SAMPLES[1];

/** What a department officer sees after scanning a crop, with the way into the real dashboard. */
export function DashboardPreview() {
  return (
    <section
      id="dashboard"
      className="relative overflow-clip bg-wheat py-section text-black lg:flex lg:min-h-svh lg:flex-col lg:justify-center lg:py-7 short:py-2"
    >
      <WheatEdge placement="left" className="text-wheat-deep" />
      <WheatEdge placement="right" className="text-wheat-deep" />

      <div className="page-width relative">
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            fit
            label="The dashboard"
            title={<ScrollWords text={"One photo. One clear report."} />}
            lead={
              <ScrollRise as="span" distance={48} className="block">
                This is what an agriculture officer sees after scanning a crop.
              </ScrollRise>
            }
          />
          <Link
            href="/dashboard"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-black px-7 py-3 font-bold text-white transition-colors hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Scan your crop
            <ArrowRight aria-hidden="true" className="size-5" />
          </Link>
        </div>

        <ScrollRise distance={110} className="mt-block lg:mt-5 short:mt-3">
          <ReportPanel report={PREVIEW.report} photo={PREVIEW.photo} isSample compact />
        </ScrollRise>
      </div>
    </section>
  );
}
