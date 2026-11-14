/** The animated farm scene: backdrop plus everything that moves, drawn back to front. */

import type { gsap as Gsap } from "gsap";
import {
  createBackdrop,
  createRng,
  FIELD_TOP,
  isClearGround,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  type Viewport,
} from "./backdrop";
import { drawFarmer, drawHeadBundle, drawOx, type Outfit, type Pose } from "./figures";

/** How much of the scene, up from the ground, must show below the panel: the tallest peak (y 285) and a margin. */
const WINDOW_HEIGHT = 730;

export function fitViewport(width: number, height: number, windowPx: number, dpr: number): Viewport {
  const scale = Math.max(width / SCENE_WIDTH, windowPx / WINDOW_HEIGHT);
  return {
    width,
    height,
    dpr,
    scale,
    originX: (width - SCENE_WIDTH * scale) / 2,
    originY: height - SCENE_HEIGHT * scale,
  };
}

const OUTFITS: Record<string, Outfit> = {
  harvester: {
    kameez: "#F3EEE2",
    kameezShade: "#CFC6B2",
    shalwar: "#E6DFCE",
    skin: "#9A6B47",
    headwear: { kind: "pagri", colour: "#B5482F" },
    beard: true,
  },
  gatherer: {
    kameez: "#B23A5E",
    kameezShade: "#8A2A48",
    shalwar: "#E7B64A",
    skin: "#B07D57",
    headwear: { kind: "dupatta", colour: "#E8A33D" },
  },
  winnower: {
    kameez: "#3E7F8C",
    kameezShade: "#2D606B",
    shalwar: "#E8E2D2",
    skin: "#8D5F3F",
    headwear: { kind: "pagri", colour: "#F1ECDF" },
    beard: true,
  },
  walker: {
    kameez: "#2F8F6B",
    kameezShade: "#226C50",
    shalwar: "#F0D9A0",
    skin: "#A87650",
    headwear: { kind: "dupatta", colour: "#D2543A" },
  },
  ploughman: {
    kameez: "#EDE7D8",
    kameezShade: "#C7BEA9",
    shalwar: "#DFD7C4",
    skin: "#8D5F3F",
    headwear: { kind: "pagri", colour: "#3E6D8C" },
  },
};

export type ScenePoses = {
  harvester: Pose;
  gatherer: Pose;
  winnower: Pose;
};

function pose(bend: number, crouch: number, frontArm: [number, number], backArm: [number, number]): Pose {
  return { bend, crouch, stride: 0.2, frontArm, backArm };
}

export function createPoses(): ScenePoses {
  return {
    harvester: pose(0.95, 0.38, [-0.95, 0.1], [-0.45, -0.1]),
    gatherer: pose(0.15, 0.1, [0.35, 0.45], [-0.15, 0.3]),
    winnower: pose(0.08, 0.06, [1.9, 0.7], [1.5, 0.95]),
  };
}

/**
 * The working motions. GSAP only moves plain numbers on the pose objects; the
 * canvas reads them each frame, so nothing here touches layout.
 */
