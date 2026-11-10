export type EpochMetrics = {
  epoch: number;
  train_acc: number;
  val_acc: number;
  train_loss: number;
  val_loss: number;
};

export type ConfusionData = { labels: string[]; matrix: number[][] };

export type ClassScore = { label: string; precision: number; recall: number; f1: number };

/** The shape exported by the training notebook. `placeholder` marks stand-in data. */
export type Metrics = {
  placeholder?: boolean;
  summary: { accuracy: number; f1: number; images: number; classes: number; latency_ms: number };
  history: EpochMetrics[];
  confusion: { disease: ConfusionData; stage: ConfusionData };
  per_class: ClassScore[];
};

function isMetrics(value: unknown): value is Metrics {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Partial<Metrics>;
  return (
    typeof data.summary?.accuracy === "number" &&
    Array.isArray(data.history) &&
    Array.isArray(data.confusion?.disease?.matrix) &&
    Array.isArray(data.confusion?.stage?.matrix) &&
    Array.isArray(data.per_class)
  );
}

export async function loadMetrics(signal: AbortSignal): Promise<Metrics> {
  const response = await fetch("/metrics.json", { signal });
  if (!response.ok) throw new Error(`metrics.json returned ${response.status}`);
  const data: unknown = await response.json();
  if (!isMetrics(data)) throw new Error("metrics.json has the wrong shape");
  return data;
}
