import type { AnalysisResult, Report } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const TIMEOUT_MS = 30_000;
const HEALTH_TIMEOUT_MS = 8_000;

export class PredictError extends Error {}

const UNREACHABLE =
  "We couldn’t reach the Fasl model right now. Try one of the sample photos instead.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReport(value: unknown): value is Report {
  return (
    isRecord(value) &&
    isRecord(value.crop) &&
    typeof value.crop.name === "string" &&
    typeof value.crop.confidence === "number" &&
    isRecord(value.stage) &&
    typeof value.stage.index === "number" &&
    isRecord(value.readiness) &&
    isRecord(value.health) &&
    typeof value.health.confidence === "number" &&
    Array.isArray(value.actions)
  );
}

function absolute(url: string | undefined, base: string): string | undefined {
  return url ? new URL(url, base).href : undefined;
}

/** Whether the model service answers. Never throws. */
export async function checkModel(): Promise<boolean> {
  if (!API_URL) return false;
  try {
    const response = await fetch(new URL("/health", API_URL), {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function predict(file: File): Promise<AnalysisResult> {
  if (!API_URL) throw new PredictError(UNREACHABLE);

  const body = new FormData();
  body.append("image", file);

  let data: unknown;
  try {
    const response = await fetch(new URL("/predict", API_URL), {
      method: "POST",
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new PredictError(UNREACHABLE);
    data = await response.json();
  } catch {
    throw new PredictError(UNREACHABLE);
  }

  if (isRecord(data) && data.status === "unclear") return { kind: "unclear" };
  if (!isReport(data)) throw new PredictError(UNREACHABLE);

  return {
    kind: "report",
    report: {
      ...data,
      heatmapUrl: absolute(data.heatmapUrl, API_URL),
      urduAudioUrl: absolute(data.urduAudioUrl, API_URL),
    },
  };
}
