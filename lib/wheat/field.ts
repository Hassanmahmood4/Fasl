/** Stalk layout and physics. Holds no canvas code; see draw.ts for rendering. */

export const NODES = 20;

/** Spring tuned to settle in about 0.6s with slight overshoot. */
const STIFFNESS = 144;
const DAMPING = 13.2;

/** How far past the screen edge a fully opened curtain carries its stalks. */
const CURTAIN_MARGIN = 110;

export type FieldMode = "full" | "bottom" | "row";

export type Cursor = { x: number; y: number; strength: number };

type LayerSpec = {
  share: number;
  lengths: [number, number];
  lean: number;
  /** Random shift within a stalk's slot, as a share of the spacing. */
  jitter: number;
  /** Spread of sway phase. Small values keep neighbours moving together. */
  phase: number;
};

const LAYERS: Record<FieldMode, LayerSpec[]> = {
  // Back layer is a continuous wall that covers the text; the others add ears.
  full: [
    { share: 0.5, lengths: [0.96, 1.18], lean: 1, jitter: 0.4, phase: 0.15 },
    { share: 0.3, lengths: [0.45, 1.02], lean: 30, jitter: 0.8, phase: 0.5 },
    { share: 0.2, lengths: [0.25, 0.68], lean: 30, jitter: 0.8, phase: 0.5 },
  ],
  bottom: [
    { share: 0.5, lengths: [0.2, 0.33], lean: 12, jitter: 0.8, phase: 0 },
    { share: 0.3, lengths: [0.14, 0.3], lean: 20, jitter: 0.8, phase: 0 },
    { share: 0.2, lengths: [0.08, 0.22], lean: 20, jitter: 0.8, phase: 0 },
  ],
  // Footer strip: a loose row of short stalks.
  row: [
    { share: 0.5, lengths: [0.42, 0.66], lean: 8, jitter: 0.8, phase: 0.8 },
    { share: 0.3, lengths: [0.32, 0.6], lean: 8, jitter: 0.8, phase: 0.8 },
    { share: 0.2, lengths: [0.22, 0.5], lean: 8, jitter: 0.8, phase: 0.8 },
  ],
};

export type LayerRange = { start: number; end: number; stemWidth: number };

export type WheatField = {
  width: number;
  height: number;
  count: number;
  radius: number;
  swayAmp: number;
  earScale: number;
  layers: LayerRange[];
  rootX: Float32Array;
  length: Float32Array;
  lean: Float32Array;
  phase: Float32Array;
  earSize: Float32Array;
  bucket: Uint8Array;
  active: Uint8Array;
  x: Float32Array;
  y: Float32Array;
  offset: Float32Array;
  velocity: Float32Array;
};

export const BUCKETS = 3;

function stalkCount(width: number, height: number, mode: FieldMode): number {
  if (mode === "row") return Math.round(Math.min(260, Math.max(70, width / 6)));
  const scaled = Math.min(1200, Math.max(220, (width * height) / 1150));
  return Math.round(mode === "full" ? scaled : scaled * 0.5);
}

export function createField(
  width: number,
  height: number,
  mode: FieldMode,
  /** Tallest a stalk and its ear may reach, so a static field can stay clear of text. */
  maxReach = Infinity,
): WheatField {
  const count = stalkCount(width, height, mode);
  const specs = LAYERS[mode];
  const margin = 40;
  const span = width + margin * 2;

  const field: WheatField = {
    width,
    height,
    count,
    radius: mode === "row" ? 70 : width < 768 ? 100 : 140,
    swayAmp: { full: 5, bottom: 0, row: 3 }[mode],
    earScale: mode === "row" ? (width < 768 ? 0.5 : 0.8) : width < 768 ? 0.8 : 1,
    layers: [],
    rootX: new Float32Array(count),
    length: new Float32Array(count),
    lean: new Float32Array(count),
    phase: new Float32Array(count),
    earSize: new Float32Array(count),
    bucket: new Uint8Array(count),
    active: new Uint8Array(count),
    x: new Float32Array(count * NODES),
    y: new Float32Array(count * NODES),
    offset: new Float32Array(count * NODES),
    velocity: new Float32Array(count * NODES),
  };

  const tallest = Math.max(...specs.map((spec) => spec.lengths[1])) * height;
  const earHeight = 66 * 1.15 * field.earScale;
  const lengthScale = Math.min(1, Math.max(0, maxReach - earHeight) / tallest);

  let start = 0;
  specs.forEach((spec, layerIndex) => {
    const isLast = layerIndex === specs.length - 1;
    const layerCount = isLast ? count - start : Math.round(count * spec.share);
    const spacing = span / layerCount;

    for (let i = 0; i < layerCount; i++) {
      const s = start + i;
      // Stratified placement: random stalks would leave holes in the wall.
      field.rootX[s] =
        -margin + (i + 0.5 + (Math.random() - 0.5) * spec.jitter) * spacing;
      field.length[s] =
        lengthScale *
        height *
        (spec.lengths[0] + Math.random() * (spec.lengths[1] - spec.lengths[0]));
      field.lean[s] = (Math.random() * 2 - 1) * spec.lean;
      field.phase[s] = (Math.random() - 0.5) * spec.phase;
      field.earSize[s] = field.earScale * (0.85 + Math.random() * 0.3);
      field.bucket[s] = Math.floor(Math.random() * BUCKETS);
      for (let n = 0; n < NODES; n++) {
        field.y[s * NODES + n] = height - (field.length[s] * n) / (NODES - 1);
      }
    }

    field.layers.push({
      start,
      end: start + layerCount,
      // In full mode, back stems overlap their neighbours so no text leaks.
      stemWidth:
        layerIndex === 0 && mode === "full"
          ? Math.min(12, Math.max(3, spacing * 2.6))
          : 2.6 - layerIndex * 0.2,
    });
    start += layerCount;
  });

  return field;
}

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/**
 * Horizontal push that clears a circle around the cursor, easing off with distance.
 * `side` is shared by the whole stalk, so a stem never gets pulled across the gap.
 */
