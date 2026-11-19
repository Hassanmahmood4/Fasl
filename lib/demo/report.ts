import type { Report } from "./types";

export const STAGES = ["Vegetative", "Flowering", "Grain filling", "Ripening"];

const MIN_CONFIDENCE = 0.6;

export const UNSURE = "Not sure from this photo";

/**
 * True when there is nothing worth showing: not clearly wheat, or neither stage nor health is clear.
 * If only one of them is unclear, the report still shows and marks that part "Not sure".
 */
export function isLowConfidence(report: Report): boolean {
  const healthUnsure =
    report.health.status === "uncertain" || report.health.confidence < MIN_CONFIDENCE;
  return report.crop.confidence < MIN_CONFIDENCE || (isStageUnsure(report) && healthUnsure);
}

/** The API flags an unsure stage; older responses only carry the confidence. */
export function isStageUnsure({ stage }: Report): boolean {
  return Boolean(stage.uncertain) || stage.confidence < MIN_CONFIDENCE;
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function readinessLabel(report: Report): string {
  const { readiness } = report;
  if (readiness.uncertain || isStageUnsure(report)) return UNSURE;
  if (readiness.ready) return "Ready to harvest";
  if (!readiness.daysLeft) return "Not ready";
  const [from, to] = readiness.daysLeft;
  return `Not ready, about ${from}–${to} days left`;
}

export function healthLabel({ health }: Report): string {
  if (health.status === "uncertain") return UNSURE;
  return health.status === "healthy" ? "Healthy" : (health.disease ?? "Disease found");
}
