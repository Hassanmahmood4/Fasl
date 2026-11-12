export type Severity = "mild" | "moderate" | "severe";

export type Report = {
  crop: { name: string; confidence: number };
  stage: { index: number; name: string; total: number; confidence: number };
  readiness: { ready: boolean; daysLeft?: [number, number] };
  health: {
    status: "healthy" | "disease";
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
