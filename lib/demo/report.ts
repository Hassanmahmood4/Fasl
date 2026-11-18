import type { Report } from "./types";

export const STAGES = ["Vegetative", "Flowering", "Grain filling", "Ripening"];

const MIN_CONFIDENCE = 0.6;

/** Too unsure to show a report. The stage is left out: an unsure stage still gets a report, without a harvest call. */
export function isLowConfidence(report: Report): boolean {
  return Math.min(report.crop.confidence, report.health.confidence) < MIN_CONFIDENCE;
}

export function isStageUnsure(report: Report): boolean {
  return report.stage.confidence < MIN_CONFIDENCE;
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function readinessLabel(report: Report): string {
  const { readiness } = report;
  if (isStageUnsure(report)) return "Can’t tell from this photo";
  if (readiness.ready) return "Ready to harvest";
  if (!readiness.daysLeft) return "Not ready";
  const [from, to] = readiness.daysLeft;
  return `Not ready, about ${from}–${to} days left`;
}

export function healthLabel({ health }: Report): string {
  return health.status === "healthy" ? "Healthy" : (health.disease ?? "Disease found");
}
