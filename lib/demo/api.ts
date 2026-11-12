import { apiLink, apiUrl } from "@/lib/apiUrl";
import type { AnalysisResult, Report } from "./types";

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

/** Longest side sent to the model. It only needs 224px, and Vercel caps request bodies at 4.5 MB. */
const MAX_SIDE = 1600;

/** Shrinks big phone photos before upload. Falls back to the original file if the browser can't. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 2_000_000) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Whether the model service answers. Never throws. */
export async function checkModel(): Promise<boolean> {
  try {
    const response = await fetch(apiUrl("/health"), {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function predict(file: File): Promise<AnalysisResult> {
  const body = new FormData();
  body.append("image", await shrink(file), file.name.replace(/\.\w+$/, "") + ".jpg");

  let data: unknown;
  try {
    const response = await fetch(apiUrl("/predict"), {
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
      heatmapUrl: apiLink(data.heatmapUrl),
      urduAudioUrl: apiLink(data.urduAudioUrl),
    },
  };
}
