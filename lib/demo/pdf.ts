import { healthLabel, percent, readinessLabel } from "./report";
import type { Photo, Report } from "./types";

const MARGIN = 48;
const IMAGE_WIDTH = 240;

function photoToJpeg(src: string): Promise<{ data: string; ratio: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(image.naturalWidth, 900);
      canvas.height = (canvas.width * image.naturalHeight) / image.naturalWidth;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve({
        data: canvas.toDataURL("image/jpeg", 0.8),
        ratio: canvas.height / canvas.width,
      });
    };
    image.onerror = () => reject(new Error("Photo failed to load"));
    image.src = src;
  });
}

export async function downloadReportPdf(
  report: Report,
  photo: Photo,
  isSample: boolean,
): Promise<void> {
  const [{ jsPDF }, jpeg] = await Promise.all([import("jspdf"), photoToJpeg(photo.src)]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const textWidth = doc.internal.pageSize.getWidth() - MARGIN * 2;
  let y = MARGIN + 16;

  const write = (text: string, size: number, style: "normal" | "bold" = "normal") => {
    doc.setFont("helvetica", style).setFontSize(size);
    const lines: string[] = doc.splitTextToSize(text, textWidth);
    doc.text(lines, MARGIN, y);
    y += lines.length * size * 1.35;
  };
  const block = (title: string, body: string) => {
    y += 8;
    write(title, 10, "bold");
    write(body, 13);
  };

  write("Fasl crop report", 24, "bold");
  if (isSample) write("Sample result: illustrative values, not model output.", 11);
  y += 8;

  const imageHeight = IMAGE_WIDTH * jpeg.ratio;
  doc.addImage(jpeg.data, "JPEG", MARGIN, y, IMAGE_WIDTH, imageHeight);
  y += imageHeight + 12;

  block("Crop", `${report.crop.name} (${percent(report.crop.confidence)} confidence)`);
  block(
    "Growth stage",
    `${report.stage.name}, stage ${report.stage.index} of ${report.stage.total}`,
  );
  block(
    "Harvest readiness",
    report.readiness.daysLeft
      ? `${readinessLabel(report)} (estimate)`
      : readinessLabel(report),
  );

  const details = [
    report.health.severity && `${report.health.severity} severity`,
    report.health.location,
  ].filter(Boolean);
  block(
    "Health",
    details.length > 0
      ? `${healthLabel(report)}: ${details.join(", ")}`
      : healthLabel(report),
  );

  y += 8;
  write("What to do now", 10, "bold");
  report.actions.forEach((action, index) => write(`${index + 1}. ${action}`, 13));

  doc.save("fasl-report.pdf");
}
