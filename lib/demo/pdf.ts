import type { jsPDF as JsPdf } from "jspdf";
import { perforatedEdge, STAMP_HEIGHT, STAMP_WIDTH } from "@/components/footer/Stamp";
import { healthLabel, percent, readinessLabel, STAGES } from "./report";
import type { Photo, Report, Severity } from "./types";

/* Site palette (tailwind.config.ts). Wheat colours are fills only, never text on white. */
const C = {
  white: "#FFFFFF",
  tint: "#F7EDD8",
  wheat: "#E3C07E",
  deep: "#B8893D",
  black: "#121212",
  charcoal: "#4A4A4A",
};

/* The live site, printed in the footer whichever address the report was saved from. */
const SITE = "fasl-six.vercel.app";

/* A4 in points. */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 40;
/* The page is wheat; the whole report sits on one white card inset from its edge, as on the dashboard. */
const OUTER = 18;
const CONTENT_W = PAGE_W - M * 2;
const FOOTER_H = 74;
const FOOTER_TOP = PAGE_H - M - FOOTER_H - 10;

const SEVERITIES: Severity[] = ["mild", "moderate", "severe"];
const SEVERITY_FILL = [C.tint, C.wheat, C.deep];

/* lucide-react "wheat", the icon the site uses for its bullets. */
const WHEAT_ICON = [
  "M2 22 16 8",
  "M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z",
  "M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z",
  "M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z",
  "M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z",
  "M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z",
  "M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z",
  "M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z",
];

type Raster = { data: string; ratio: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Photo failed to load"));
    image.src = src;
  });
}

function canvas(width: number, height: number) {
  const el = document.createElement("canvas");
  el.width = width;
  el.height = height;
  const ctx = el.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  return { el, ctx };
}

/** The photo cropped to 4:3 with rounded corners, like the dashboard card. */
async function photoTile(src: string): Promise<Raster> {
  const image = await loadImage(src);
  const { el, ctx } = canvas(960, 720);
  const scale = Math.max(el.width / image.naturalWidth, el.height / image.naturalHeight);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.fillStyle = C.white;
  ctx.fillRect(0, 0, el.width, el.height);
  ctx.beginPath();
  ctx.roundRect(0, 0, el.width, el.height, 48);
  ctx.clip();
  ctx.drawImage(image, (el.width - w) / 2, (el.height - h) / 2, w, h);
  return { data: el.toDataURL("image/jpeg", 0.85), ratio: 0.75 };
}

/** The wheat icon as a transparent PNG, in wheat-deep. */
function wheatIcon(): string {
  const { el, ctx } = canvas(96, 96);
  ctx.scale(4, 4);
  ctx.strokeStyle = C.deep;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  WHEAT_ICON.forEach((d) => ctx.stroke(new Path2D(d)));
  return el.toDataURL("image/png");
}

/**
 * The فصل wordmark, drawn with the site's Nastaliq font so the letters join properly
 * (PDF fonts can't shape Urdu). Returns null if the font isn't available.
 */