export function createWorkTimelines(g: typeof Gsap, poses: ScenePoses): ReturnType<typeof g.timeline>[] {
  const { harvester, gatherer, winnower } = poses;

  // Reach into the standing crop, then pull the sickle through it.
  const cut = g.timeline({ repeat: -1, defaults: { ease: "sine.inOut" } });
  cut
    .to(harvester, { bend: 1.12, crouch: 0.44, duration: 0.55 }, 0)
    .to(harvester.frontArm, { 0: -0.28, 1: 0.1, duration: 0.55 }, 0)
    .to(harvester.backArm, { 0: -0.72, duration: 0.55 }, 0)
    .to(harvester, { bend: 0.95, crouch: 0.38, duration: 0.8, ease: "power2.out" }, 0.7)
    .to(harvester.frontArm, { 0: -0.95, 1: 0.1, duration: 0.8, ease: "power2.out" }, 0.7)
    .to(harvester.backArm, { 0: -0.45, duration: 0.8, ease: "power2.out" }, 0.7);

  // Stoop, gather a handful, straighten and rest it against the shoulder.
  const gather = g.timeline({ repeat: -1, repeatDelay: 0.5, defaults: { ease: "sine.inOut" } });
  gather
    .to(gatherer, { bend: 0.98, crouch: 0.42, duration: 1.2 }, 0)
    .to(gatherer.frontArm, { 0: -0.68, 1: 0.05, duration: 1.2 }, 0)
    .to(gatherer.backArm, { 0: -0.45, 1: 0.05, duration: 1.2 }, 0)
    .to(gatherer, { bend: 0.15, crouch: 0.1, duration: 1.3 }, 1.8)
    .to(gatherer.frontArm, { 0: 0.35, 1: 0.45, duration: 1.3 }, 1.8)
    .to(gatherer.backArm, { 0: -0.15, 1: 0.3, duration: 1.3 }, 1.8);

  // Lift the basket high and shake it so the grain falls through the breeze.
  const winnow = g.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } });
  winnow
    .to(winnower.frontArm, { 0: 2.25, 1: 0.45, duration: 0.42 }, 0)
    .to(winnower.backArm, { 0: 1.85, 1: 0.7, duration: 0.42 }, 0)
    .to(winnower, { bend: -0.02, duration: 0.42 }, 0);

  return [cut, gather, winnow];
}

type Stalk = { x: number; height: number; phase: number; colour: number };
type Band = { y: number; depth: number; stalks: Stalk[] };

const STEMS = ["#B98C3C", "#CFA24E", "#DDB560"];
const EARS = ["#C4943F", "#DEB25B", "#EFCF85"];

function createBands(): Band[] {
  const rng = createRng(77);
  const bands: Band[] = [];
  for (let y = FIELD_TOP + 72; y <= SCENE_HEIGHT + 30; y += 19) {
    const depth = (y - FIELD_TOP) / (SCENE_HEIGHT - FIELD_TOP);
    const stalks: Stalk[] = [];
    const spacing = 6 + depth * 8;
    for (let x = -30; x < SCENE_WIDTH + 30; x += spacing * (0.65 + rng() * 0.7)) {
      if (isClearGround(x, y)) continue;
      stalks.push({
        x,
        height: (26 + depth * 44) * (0.82 + rng() * 0.34),
        phase: rng() * 0.8,
        colour: Math.floor(rng() * 3),
      });
    }
    bands.push({ y, depth, stalks });
  }
  return bands;
}

function drawBand(ctx: CanvasRenderingContext2D, band: Band, time: number): void {
  const { y, depth, stalks } = band;
  for (let colour = 0; colour < 3; colour++) {
    ctx.strokeStyle = STEMS[colour];
    ctx.lineWidth = 0.9 + depth * 1.1;
    ctx.beginPath();
    for (const s of stalks) {
      if (s.colour !== colour) continue;
      // Gusts roll across the field: neighbours lean together.
      const lean = windLean(s.x, y, time, s.phase) * (6 + depth * 9);
      ctx.moveTo(s.x, y);
      ctx.quadraticCurveTo(s.x, y - s.height * 0.6, s.x + lean, y - s.height);
    }
    ctx.stroke();

    ctx.strokeStyle = EARS[colour];
    ctx.lineWidth = 2.6 + depth * 3;
    ctx.beginPath();
    for (const s of stalks) {
      if (s.colour !== colour) continue;
      const lean = windLean(s.x, y, time, s.phase) * (6 + depth * 9);
      const earLength = 6 + depth * 10;
      ctx.moveTo(s.x + lean, y - s.height);
      ctx.lineTo(s.x + lean * 1.3, y - s.height - earLength);
    }
    ctx.stroke();
  }
}

function windLean(x: number, y: number, time: number, phase: number): number {
  const gust = Math.sin(time * 0.45 - x * 0.003 + y * 0.004);
  return (
    Math.sin(time * 1.3 - x * 0.011 + y * 0.018 + phase) * (0.42 + 0.3 * gust) + 0.35 * gust
  );
}

