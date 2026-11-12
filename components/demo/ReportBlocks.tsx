import type { ReactNode } from "react";
import { Wheat } from "lucide-react";
import { healthLabel, percent, readinessLabel, STAGES } from "@/lib/demo/report";
import type { Report, Severity } from "@/lib/demo/types";

const SEVERITIES: Severity[] = ["mild", "moderate", "severe"];
const SEVERITY_FILL = ["bg-wheat-tint", "bg-wheat", "bg-wheat-deep"];

function Block({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-block className={className}>
      <h4 className="text-caption font-semibold text-charcoal">{title}</h4>
      <div className="mt-2 lg:mt-1">{children}</div>
    </div>
  );
}

function SeverityMeter({ severity }: { severity: Severity }) {
  const level = SEVERITIES.indexOf(severity);
  return (
    <div className="mt-3">
      <div aria-hidden="true" className="flex gap-1">
        {SEVERITIES.map((name, index) => (
          <span
            key={name}
            className={`h-3 flex-1 rounded-full border border-wheat-deep ${index <= level ? SEVERITY_FILL[index] : "bg-white"}`}
          />
        ))}
      </div>
      <p className="mt-2 font-semibold first-letter:uppercase">{severity} severity</p>
    </div>
  );
}

export function ReportBlocks({ report }: { report: Report }) {
  const { crop, stage, health } = report;

  return (
    <>
      <Block title="Crop" className="md:order-1">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-display text-title font-bold">{crop.name}</p>
          <p className="font-semibold tabular-nums">{percent(crop.confidence)}</p>
        </div>
        <div
          role="meter"
          aria-label="Crop confidence"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(crop.confidence * 100)}
          className="mt-2 h-3 overflow-hidden rounded-full bg-wheat-tint"
        >
          <div className="h-full rounded-full bg-wheat" style={{ width: percent(crop.confidence) }} />
        </div>
      </Block>

      <Block title="Growth stage" className="md:order-3 md:col-span-2">
        <ol className="grid grid-cols-4 gap-1">
          {STAGES.map((name, index) => {
            const current = index + 1 === stage.index;
            return (
              <li
                key={name}
                aria-current={current ? "step" : undefined}
                className={`flex min-h-12 items-center justify-center lg:min-h-9 short:min-h-7 rounded-lg px-0.5 py-1 text-center text-xs leading-tight sm:text-caption ${current ? "bg-wheat font-bold" : "bg-wheat-tint text-charcoal"}`}
              >
                {name}
              </li>
            );
          })}
        </ol>
      </Block>

      <Block title="Health" className="md:order-2">
        <p className="font-display text-title font-bold">{healthLabel(report)}</p>
        {health.severity && <SeverityMeter severity={health.severity} />}
        {health.location && <p className="mt-1 text-charcoal">Seen on: {health.location}</p>}
      </Block>

      <Block title="Harvest readiness" className="md:order-4 md:col-span-2">
        <p className="w-fit max-w-full rounded-xl bg-wheat px-5 py-3 font-display text-heading font-black lg:px-4 lg:py-2 lg:text-title short:py-1">
          {readinessLabel(report)}
        </p>
        {report.readiness.daysLeft && (
          <p className="mt-2 text-caption text-charcoal">Days left is an estimate.</p>
        )}
      </Block>

      <Block title="What to do now" className="md:order-5 md:col-span-2">
        <ul className="space-y-3 lg:space-y-1.5">
          {report.actions.map((action) => (
            <li key={action} className="flex max-w-[60ch] gap-3 leading-[1.45] lg:text-caption lg:leading-[1.35]">
              <Wheat aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-wheat-deep" />
              {action}
            </li>
          ))}
        </ul>
      </Block>
    </>
  );
}
