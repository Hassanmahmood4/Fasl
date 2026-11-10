/** Paints the parts of the farm scene that never move, once, onto an offscreen canvas. */

export const SCENE_WIDTH = 1600;
export const SCENE_HEIGHT = 1000;
/** Where the near wheat field begins. */
export const FIELD_TOP = 625;

export type Viewport = {
  width: number;
  height: number;
  dpr: number;
  scale: number;
  originX: number;
  originY: number;
};

export type Rng = () => number;

export function createRng(seed: number): Rng {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bare ground the standing wheat must not grow on. */
export const CLEARINGS = [
  { x: 560, y: 775, rx: 225, ry: 62 },
  { x: 1030, y: 748, rx: 165, ry: 50 },
];

/** The dirt track, sampled from the near edge to the village. */
export function pathPoint(t: number): { x: number; y: number; width: number } {
  const u = 1 - t;
  const x = u * u * u * 560 + 3 * u * u * t * 860 + 3 * u * t * t * 800 + t * t * t * 1130;
  const y = u * u * u * 1010 + 3 * u * u * t * 880 + 3 * u * t * t * 680 + t * t * t * 505;
  return { x, y, width: 44 * u + 4 };
}

/** Cut edges wander, so clearings never read as neat ovals. */
function clearingEdge(angle: number, seed: number): number {
  return 1 + 0.2 * Math.sin(angle * 3 + seed) + 0.1 * Math.sin(angle * 7 + seed * 2.3) + 0.05 * Math.sin(angle * 17 + seed);
}

export function isClearGround(x: number, y: number): boolean {
  for (const c of CLEARINGS) {
    const dx = (x - c.x) / c.rx;
    const dy = (y - c.y) / c.ry;
    if (Math.hypot(dx, dy) < clearingEdge(Math.atan2(dy, dx), c.x)) return true;
  }
  for (let t = 0; t <= 1; t += 0.02) {
    const p = pathPoint(t);
    if (Math.abs(y - p.y) < 14 && Math.abs(x - p.x) < p.width * 0.75) return true;
  }
  return false;
}

function peak(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  x: number,
  top: number,
  halfWidth: number,
  base: number,
  light: string,
  shade: string,
): void {
  const jag = (from: [number, number], to: [number, number], steps: number) => {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const wobble = i === steps ? 0 : (rng() - 0.5) * 16;
      ctx.lineTo(from[0] + (to[0] - from[0]) * t + wobble, from[1] + (to[1] - from[1]) * t + wobble * 0.6);
    }
  };

  // Shaded side, then the side catching the low sun.
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(x, top);
  jag([x, top], [x - halfWidth, base], 7);
  ctx.lineTo(x + halfWidth * 0.2, base);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(x, top);
  jag([x, top], [x + halfWidth, base], 7);
  ctx.lineTo(x + halfWidth * 0.1, base);
  jag([x + halfWidth * 0.1, base], [x, top], 6);
  ctx.closePath();
  ctx.fill();

  // Snow cap, with teeth running down the gullies.
  const capHeight = (base - top) * 0.42;
  const spread = halfWidth * 0.42;
  ctx.fillStyle = "#F6F8FA";
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x + spread, top + capHeight);
  for (let i = 0; i < 6; i++) {
    const sx = x + spread - ((i + 1) * spread * 2) / 6;
    const drop = i % 2 === 0 ? capHeight * (0.45 + rng() * 0.25) : capHeight * (0.95 + rng() * 0.25);
    ctx.lineTo(sx, top + drop);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(143,163,189,0.55)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const offset = (rng() - 0.5) * spread;
    ctx.beginPath();
    ctx.moveTo(x + offset * 0.3, top + capHeight * 0.3);
    ctx.lineTo(x + offset, top + capHeight * (0.8 + rng() * 0.4));
    ctx.stroke();
  }
}

