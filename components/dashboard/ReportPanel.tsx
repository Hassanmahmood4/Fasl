import type { ReactNode, RefObject } from "react";
import { ReportActions } from "@/components/demo/ReportActions";
import { ReportBlocks } from "@/components/demo/ReportBlocks";
import { CropAssistant } from "./CropAssistant";
import type { Photo, Report } from "@/lib/demo/types";

export const PANEL =
  "overflow-hidden rounded-[20px] bg-white shadow-[0_30px_60px_-34px_rgba(90,64,20,0.7)]";

type ReportPanelProps = {
  report: Report;
  photo: Photo;
  isSample: boolean;
  /** Moved to when the report appears, so keyboard and screen-reader users land on it. */
  focusRef?: RefObject<HTMLDivElement | null>;
  /** Sits beside the report's own actions. */
  action?: ReactNode;
  /** The home page preview drops its title on short screens, to fit one screen. */
  compact?: boolean;
  /** Offers the PDF download. Only the live dashboard shows it. */
  showDownload?: boolean;
  /** Shows the voice chat under the photo. Only the live dashboard shows it. */
  showAssistant?: boolean;
};

/** The finished report. Used by the live dashboard and the preview on the home page. */
export function ReportPanel({ report, photo, isSample, focusRef, action, compact = false, showDownload = false, showAssistant = false }: ReportPanelProps) {
  return (
    <div
      ref={focusRef}
      tabIndex={focusRef ? -1 : undefined}
      data-dashboard
      className={`${PANEL} outline-none`}
    >
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-wheat-tint px-5 py-3 sm:px-8 lg:py-1">
        <p lang="ur" dir="rtl" className="font-urdu text-2xl leading-[1.9]">
          فصل
        </p>
        {isSample && (
          <span className="rounded-full bg-wheat px-3 py-1 text-caption font-semibold">
            Sample result
          </span>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,9fr)] lg:gap-8 lg:p-7 short:gap-5 short:p-4">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="aspect-[4/3] overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- may be a blob: upload */}
            <img src={photo.src} alt={photo.alt} className="size-full object-cover" />
          </div>
          {showAssistant && <CropAssistant report={report} />}
        </div>

        <div className="min-w-0">
          <h3 className={`font-display text-heading font-black lg:text-title ${compact ? "short:hidden" : ""}`}>
            Your crop report
          </h3>
          <div className="mt-8 grid gap-8 md:grid-cols-2 lg:mt-3 lg:gap-x-8 lg:gap-y-4 short:mt-0 short:gap-y-2">
            <ReportBlocks report={report} />
          </div>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start lg:mt-4 short:mt-2">
            <ReportActions report={report} photo={photo} isSample={isSample} showDownload={showDownload} />
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}
