/** Articulated farmers and oxen, posed fresh each frame. */

/** Radians. 0 hangs straight down, positive swings towards the way they face. */
export type Pose = {
  bend: number;
  crouch: number;
  stride: number;
  frontArm: [number, number];
  backArm: [number, number];
};

export type Outfit = {
  kameez: string;
  kameezShade: string;
  shalwar: string;
  skin: string;
  headwear: { kind: "pagri"; colour: string } | { kind: "dupatta"; colour: string };
  beard?: boolean;
};

export type Tool = "sickle" | "tray" | "sheaf" | "none";

type Point = { x: number; y: number };

const THIGH = 25;
const SHIN = 24;
const TORSO = 35;
const UPPER_ARM = 17;
const FOREARM = 17;

function along(from: Point, angle: number, length: number): Point {
  return { x: from.x + Math.sin(angle) * length, y: from.y + Math.cos(angle) * length };
}

function limb(ctx: CanvasRenderingContext2D, points: Point[], colour: string, width: number): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach((p, index) => (index === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

function drawTool(ctx: CanvasRenderingContext2D, hand: Point, angle: number, tool: Tool): void {
  if (tool === "sickle") {
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(-angle + 1.2);
    limb(ctx, [{ x: 0, y: 3 }, { x: 0, y: -7 }], "#6D4F35", 3);
    ctx.strokeStyle = "#D9DEE2";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(7, -8, 8, Math.PI, Math.PI * 2.05);
    ctx.stroke();
    ctx.restore();
  } else if (tool === "sheaf") {
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(0.5);
    for (let i = -3; i <= 3; i++) {
      limb(ctx, [{ x: i * 1.2, y: 12 }, { x: i * 2.4, y: -15 }], i % 2 === 0 ? "#C99B45" : "#E4BF6C", 1.8);
    }
    ctx.restore();
  }
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  head: Point,
  lean: number,
  outfit: Outfit,
  time: number,
): void {
  const { headwear } = outfit;
  if (headwear.kind === "dupatta") {
    // Scarf trails from the head and lifts a little in the wind.
    const flutter = Math.sin(time * 2.2) * 3;
    ctx.fillStyle = headwear.colour;
    ctx.beginPath();
    ctx.moveTo(head.x + 5, head.y - 8);
    ctx.quadraticCurveTo(head.x - 15, head.y + 4, head.x - 24 + flutter, head.y + 30);
    ctx.lineTo(head.x - 8, head.y + 26);
    ctx.quadraticCurveTo(head.x - 3, head.y + 12, head.x + 3, head.y + 7);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = outfit.skin;
  ctx.beginPath();
  ctx.ellipse(head.x, head.y, 6.8, 7.6, lean, 0, Math.PI * 2);
  ctx.fill();

  if (outfit.beard) {
    ctx.fillStyle = "#3A3029";
    ctx.beginPath();
    ctx.ellipse(head.x + 2.2, head.y + 4.4, 4.8, 3.8, lean, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = headwear.colour;
  if (headwear.kind === "pagri") {
    ctx.beginPath();
    ctx.ellipse(head.x - 0.5, head.y - 5, 8.8, 5.8, lean - 0.12, 0, Math.PI * 2);
    ctx.fill();
    limb(
      ctx,
      [{ x: head.x - 6, y: head.y - 4 }, { x: head.x - 11, y: head.y + 7 + Math.sin(time * 2.4) }],
      headwear.colour,
      3.4,
    );
    ctx.strokeStyle = "rgba(90,70,50,0.35)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(head.x - 8, head.y - 3);
    ctx.quadraticCurveTo(head.x, head.y - 9, head.x + 8, head.y - 5);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(head.x - 1.2, head.y - 3.2, 8, 7, lean, Math.PI * 0.85, Math.PI * 2.1);
    ctx.fill();
  }
}

/** Draws a figure standing with their lower foot at (x, y). */
export function drawFarmer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  facing: 1 | -1,
  pose: Pose,
  outfit: Outfit,
  tool: Tool,
  time: number,
): void {
  // Legs first, in hip space, so the hip can be lifted to stand on the ground.
  const hipRaw = { x: 0, y: 0 };
  const frontKnee = along(hipRaw, pose.stride + pose.crouch, THIGH);
  const frontFoot = along(frontKnee, pose.stride - pose.crouch * 0.55, SHIN);
  const backKnee = along(hipRaw, -pose.stride + pose.crouch * 0.7, THIGH);
  const backFoot = along(backKnee, -pose.stride - pose.crouch * 0.7, SHIN);
  const lift = Math.max(frontFoot.y, backFoot.y);

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "rgba(70,48,20,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 1, 26 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(scale * facing, scale);
  ctx.translate(0, -lift);

  const hip = hipRaw;
  const shoulder = {
    x: hip.x + Math.sin(pose.bend) * TORSO,
    y: hip.y - Math.cos(pose.bend) * TORSO,
  };
  const armAngle = (angle: number) => angle + pose.bend;
  const backElbow = along(shoulder, armAngle(pose.backArm[0]), UPPER_ARM);
  const backHand = along(backElbow, armAngle(pose.backArm[0] + pose.backArm[1]), FOREARM);
  const frontElbow = along(shoulder, armAngle(pose.frontArm[0]), UPPER_ARM);
  const frontAngle = armAngle(pose.frontArm[0] + pose.frontArm[1]);
  const frontHand = along(frontElbow, frontAngle, FOREARM);

  limb(ctx, [shoulder, backElbow, backHand], outfit.kameezShade, 6.5);
  limb(ctx, [backHand, along(backHand, armAngle(pose.backArm[0] + pose.backArm[1]), 2)], outfit.skin, 5);
  limb(ctx, [hip, backKnee, backFoot], outfit.shalwar, 9);
  limb(ctx, [backFoot, { x: backFoot.x + 6, y: backFoot.y + 1 }], "#4A3524", 4.5);
  limb(ctx, [hip, frontKnee, frontFoot], outfit.shalwar, 9.5);
  limb(ctx, [frontFoot, { x: frontFoot.x + 6, y: frontFoot.y + 1 }], "#4A3524", 4.5);

  // Long kameez, hanging straight from the hip whichever way the torso leans.
  const nx = Math.cos(pose.bend);
  const ny = Math.sin(pose.bend);
  ctx.fillStyle = outfit.kameez;
  ctx.beginPath();
  ctx.moveTo(shoulder.x + nx * 7.5, shoulder.y + ny * 7.5);
  ctx.quadraticCurveTo(hip.x + nx * 11, hip.y + ny * 8, hip.x + 12, hip.y + 19);
  ctx.quadraticCurveTo(hip.x, hip.y + 23, hip.x - 13, hip.y + 19);
  ctx.quadraticCurveTo(hip.x - nx * 11, hip.y - ny * 8, shoulder.x - nx * 7.5, shoulder.y - ny * 7.5);
  ctx.quadraticCurveTo(shoulder.x, shoulder.y - 2, shoulder.x + nx * 7.5, shoulder.y + ny * 7.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = outfit.kameezShade;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(shoulder.x, shoulder.y + 2);
  ctx.quadraticCurveTo(hip.x - nx * 2, hip.y, hip.x - 2, hip.y + 20);
  ctx.stroke();

  const neck = { x: shoulder.x + Math.sin(pose.bend * 0.65) * 4, y: shoulder.y - Math.cos(pose.bend * 0.65) * 4 };
  limb(ctx, [shoulder, neck], outfit.skin, 5);
  const head = {
    x: shoulder.x + Math.sin(pose.bend * 0.8) * 11.5,
    y: shoulder.y - Math.cos(pose.bend * 0.8) * 11.5,
  };
  drawHead(ctx, head, pose.bend * 0.5, outfit, time);

  if (tool === "tray") {
    // Winnowing basket held between both hands.
    ctx.strokeStyle = "#A9833F";
    ctx.lineWidth = 5.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(backHand.x - 4, backHand.y + 1);
    ctx.quadraticCurveTo((backHand.x + frontHand.x) / 2, Math.max(backHand.y, frontHand.y) + 8, frontHand.x + 8, frontHand.y - 1);
    ctx.stroke();
    ctx.strokeStyle = "#D6B56B";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  limb(ctx, [shoulder, frontElbow, frontHand], outfit.kameez, 7);
  ctx.strokeStyle = outfit.kameezShade;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(shoulder.x + 2, shoulder.y + 2);
  ctx.lineTo(frontElbow.x + 2, frontElbow.y);
  ctx.stroke();
  ctx.fillStyle = outfit.skin;
  ctx.beginPath();
  ctx.arc(frontHand.x, frontHand.y, 3.2, 0, Math.PI * 2);
  ctx.fill();
  drawTool(ctx, frontHand, frontAngle, tool);

  ctx.restore();
}

/** Bundle balanced on the head of the walking figure. */
export function drawHeadBundle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  bob: number,
): void {
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(scale, scale);
  ctx.rotate(0.05);
  for (let i = -9; i <= 9; i++) {
    const top = i % 2 === 0 ? -14 : -9;
    limb(ctx, [{ x: i * 2.5, y: 2 }, { x: i * 3.3, y: top }], i % 2 === 0 ? "#C99B45" : "#E9C878", 2.2);
  }
  ctx.fillStyle = "#DCB45F";
  ctx.beginPath();
  ctx.ellipse(0, 1, 25, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  limb(ctx, [{ x: -8, y: -3 }, { x: -8, y: 6 }], "#7A5A26", 2);
  limb(ctx, [{ x: 9, y: -3 }, { x: 9, y: 6 }], "#7A5A26", 2);
  ctx.restore();
}

/** A humped zebu, the working ox of the Punjab. */
export function drawOx(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  facing: 1 | -1,
  phase: number,
  coat: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);

  const legs: [number, number][] = [[-27, 0], [-19, Math.PI], [19, Math.PI], [27, 0]];
  legs.forEach(([hipX, offset], index) => {
    const swing = Math.sin(phase + offset) * 0.32;
    const shade = index === 1 || index === 2 ? "rgba(70,55,40,0.28)" : "rgba(0,0,0,0)";
    const start = { x: hipX, y: -27 };
    const end = along(start, swing, 27);
    limb(ctx, [start, end], coat, 7);
    limb(ctx, [start, end], shade, 7);
    limb(ctx, [end, { x: end.x + 1, y: end.y + 2 }], "#3F3226", 6.5);
  });

  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(0, -39, 35, 16.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hump.
  ctx.beginPath();
  ctx.ellipse(21, -56, 10, 9, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(90,74,56,0.22)";
  ctx.beginPath();
  ctx.ellipse(-3, -30, 28, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  const nod = Math.sin(phase * 2) * 1.5;
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(30, -50);
  ctx.quadraticCurveTo(44, -56 + nod, 54, -49 + nod);
  ctx.lineTo(58, -36 + nod);
  ctx.lineTo(48, -33 + nod);
  ctx.quadraticCurveTo(38, -34, 30, -30);
  ctx.closePath();
  ctx.fill();
  limb(ctx, [{ x: 50, y: -53 + nod }, { x: 47, y: -64 + nod }], "#5A4A38", 2.6);
  limb(ctx, [{ x: 54, y: -52 + nod }, { x: 57, y: -63 + nod }], "#5A4A38", 2.6);
  ctx.fillStyle = "#2E2620";
  ctx.beginPath();
  ctx.arc(52, -46 + nod, 1.5, 0, Math.PI * 2);
  ctx.fill();
  const tail = Math.sin(phase * 0.5) * 3;
  limb(ctx, [{ x: -34, y: -44 }, { x: -39 + tail, y: -20 }], coat, 2.2);
  limb(ctx, [{ x: -39 + tail, y: -20 }, { x: -40 + tail, y: -13 }], "#3F3226", 3.4);

  ctx.restore();
}
