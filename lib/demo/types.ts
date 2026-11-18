export type Severity = "mild" | "moderate" | "severe";

export type Report = {
  crop: { name: string; confidence: number };
  /** `uncertain`: the model couldn't tell the stage from this photo; the rest of the report still stands. */
  stage: { index: number; name: string; total: number; confidence: number; uncertain?: boolean };
  readiness: { ready: boolean; daysLeft?: [number, number]; uncertain?: boolean };
  health: {
    /** "uncertain": the model couldn't judge health from this photo, so no disease is named. */
    status: "healthy" | "disease" | "uncertain";
    disease?: string;
    severity?: Severity;
    location?: string;
    confidence: number;
  };
  actions: string[];
  urduAudioUrl?: string;
  heatmapUrl?: string;
};

export type AnalysisResult =
  | { kind: "report"; report: Report }
  | { kind: "unclear"; message?: string };

export type Photo = {
  src: string;
  alt: string;
  credit?: string;
};

export type Sample = {
  id: string;
  title: string;
  photo: Photo;
  report: Report;
};
