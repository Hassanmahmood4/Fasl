import type { Sample } from "./types";

/**
 * Pre-saved results so the demo works offline on stage. These values are
 * illustrative, not model output, and the UI labels them "Sample result".
 */
export const SAMPLES: Sample[] = [
  {
    id: "ripe",
    title: "Healthy wheat, ready to harvest",
    photo: {
      src: "/samples/wheat-ripe.jpg",
      alt: "Golden, ripe wheat ears against a deep blue sky",
      credit: "Photo: Unsplash",
    },
    report: {
      crop: { name: "Wheat", confidence: 0.96 },
      stage: { index: 4, name: "Ripening", total: 4, confidence: 0.91 },
      readiness: { ready: true },
      health: { status: "healthy", confidence: 0.93 },
      actions: [
        "Start cutting during the next clear, dry spell.",
        "Book harvest labour and transport now.",
        "Store the grain somewhere dry and off the ground.",
      ],
      heatmapUrl: "/samples/heatmap-ripe.svg",
      urduAudioUrl: "/samples/urdu-ripe.mp3",
    },
  },
  {
    id: "rust",
    title: "Wheat with leaf rust",
    photo: {
      src: "/samples/wheat-leaf-rust.jpg",
      alt: "Green wheat leaves covered in small orange rust pustules",
      credit: "Photo: James Kolmer, USDA ARS (public domain)",
    },
    report: {
      crop: { name: "Wheat", confidence: 0.94 },
      stage: { index: 2, name: "Flowering", total: 4, confidence: 0.84 },
      readiness: { ready: false, daysLeft: [30, 40] },
      health: {
        status: "disease",
        disease: "Leaf rust",
        severity: "moderate",
        location: "Lower leaves",
        confidence: 0.88,
      },
      actions: [
        "Show this report to your agriculture officer today and ask which treatment is approved.",
        "Check neighbouring plots, because rust spreads quickly.",
        "Photograph the same plants again in a few days to see whether it has spread.",
      ],
      heatmapUrl: "/samples/heatmap-rust.svg",
      urduAudioUrl: "/samples/urdu-rust.mp3",
    },
  },
  {
    id: "green",
    title: "Unripe green wheat",
    photo: {
      src: "/samples/wheat-green.jpg",
      alt: "A single green wheat ear in a field near Sukkur, Pakistan",
      credit: "Photo: Muneer ahmed ok, Unsplash",
    },
    report: {
      crop: { name: "Wheat", confidence: 0.95 },
      stage: { index: 2, name: "Flowering", total: 4, confidence: 0.86 },
      readiness: { ready: false, daysLeft: [30, 40] },
      health: { status: "healthy", confidence: 0.9 },
      actions: [
        "Don’t cut yet. The grain still has to fill.",
        "Walk the field once a week and look for yellow or orange leaves.",
        "Take a new photo in two weeks to update the estimate.",
      ],
      heatmapUrl: "/samples/heatmap-green.svg",
      urduAudioUrl: "/samples/urdu-green.mp3",
    },
  },
];

/** The hidden fourth case: press U on the photo picker to demo the unclear state. */
export const UNCLEAR_SAMPLE: Sample = {
  id: "unclear",
  title: "Blurry photo",
  photo: {
    src: "/samples/wheat-unclear.jpg",
    alt: "A heavily blurred photo of a green field",
  },
  report: {
    crop: { name: "Wheat", confidence: 0.41 },
    stage: { index: 1, name: "Vegetative", total: 4, confidence: 0.32 },
    readiness: { ready: false },
    health: { status: "healthy", confidence: 0.38 },
    actions: [],
  },
};
