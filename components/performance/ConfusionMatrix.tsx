import { useState } from "react";
import { Tabs } from "@/components/shared/Tabs";
import type { Metrics } from "@/lib/metrics";

const VIEWS = [
  { value: "disease", label: "Disease" },
  { value: "stage", label: "Growth stage" },
] as const;

type ViewName = (typeof VIEWS)[number]["value"];

const LEGEND = [10, 50, 90];

function shade(share: number): string {
  return `color-mix(in srgb, #B8893D ${share}%, #FFFFFF)`;
}

/** A framed figure: header bar, matrix, then a legend that explains how to read it. */
export function ConfusionMatrix({ confusion }: { confusion: Metrics["confusion"] }) {
  const [view, setView] = useState<ViewName>("disease");
  const { labels, matrix } = confusion[view];

  return (
    <figure className="min-w-0 border-[1.5px] border-black bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-wheat px-4 py-2.5 sm:px-5">
        <figcaption className="font-semibold">Confusion matrix</figcaption>
        <Tabs label="Matrix type" options={VIEWS} value={view} onChange={setView} />
      </div>

      {/* Wide matrices scroll inside the panel rather than the page. */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Confusion matrix table"
        className="overflow-x-auto px-2 py-4 sm:px-5 lg:py-5 short:py-2"
      >
        <table
          className="w-full min-w-[300px] table-fixed border-separate border-spacing-0.5 text-center text-[0.6875rem] tabular-nums sm:border-spacing-1 sm:text-caption"
        >
          <caption className="sr-only">
            Rows are the true label, columns are the predicted label. Each cell shows the share of
            its row.
          </caption>
          <thead>
            <tr>
              <td className="w-[4.25rem] sm:w-24" />
              {labels.map((label) => (
                <th key={label} scope="col" className="px-0 pb-1 align-bottom leading-tight font-semibold sm:px-0.5">
                  {/* Many narrow columns on phones: labels run sideways instead of breaking mid-word. */}
                  <span className={labels.length > 5 ? "inline-block max-sm:h-[7.25em] max-sm:rotate-180 max-sm:text-left max-sm:whitespace-nowrap max-sm:[writing-mode:vertical-rl]" : undefined}>
                    {label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rowIndex) => {
              const rowTotal = row.reduce((sum, count) => sum + count, 0);
              return (
                <tr key={labels[rowIndex]}>
                  <th scope="row" className="pr-1 text-right leading-tight font-semibold">
                    {labels[rowIndex]}
                  </th>
                  {row.map((count, columnIndex) => {
                    const share = rowTotal === 0 ? 0 : Math.round((count / rowTotal) * 100);
                    return (
                      <td
                        key={labels[columnIndex]}
                        title={`True ${labels[rowIndex]}, predicted ${labels[columnIndex]}: ${count} (${share}%)`}
                        className="h-8 font-semibold text-black sm:h-10"
                        style={{ backgroundColor: shade(share) }}
                      >
                        {share}%
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-wheat px-4 py-2.5 text-caption text-charcoal sm:px-5">
        <p>Rows: true label. Columns: predicted label.</p>
        <ul aria-hidden="true" className="flex items-center gap-3 tabular-nums">
          {LEGEND.map((share) => (
            <li key={share} className="flex items-center gap-1.5">
              <span className="size-3 border border-wheat-deep" style={{ backgroundColor: shade(share) }} />
              {share}%
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