const CLOUDS = [
  { x: 180, y: 180, s: 1.3, speed: 7 },
  { x: 620, y: 110, s: 0.9, speed: 4.5 },
  { x: 980, y: 230, s: 1.1, speed: 6 },
  { x: 1380, y: 150, s: 1.4, speed: 5 },
];

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  const puffs: [number, number, number, number][] = [
    [-62, 7, 36, 15], [-26, -7, 40, 23], [18, -11, 46, 27], [58, 3, 38, 18], [0, 9, 80, 15],
  ];
  ctx.beginPath();
  for (const [dx, dy, rx, ry] of puffs) {
    ctx.moveTo(x + (dx + rx) * s, y + dy * s);
    ctx.ellipse(x + dx * s, y + dy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
  }
  ctx.fill();
}

function drawClouds(ctx: CanvasRenderingContext2D, time: number): void {
  const span = SCENE_WIDTH + 500;
  for (const c of CLOUDS) {
    const x = ((c.x + time * c.speed + 250) % span) - 250;
    drawCloud(ctx, x, c.y, c.s);
  }
}

function drawBirds(ctx: CanvasRenderingContext2D, time: number): void {
  const span = SCENE_WIDTH + 400;
  const leadX = ((time * 26) % span) - 200;
  const leadY = 300 + Math.sin(time * 0.3) * 24;
  ctx.strokeStyle = "#39424C";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  const flock = [[0, 0], [-30, 13], [-30, -15], [-60, 26], [-58, -26], [-92, 8]];
  flock.forEach(([dx, dy], index) => {
    const flap = Math.sin(time * 7 + index * 1.4) * 5;
    const x = leadX + dx;
    const y = leadY + dy;
    ctx.moveTo(x - 10, y - flap);
    ctx.quadraticCurveTo(x - 4, y - 2 - flap * 0.2, x, y);
    ctx.quadraticCurveTo(x + 4, y - 2 - flap * 0.2, x + 10, y - flap);
  });
  ctx.stroke();
}