async function urduMark(colour: string): Promise<Raster | null> {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-nastaliq").trim();
  if (!family) return null;
  const font = `160px ${family}`;
  try {
    await document.fonts.load(font, "فصل");
  } catch {
    return null;
  }
  const { el, ctx } = canvas(520, 400);
  ctx.font = font;
  ctx.direction = "rtl";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = colour;
  ctx.fillText("فصل", 460, 250);

  // Trim to the ink so the mark can be placed exactly.
  const { data } = ctx.getImageData(0, 0, el.width, el.height);
  let top = el.height, bottom = 0, left = el.width, right = 0;
  for (let y = 0; y < el.height; y++) {
    for (let x = 0; x < el.width; x++) {
      if (data[(y * el.width + x) * 4 + 3] > 10) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (bottom <= top) return null;
  const pad = 4;
  const trimmed = canvas(right - left + pad * 2, bottom - top + pad * 2);
  trimmed.ctx.drawImage(el, left - pad, top - pad, trimmed.el.width, trimmed.el.height, 0, 0, trimmed.el.width, trimmed.el.height);
  return { data: trimmed.el.toDataURL("image/png"), ratio: trimmed.el.height / trimmed.el.width };
}

function cssFont(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * The site footer's logo: wheat stamp, "Made in Pakistan" postmark and the فصل wordmark,
 * drawn the same way as components/footer/Stamp.tsx. Returns null if a font or photo fails.
 */
async function stampLogo(): Promise<Raster | null> {
  const figtree = cssFont("--font-figtree");
  const nastaliq = cssFont("--font-nastaliq");
  if (!figtree || !nastaliq) return null;
  let photo: HTMLImageElement;
  try {
    [photo] = await Promise.all([
      loadImage("/samples/wheat-ripe.jpg"),
      document.fonts.load(`600 9px ${figtree}`),
      document.fonts.load(`700 12px ${figtree}`),
      document.fonts.load(`64px ${nastaliq}`, "فصل"),
    ]);
  } catch {
    return null;
  }

  // Laid out in CSS pixels as on the site, drawn at 4x.
  const S = 4;
  const W = 356;
  const H = 150;
  const { el, ctx } = canvas(W * S, H * S);
  ctx.scale(S, S);
  const deg = Math.PI / 180;

  // Stamp: 136px tall, tilted -3deg, with a soft drop shadow.
  const k = 136 / (STAMP_HEIGHT + 12);
  const stampW = (STAMP_WIDTH + 12) * k;
  ctx.save();
  ctx.translate(6 + stampW / 2, 7 + 68);
  ctx.rotate(-3 * deg);
  ctx.translate(-stampW / 2, -68);
  ctx.scale(k, k);
  ctx.translate(6, 6);
  ctx.shadowColor = "rgba(90,64,20,0.22)";
  ctx.shadowBlur = 6 * S;
  ctx.shadowOffsetY = 3 * S;
  ctx.fillStyle = C.white;
  ctx.fill(new Path2D(perforatedEdge()));
  ctx.shadowColor = "transparent";
  ctx.beginPath();
  ctx.roundRect(12, 12, STAMP_WIDTH - 24, STAMP_HEIGHT - 24, 2);
  ctx.clip();
  const winW = STAMP_WIDTH - 24;
  const winH = STAMP_HEIGHT - 24;
  const cover = Math.max(winW / photo.naturalWidth, winH / photo.naturalHeight);
  const pw = photo.naturalWidth * cover;
  const ph = photo.naturalHeight * cover;
  ctx.drawImage(photo, 12 + (winW - pw) / 2, 12 + (winH - ph) / 2, pw, ph);
  ctx.restore();

  // Postmark: 112 x 62, tilted 9deg, charcoal at 80%.
  ctx.save();
  ctx.translate(6 + 96 + 56, 7 + 62 + 31);
  ctx.rotate(9 * deg);
  ctx.translate(-56, -31);
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = C.charcoal;
  ctx.fillStyle = C.charcoal;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(1.5, 1.5, 109, 59, 3);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(1.5, 20.5);
  ctx.lineTo(110.5, 20.5);
  ctx.moveTo(1.5, 41.5);
  ctx.lineTo(110.5, 41.5);
  ctx.stroke();
  ctx.textAlign = "center";
  const spaced = (text: string, font: string, spacing: number, x: number, y: number) => {
    ctx.font = font;
    ctx.letterSpacing = `${spacing}px`;
    ctx.fillText(text, x + spacing / 2, y);
  };
  spaced("MADE IN", `600 9px ${figtree}`, 1.6, 56, 15);
  spaced("PAKISTAN", `700 12px ${figtree}`, 1, 56, 35);
  spaced("2026", `600 9px ${figtree}`, 1.6, 72, 55);
  ctx.letterSpacing = "0px";
  ctx.font = `9px ${nastaliq}`;
  ctx.direction = "rtl";
  ctx.fillText("فصل", 38, 54);
  ctx.restore();

  // Wordmark to the right, as in the footer.
  ctx.font = `64px ${nastaliq}`;
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = C.black;
  ctx.fillText("فصل", W - 6, 92);

  return { data: el.toDataURL("image/png"), ratio: H / W };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export async function downloadReportPdf(report: Report, photo: Photo, isSample: boolean): Promise<void> {
  const [{ jsPDF }, tile, markBlack] = await Promise.all([
    import("jspdf"),
    photoTile(photo.src),
    urduMark(C.black),
  ]);
  const icon = wheatIcon();
  const doc: JsPdf = new jsPDF({ unit: "pt", format: "a4" });
  const today = formatDate(new Date());

  const font = (size: number, style: "normal" | "bold" = "normal", colour = C.black) =>
    doc.setFont("helvetica", style).setFontSize(size).setTextColor(colour);
  const fill = (colour: string) => doc.setFillColor(colour);
  const label = (text: string, x: number, y: number) => {
    font(8.5, "bold", C.charcoal);
    doc.text(text.toUpperCase(), x, y, { charSpace: 0.8 });
  };
  const mark = (raster: Raster | null, x: number, y: number, height: number, fallbackColour: string) => {
    if (raster) {
      doc.addImage(raster.data, "PNG", x, y, height / raster.ratio, height);
      return height / raster.ratio;
    }
    font(height * 0.8, "bold", fallbackColour);
    doc.text("Fasl", x, y + height * 0.8);
    return doc.getTextWidth("Fasl");
  };

  /* Wheat page with one white card for the whole report, then the header: wordmark, title and date. */
  const drawHeader = () => {
    fill(C.wheat);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
    fill(C.white);
    doc.roundedRect(OUTER, OUTER, PAGE_W - OUTER * 2, PAGE_H - OUTER * 2, 20, 20, "F");
    mark(markBlack, M, M - 1, 30, C.black);
    font(10, "bold", C.black);
    doc.text("Crop report", PAGE_W - M, M + 12, { align: "right" });
    font(8.5, "normal", C.charcoal);
    doc.text(today, PAGE_W - M, M + 24, { align: "right" });
  };

  /* Footer: the wheat-tint card from the site footer. */
  const drawFooter = (page: number, pages: number) => {
    fill(C.tint);
    doc.roundedRect(M, FOOTER_TOP, CONTENT_W, FOOTER_H, 16, 16, "F");
    const markW = mark(markBlack, M + 18, FOOTER_TOP + 14, 26, C.black);
    font(10.5, "bold");
    doc.text("Know your crop from one photo.", M + 18 + markW + 12, FOOTER_TOP + 26);
    font(8, "normal", C.charcoal);
    doc.text(
      doc.splitTextToSize(
        "Fasl reads one photo with a machine-learning model. It is guidance, not a final diagnosis: confirm with your local agriculture extension officer before spraying or harvesting.",
        CONTENT_W - 36,
      ),
      M + 18,
      FOOTER_TOP + 50,
    );
    doc.addImage(icon, "PNG", M + 18, FOOTER_TOP + FOOTER_H + 8, 9, 9);
    font(7.5, "normal", C.charcoal);
    doc.text(`Fasl, made in Pakistan · ${SITE}`, M + 31, FOOTER_TOP + FOOTER_H + 15);
    if (pages > 1) doc.text(`Page ${page} of ${pages}`, PAGE_W - M, FOOTER_TOP + FOOTER_H + 15, { align: "right" });
  };

  let y = M + 76;
  /** Starts a new page when the next piece won't fit above the footer. */
  const room = (height: number) => {
    if (y + height <= FOOTER_TOP - 16) return;
    doc.addPage();
    drawHeader();
    y = M + 68;
  };

  drawHeader();

  /* Title row. */
  font(26, "bold");
  doc.text("Your crop report", M, y);
  if (isSample) {
    font(9, "bold");
    const w = doc.getTextWidth("Sample result") + 22;
    fill(C.wheat);
    doc.roundedRect(PAGE_W - M - w, y - 16, w, 20, 10, 10, "F");
    doc.text("Sample result", PAGE_W - M - w / 2, y - 3, { align: "center" });
  }
  y += 22;

  /* Photo beside crop and health, as on the dashboard. */
  const photoW = 214;
  const photoH = photoW * tile.ratio;
  doc.addImage(tile.data, "JPEG", M, y, photoW, photoH);

  const colX = M + photoW + 26;
  const colW = PAGE_W - M - colX;
  let cy = y + 8;

  label("Crop", colX, cy);
  cy += 20;
  font(17, "bold");
  doc.text(report.crop.name, colX, cy);
  font(11, "bold");
  doc.text(percent(report.crop.confidence), colX + colW, cy, { align: "right" });
  cy += 10;
  fill(C.tint);
  doc.roundedRect(colX, cy, colW, 7, 3.5, 3.5, "F");
  fill(C.wheat);
  doc.roundedRect(colX, cy, Math.max(7, colW * report.crop.confidence), 7, 3.5, 3.5, "F");
  cy += 34;

  label("Health", colX, cy);
  cy += 20;
  font(17, "bold");
  const healthLines: string[] = doc.splitTextToSize(healthLabel(report), colW);
  doc.text(healthLines, colX, cy);
  cy += (healthLines.length - 1) * 20 + 10;
  const { severity, location } = report.health;
  if (severity) {
    const level = SEVERITIES.indexOf(severity);
    const segW = (colW - 8) / 3;
    SEVERITIES.forEach((_, i) => {
      doc.setDrawColor(C.deep).setLineWidth(0.8);
      fill(i <= level ? SEVERITY_FILL[i] : C.white);
      doc.roundedRect(colX + i * (segW + 4), cy, segW, 8, 4, 4, "FD");
    });
    cy += 24;
    font(10.5, "bold");
    doc.text(`${severity[0].toUpperCase()}${severity.slice(1)} severity`, colX, cy);
    cy += 4;
  }
  if (location) {
    cy += 14;
    font(10.5, "normal", C.charcoal);
    doc.text(`Seen on: ${location}`, colX, cy);
  }

  y = Math.max(y + photoH, cy) + 30;

  /* Growth stage pills. */
  room(60);
  label("Growth stage", M, y);
  y += 10;
  const gap = 4;
  const pillW = (CONTENT_W - gap * (STAGES.length - 1)) / STAGES.length;
  STAGES.forEach((name, i) => {
    const current = i + 1 === report.stage.index;
    fill(current ? C.wheat : C.tint);
    doc.roundedRect(M + i * (pillW + gap), y, pillW, 30, 8, 8, "F");
    font(10, current ? "bold" : "normal", current ? C.black : C.charcoal);
    doc.text(name, M + i * (pillW + gap) + pillW / 2, y + 19, { align: "center" });
  });
  y += 30 + 14;
  font(9, "normal", C.charcoal);
  doc.text(`Stage ${report.stage.index} of ${report.stage.total}, ${percent(report.stage.confidence)} confidence`, M, y);
  y += 30;

  /* Harvest readiness: the wheat box. */
  room(80);
  label("Harvest readiness", M, y);
  y += 10;
  font(19, "bold");
  const readiness = readinessLabel(report);
  const boxW = Math.min(CONTENT_W, doc.getTextWidth(readiness) + 36);
  fill(C.wheat);
  doc.roundedRect(M, y, boxW, 40, 10, 10, "F");
  doc.text(readiness, M + 18, y + 26.5);
  y += 40;
  if (report.readiness.daysLeft) {
    y += 14;
    font(9, "normal", C.charcoal);
    doc.text("Days left is an estimate.", M, y);
  }
  y += 32;

  /* What to do now, with the wheat bullet. */
  if (report.actions.length > 0) {
    room(40);
    label("What to do now", M, y);
    y += 18;
    report.actions.forEach((action) => {
      font(11);
      const lines: string[] = doc.splitTextToSize(action, CONTENT_W - 26);
      const height = lines.length * 15;
      room(height + 6);
      doc.addImage(icon, "PNG", M, y - 10, 13, 13);
      doc.text(lines, M + 24, y, { lineHeightFactor: 1.36 });
      y += height + 8;
    });
  }

  if (isSample) {
    room(24);
    y += 6;
    font(8.5, "normal", C.charcoal);
    doc.text("Sample result: illustrative values, not model output.", M, y);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    drawFooter(page, pages);
  }

  const now = new Date();
  const stamp = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((n) => String(n).padStart(2, "0")).join("-");
  doc.save(`fasl-report-${stamp}.pdf`);
}