function partingOffset(
  dx: number,
  dy: number,
  radius: number,
  side: number,
): number {
  const rSquared = radius * radius;
  const clearing = rSquared - dy * dy;
  if (clearing <= 0) return 0;
  const a = Math.abs(dx);
  const falloff = smoothstep((radius * 3 - a) / (radius * 1.5));
  if (falloff === 0) return 0;
  const parted = side * Math.sqrt(a * a + clearing) - dx;
  // A node on the far side has further to travel, so ease it in at the circle's rim.
  const rim = dx * side < 0 ? Math.min(1, (clearing / rSquared) * 4) : 1;
  return parted * falloff * rim;
}

/**
 * Curtain: at `open` 0 a stalk stands in place; at 1 it has been drawn past its
 * edge of the screen. Stalks bunch towards the sides like gathered cloth, and the
 * top of the field parts before the roots follow.
 */
function curtainOffset(f: WheatField, root: number, y: number, open: number): number {
  const half = f.width / 2;
  const fromCentre = root - half;
  const heightShare = Math.min(1, Math.max(0, (f.height - y) / f.height));
  const eased = smoothstep(open * 1.45 - (1 - heightShare) * 0.45);
  const reach = half + CURTAIN_MARGIN;
  const distance = Math.abs(fromCentre);
  const gathered = reach * eased + distance * (1 - eased);
  return (fromCentre < 0 ? -1 : 1) * (gathered - distance);
}

export function stepField(
  f: WheatField,
  dt: number,
  time: number,
  cursor: Cursor | null,
  curtain = 0,
): void {
  const radius = cursor ? f.radius * cursor.strength : 0;
  const last = NODES - 1;

  for (let s = 0; s < f.count; s++) {
    const root = f.rootX[s];
    const phase = f.phase[s];
    // Neighbours share a travelling wave, so sway looks like wind and opens no gaps.
    const sway =
      f.swayAmp *
      (Math.sin(time * 1.1 + root * 0.006 + phase) +
        0.35 * Math.sin(time * 2.3 + root * 0.013 + phase * 2));
    const bend = f.lean[s] + sway;
    let active = 0;

    let side = 1;
    if (cursor) {
      const crossing = Math.min(1, (f.height - cursor.y) / f.length[s]);
      side = root + bend * crossing * crossing < cursor.x ? -1 : 1;
    }

    for (let n = 0; n < NODES; n++) {
      const i = s * NODES + n;
      const h = n / last;
      const rest = root + bend * h * h;

      let target = curtain > 0 ? curtainOffset(f, root, f.y[i], curtain) : 0;
      if (cursor && radius > 0) {
        // The lowest nodes stay planted so the stalk bends instead of sliding.
        const planted = Math.min(1, n / 2);
        target =
          partingOffset(rest - cursor.x, f.y[i] - cursor.y, radius, side) *
          planted;
      }

      const velocity =
        f.velocity[i] +
        ((target - f.offset[i]) * STIFFNESS - DAMPING * f.velocity[i]) * dt;
      const offset = f.offset[i] + velocity * dt;
      f.velocity[i] = velocity;
      f.offset[i] = offset;
      f.x[i] = rest + offset;

      if (Math.abs(offset) > 0.4 || Math.abs(velocity) > 2) active = 1;
    }
    f.active[s] = active;
  }
}