/** Cooking smoke from the village, rising and spreading on the breeze. */
function drawSmoke(ctx: CanvasRenderingContext2D, time: number): void {
  for (const [originX, originY] of [[1346, 478], [1148, 476]]) {
    for (let i = 0; i < 12; i++) {
      const life = (time * 0.09 + i / 12) % 1;
      const x = originX + life * life * 70 + Math.sin(life * 7 + i) * 5;
      const y = originY - life * 95;
      ctx.fillStyle = `rgba(245,245,240,${0.42 * (1 - life)})`;
      ctx.beginPath();
      ctx.arc(x, y, 3 + life * 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCanalGlints(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 1.7;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const flow = ((i / 16 + time * 0.018) % 1);
    const u = 1 - flow;
    const x = u * u * 1020 + 2 * u * flow * 1240 + flow * flow * 1620;
    const y = u * u * 492 + 2 * u * flow * 520 + flow * flow * 560;
    if (Math.sin(time * 3 + i * 2.1) > 0.1) {
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y);
    }
  }
  ctx.stroke();
}

function drawPloughTeam(ctx: CanvasRenderingContext2D, time: number): void {
  // Up and down the strip, turning at each headland.
  const lane = 620;
  const trip = 34;
  const phase = (time % (trip * 2)) / trip;
  const forward = phase < 1;
  const t = forward ? phase : 2 - phase;
  const eased = t * t * (3 - 2 * t);
  const x = 380 + lane * eased;
  const y = 598;
  const facing: 1 | -1 = forward ? 1 : -1;
  const gait = time * 2.5;
  const scale = 0.62;

  drawOx(ctx, x + facing * 8, y - 8, scale, facing, gait + 1.1, "#CFC6B4");
  drawOx(ctx, x, y, scale, facing, gait, "#EDE7D9");

  ctx.strokeStyle = "#5C4128";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  const hitch = x - facing * 18;
  const blade = x - facing * 70;
  ctx.beginPath();
  ctx.moveTo(hitch, y - 26);
  ctx.lineTo(blade, y + 1);
  ctx.moveTo(blade, y + 1);
  ctx.lineTo(blade - facing * 17, y - 25);
  ctx.stroke();

  const stride = Math.sin(gait) * 0.32;
  drawFarmer(
    ctx,
    x - facing * 94,
    y + 1,
    0.62,
    facing,
    { bend: 0.22, crouch: 0.05, stride, frontArm: [0.95, 0.1], backArm: [0.8, 0.2] },
    OUTFITS.ploughman,
    "none",
    time,
  );
}

function drawWalker(ctx: CanvasRenderingContext2D, time: number): void {
  const trip = 58;
  const phase = (time % (trip * 2)) / trip;
  const forward = phase < 1;
  const t = forward ? phase : 2 - phase;
  const x = 120 + t * 1360;
  const y = 652;
  const facing: 1 | -1 = forward ? 1 : -1;
  const gait = time * 3.6;
  const stride = Math.sin(gait) * 0.42;
  const scale = 0.82;
  const bob = Math.abs(Math.sin(gait)) * -1.6;

  drawFarmer(
    ctx,
    x,
    y + bob,
    scale,
    facing,
    { bend: 0.02, crouch: 0.08, stride, frontArm: [2.55, 0.4], backArm: [-stride * 0.8, 0.25] },
    OUTFITS.walker,
    "none",
    time,
  );
  drawHeadBundle(ctx, x + facing * 1.4, y - 95 * scale, scale, bob);
}

function drawGrainFall(ctx: CanvasRenderingContext2D, x: number, top: number, ground: number, time: number): void {
  ctx.fillStyle = "#F6DE9C";
  ctx.beginPath();
  for (let i = 0; i < 46; i++) {
    const life = (time * 0.75 + i / 46) % 1;
    const drift = life * life * 58 + Math.sin(i * 12.9) * 6;
    const px = x + drift;
    const py = top + (ground - top) * life * life + Math.sin(i * 7.3) * 2;
    const r = i % 5 === 0 ? 0.8 : 1.5;
    ctx.moveTo(px + r, py);
    ctx.arc(px, py, r, 0, Math.PI * 2);
  }
  ctx.fill();
  // Lighter chaff carries further downwind.
  ctx.fillStyle = "rgba(246,226,170,0.5)";
  ctx.beginPath();
  for (let i = 0; i < 30; i++) {
    const life = (time * 0.42 + i / 30) % 1;
    const px = x + life * 170 + Math.sin(i * 5.1 + time) * 7;
    const py = top + (ground - top - 24) * life + Math.sin(i * 9.7) * 13;
    ctx.moveTo(px + 1.2, py);
    ctx.arc(px, py, 1.2, 0, Math.PI * 2);
  }
  ctx.fill();
}

export type FarmScene = {
  view: Viewport;
  backdrop: HTMLCanvasElement;
  bands: Band[];
};

export function createFarmScene(view: Viewport): FarmScene {
  return { view, backdrop: createBackdrop(view), bands: createBands() };
}

export function drawFarmScene(
  ctx: CanvasRenderingContext2D,
  scene: FarmScene,
  poses: ScenePoses,
  time: number,
): void {
  const { view, backdrop, bands } = scene;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(backdrop, 0, 0);

  const k = view.scale * view.dpr;
  ctx.setTransform(k, 0, 0, k, view.originX * view.dpr, view.originY * view.dpr);

  drawClouds(ctx, time);
  drawBirds(ctx, time);
  drawSmoke(ctx, time);
  drawCanalGlints(ctx, time);
  drawPloughTeam(ctx, time);
  drawWalker(ctx, time);

  // Crew stand in the rows, so wheat in front of them must draw after them.
  const crew = [
    {
      y: 758,
      draw: () => {
        drawFarmer(ctx, 1030, 758, 1.15, 1, poses.winnower, OUTFITS.winnower, "tray", time);
        drawGrainFall(ctx, 1057, 758 - 118, 758, time);
      },
    },
    {
      y: 790,
      draw: () => drawFarmer(ctx, 470, 790, 1.2, 1, poses.gatherer, OUTFITS.gatherer, "sheaf", time),
    },
    {
      y: 800,
      draw: () => drawFarmer(ctx, 655, 800, 1.3, 1, poses.harvester, OUTFITS.harvester, "sickle", time),
    },
  ];

  let next = 0;
  for (const band of bands) {
    while (next < crew.length && crew[next].y <= band.y) {
      crew[next].draw();
      next++;
    }
    drawBand(ctx, band, time);
  }
  while (next < crew.length) {
    crew[next].draw();
    next++;
  }
}
