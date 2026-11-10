/** Canvas rendering for a WheatField. */

import { BUCKETS, NODES, type WheatField } from "./field";

const WHEAT = [0xe3, 0xc0, 0x7e] as const;
const WHEAT_DEEP = [0xb8, 0x89, 0x3d] as const;

const EAR_WIDTH = 28;
const EAR_HEIGHT = 66;

/** How far each layer leans towards wheat-deep: back is shaded, front is bright. */
const LAYER_SHADE = [0.9, 0.45, 0.1];
const BUCKET_SHIFT = [-0.08, 0, 0.08];

/** Nodes skipped for stalks at rest; only stalks near the cursor need full detail. */
const REST_STEP = 3;

function mix(amount: number): string {
  const t = Math.min(1, Math.max(0, amount));
  const channel = (i: number) =>
    Math.round(WHEAT[i] + (WHEAT_DEEP[i] - WHEAT[i]) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

function drawGrain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  fill: string,
  outline: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(0, -24);
  ctx.stroke();

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function createEarSprite(shade: number, dpr: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(EAR_WIDTH * dpr);
  canvas.height = Math.ceil(EAR_HEIGHT * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.scale(dpr, dpr);
  ctx.translate(EAR_WIDTH / 2, EAR_HEIGHT - 1);

  const fill = mix(shade);
  const outline = mix(Math.min(1, shade + 0.5));
  const rows = 7;
  for (let row = 0; row < rows; row++) {
    const y = -5 - row * 5;
    drawGrain(ctx, -3.2, y, -0.28, fill, outline);
    drawGrain(ctx, 3.2, y, 0.28, fill, outline);
  }
  drawGrain(ctx, 0, -5 - rows * 5, 0, fill, outline);
  return canvas;
}

export type EarSprites = HTMLCanvasElement[][];

/** Grains are cached as images: drawing thousands of ellipses per frame is too slow. */
export function createEarSprites(dpr: number): EarSprites {
  return LAYER_SHADE.map((shade) =>
    BUCKET_SHIFT.map((shift) => createEarSprite(shade + shift, dpr)),
  );
}

function traceStem(
  ctx: CanvasRenderingContext2D,
  f: WheatField,
  s: number,
  step: number,
): void {
  const base = s * NODES;
  const last = NODES - 1;
  ctx.moveTo(f.x[base], f.y[base]);

  let previous = 0;
  for (let n = step; n < last; n += step) {
    const next = Math.min(n + step, last);
    const px = f.x[base + n];
    const py = f.y[base + n];
    ctx.quadraticCurveTo(
      px,
      py,
      (px + f.x[base + next]) / 2,
      (py + f.y[base + next]) / 2,
    );
    previous = n;
  }
  if (previous !== last) ctx.lineTo(f.x[base + last], f.y[base + last]);
}

export function drawField(
  ctx: CanvasRenderingContext2D,
  f: WheatField,
  sprites: EarSprites,
  dpr: number,
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, f.width, f.height);
  ctx.lineCap = "round";

  f.layers.forEach((layer, layerIndex) => {
    ctx.lineWidth = layer.stemWidth;
    for (let bucket = 0; bucket < BUCKETS; bucket++) {
      ctx.strokeStyle = mix(LAYER_SHADE[layerIndex] + BUCKET_SHIFT[bucket]);
      ctx.beginPath();
      for (let s = layer.start; s < layer.end; s++) {
        if (f.bucket[s] === bucket) {
          traceStem(ctx, f, s, f.active[s] ? 1 : REST_STEP);
        }
      }
      ctx.stroke();
    }

    for (let s = layer.start; s < layer.end; s++) {
      const tip = s * NODES + NODES - 1;
      const x = f.x[tip];
      const y = f.y[tip];
      if (y < -4 || x < -EAR_HEIGHT || x > f.width + EAR_HEIGHT) continue;

      const angle = Math.atan2(x - f.x[tip - 1], f.y[tip - 1] - y);
      const scale = f.earSize[s] * dpr;
      const cos = Math.cos(angle) * scale;
      const sin = Math.sin(angle) * scale;
      ctx.setTransform(cos, sin, -sin, cos, x * dpr, y * dpr);
      ctx.drawImage(
        sprites[layerIndex][f.bucket[s]],
        -EAR_WIDTH / 2,
        -EAR_HEIGHT,
        EAR_WIDTH,
        EAR_HEIGHT,
      );
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  });
}