function ridge(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  base: number,
  amplitude: number,
  colour: string,
  bottom: number,
): void {
  const a = rng() * 6;
  const b = rng() * 6;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(-20, bottom);
  for (let x = -20; x <= SCENE_WIDTH + 20; x += 14) {
    const y =
      base -
      amplitude * (0.55 * Math.sin(x * 0.0045 + a) + 0.3 * Math.sin(x * 0.011 + b) + 0.15 * Math.sin(x * 0.031 + a));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(SCENE_WIDTH + 20, bottom);
  ctx.closePath();
  ctx.fill();
}

function tree(ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, size: number): void {
  ctx.fillStyle = "#5B4A36";
  ctx.fillRect(x - size * 0.06, y - size * 0.55, size * 0.12, size * 0.55);
  const greens = ["#3F6543", "#4E7A4B", "#5F8C53"];
  for (let i = 0; i < 16; i++) {
    const angle = rng() * Math.PI * 2;
    const r = rng() * size * 0.42;
    ctx.fillStyle = greens[Math.floor(rng() * greens.length)];
    ctx.beginPath();
    ctx.ellipse(
      x + Math.cos(angle) * r,
      y - size * 0.82 + Math.sin(angle) * r * 0.62,
      size * (0.12 + rng() * 0.12),
      size * (0.1 + rng() * 0.08),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

function poplar(ctx: CanvasRenderingContext2D, x: number, y: number, height: number): void {
  ctx.fillStyle = "#47704A";
  ctx.beginPath();
  ctx.ellipse(x, y - height * 0.55, height * 0.11, height * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(122,160,94,0.65)";
  ctx.beginPath();
  ctx.ellipse(x + height * 0.03, y - height * 0.6, height * 0.05, height * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
}

function house(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = "#C9A47A";
  ctx.fillRect(x, y - h, w, h);
  ctx.fillStyle = "#AD8760";
  ctx.fillRect(x + w, y - h, w * 0.32, h);
  ctx.fillStyle = "#8D6C4C";
  ctx.fillRect(x - 2, y - h - 3, w + w * 0.32 + 4, 4);
  ctx.fillStyle = "#6D4F35";
  ctx.fillRect(x + w * 0.38, y - h * 0.62, w * 0.2, h * 0.62);
  ctx.fillStyle = "#4C8A8A";
  ctx.fillRect(x + w * 0.12, y - h * 0.68, w * 0.14, h * 0.26);
}

function mosque(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "#F5EFE2";
  ctx.fillRect(x - 40, y - 30, 80, 30);
  ctx.fillStyle = "#DDD3BF";
  ctx.fillRect(x + 40, y - 30, 12, 30);
  ctx.fillStyle = "#8C7B5E";
  for (const offset of [-26, -6, 14]) {
    ctx.beginPath();
    ctx.moveTo(x + offset, y);
    ctx.ellipse(x + offset + 6, y - 14, 6, 11, 0, Math.PI, 0);
    ctx.lineTo(x + offset + 12, y);
    ctx.lineTo(x + offset, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#4F9A7C";
  ctx.beginPath();
  ctx.ellipse(x, y - 34, 24, 26, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#6DB596";
  ctx.beginPath();
  ctx.ellipse(x - 7, y - 40, 8, 14, 0.3, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [-48, 58]) {
    ctx.fillStyle = "#F5EFE2";
    ctx.fillRect(x + side, y - 78, 8, 78);
    ctx.fillStyle = "#4F9A7C";
    ctx.beginPath();
    ctx.ellipse(x + side + 4, y - 79, 6, 9, 0, Math.PI, 0);
    ctx.fill();
  }
}

function haystack(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.fillStyle = "#D8B566";
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.quadraticCurveTo(x - size * 0.7, y - size * 1.2, x, y - size * 1.5);
  ctx.quadraticCurveTo(x + size * 0.7, y - size * 1.2, x + size, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(143,104,44,0.45)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    ctx.beginPath();
    ctx.moveTo(x - size * (1 - t * 0.8), y - size * 1.4 * t);
    ctx.quadraticCurveTo(x, y - size * 1.25 * t + 3, x + size * (1 - t * 0.8), y - size * 1.4 * t);
    ctx.stroke();
  }
}

function farPatch(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  points: [number, number][],
  colour: string,
  rowColour: string,
): void {
  ctx.save();
  ctx.beginPath();
  points.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.clip();
  // Crop rows run towards the same vanishing point.
  ctx.strokeStyle = rowColour;
  ctx.lineWidth = 1.5;
  for (let x = -1400; x < 3000; x += 24 + rng() * 6) {
    ctx.beginPath();
    ctx.moveTo(800, 440);
    ctx.lineTo(x, 760);
    ctx.stroke();
  }
  ctx.restore();
}

function paintScene(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(1947);

  // Karakoram skyline.
  const peaks: [number, number, number][] = [
    [120, 345, 240], [430, 300, 280], [760, 335, 260], [1080, 285, 300], [1430, 325, 270], [280, 360, 200], [1250, 365, 200], [620, 380, 180], [930, 385, 170],
  ];
  for (const [x, top, halfWidth] of peaks) {
    peak(ctx, rng, x, top, halfWidth, 500, "#B9C8DB", "#8FA3BF");
  }

  ridge(ctx, rng, 448, 26, "#8DA7A6", 560);
  ridge(ctx, rng, 470, 18, "#7C9E83", 560);

  // Plain, then the patchwork running to the horizon.
  const plain = ctx.createLinearGradient(0, 470, 0, FIELD_TOP + 40);
  plain.addColorStop(0, "#A9B86B");
  plain.addColorStop(1, "#8FA650");
  ctx.fillStyle = plain;
  ctx.fillRect(-20, 468, SCENE_WIDTH + 40, FIELD_TOP - 428);

  farPatch(ctx, rng, [[-20, 500], [420, 490], [300, 560], [-20, 590]], "#E6C63E", "rgba(190,150,30,0.45)");
  farPatch(ctx, rng, [[420, 490], [760, 485], [720, 560], [300, 560]], "#7EA64E", "rgba(62,106,48,0.5)");
  farPatch(ctx, rng, [[760, 485], [1010, 490], [1100, 560], [720, 560]], "#D8B85C", "rgba(160,120,40,0.4)");
  farPatch(ctx, rng, [[-20, 590], [300, 560], [250, 640], [-20, 650]], "#7F9F49", "rgba(62,106,48,0.5)");
  // The ploughed strip the ox team works along.
  farPatch(ctx, rng, [[300, 560], [1100, 560], [1200, 640], [250, 640]], "#A08057", "rgba(92,66,40,0.5)");
  farPatch(ctx, rng, [[1100, 560], [1620, 545], [1620, 650], [1200, 640]], "#E6C63E", "rgba(190,150,30,0.45)");

  // Irrigation canal.
  ctx.strokeStyle = "#5E8FA8";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(1020, 492);
  ctx.quadraticCurveTo(1240, 520, 1620, 560);
  ctx.stroke();
  ctx.strokeStyle = "#A9D0DE";
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Tree line along the horizon.
  for (let x = -10; x < SCENE_WIDTH; x += 30 + rng() * 50) {
    if (rng() < 0.35) poplar(ctx, x, 494, 62 + rng() * 34);
    else tree(ctx, rng, x, 494, 44 + rng() * 34);
  }

  // Village.
  house(ctx, 1120, 505, 54, 28);
  house(ctx, 1320, 512, 62, 32);
  house(ctx, 1405, 516, 46, 26);
  mosque(ctx, 1235, 508);
  house(ctx, 1180, 516, 44, 22);
  house(ctx, 1282, 520, 42, 22);
  tree(ctx, rng, 1475, 522, 76);
  tree(ctx, rng, 1085, 512, 62);
  haystack(ctx, 1040, 530, 22);
  haystack(ctx, 1500, 540, 26);
  haystack(ctx, 180, 545, 20);

  // Near wheat ground, brushed so it reads as paint rather than a flat fill.
  const ground = ctx.createLinearGradient(0, FIELD_TOP, 0, SCENE_HEIGHT);
  ground.addColorStop(0, "#D8B05A");
  ground.addColorStop(1, "#AD8233");
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.moveTo(-20, FIELD_TOP + 14);
  ctx.quadraticCurveTo(500, FIELD_TOP - 14, SCENE_WIDTH + 20, FIELD_TOP + 8);
  ctx.lineTo(SCENE_WIDTH + 20, SCENE_HEIGHT + 20);
  ctx.lineTo(-20, SCENE_HEIGHT + 20);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 3800; i++) {
    const y = FIELD_TOP + 8 + rng() * (SCENE_HEIGHT - FIELD_TOP);
    const x = rng() * SCENE_WIDTH;
    const depth = (y - FIELD_TOP) / (SCENE_HEIGHT - FIELD_TOP);
    ctx.strokeStyle = ["rgba(240,208,130,0.5)", "rgba(150,106,40,0.4)", "rgba(226,186,104,0.5)"][i % 3];
    ctx.lineWidth = 1 + depth;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rng() - 0.5) * 5, y - 7 - depth * 16);
    ctx.stroke();
  }

  // Bund: the raised earth bank the walker follows.
  ctx.strokeStyle = "#B99A68";
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-20, 654);
  ctx.quadraticCurveTo(800, 650, SCENE_WIDTH + 20, 654);
  ctx.stroke();
  ctx.strokeStyle = "#D2B98B";
  ctx.lineWidth = 5;
  ctx.stroke();

  // Harvested clearings: stubble, and sheaves stacked by the crew.
  for (const c of CLEARINGS) {
    ctx.fillStyle = "#E3C98F";
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      const edge = clearingEdge(a, c.x);
      ctx.lineTo(c.x + Math.cos(a) * edge * c.rx, c.y + Math.sin(a) * edge * c.ry);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(160,124,62,0.7)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 240; i++) {
      const angle = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * 0.96;
      const x = c.x + Math.cos(angle) * r * c.rx;
      const y = c.y + Math.sin(angle) * r * c.ry;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 2, y - 5);
      ctx.stroke();
    }
  }

  // Dirt track.
  ctx.fillStyle = "#E4D2A9";
  ctx.beginPath();
  const samples = 40;
  for (let i = 0; i <= samples; i++) {
    const p = pathPoint(i / samples);
    if (i === 0) ctx.moveTo(p.x - p.width, p.y);
    else ctx.lineTo(p.x - p.width, p.y);
  }
  for (let i = samples; i >= 0; i--) {
    const p = pathPoint(i / samples);
    ctx.lineTo(p.x + p.width, p.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(168,136,88,0.5)";
  for (let i = 0; i < 300; i++) {
    const p = pathPoint(rng());
    ctx.beginPath();
    ctx.ellipse(p.x + (rng() - 0.5) * p.width * 1.7, p.y, 1 + rng() * 2.4, 0.7 + rng(), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sheaves waiting to be carried.
  for (const [x, y, s] of [[420, 790, 1.2], [352, 760, 1], [478, 742, 0.9], [920, 725, 0.9], [1130, 768, 1.1]] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    for (let i = -7; i <= 7; i++) {
      ctx.strokeStyle = i % 2 === 0 ? "#C99B45" : "#E4BF6C";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(i * 2.1, 0);
      ctx.quadraticCurveTo(i * 0.4, -18, i * 2.4, -40);
      ctx.stroke();
    }
    ctx.strokeStyle = "#7A5A26";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, -18);
    ctx.lineTo(6, -18);
    ctx.stroke();
    ctx.restore();
  }
}

export function createBackdrop(view: Viewport): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(view.width * view.dpr);
  canvas.height = Math.round(view.height * view.dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // The sky fades up to the tint of the model section, so that section runs straight into it.
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  const horizon = view.originY + 500 * view.scale;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#F7EDD8");
  sky.addColorStop(0.45, "#E9F2F4");
  sky.addColorStop(0.8, "#D6E7EE");
  sky.addColorStop(1, "#FBEFD4");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.setTransform(
    view.scale * view.dpr,
    0,
    0,
    view.scale * view.dpr,
    view.originX * view.dpr,
    view.originY * view.dpr,
  );

  const sun = ctx.createRadialGradient(1120, 400, 10, 1120, 400, 460);
  sun.addColorStop(0, "rgba(255,238,190,0.95)");
  sun.addColorStop(0.3, "rgba(255,232,170,0.45)");
  sun.addColorStop(1, "rgba(255,232,170,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(500, -80, 1240, 960);

  paintScene(ctx);
  return canvas;
}
