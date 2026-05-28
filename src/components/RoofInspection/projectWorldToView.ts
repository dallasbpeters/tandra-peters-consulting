/** model-viewer world-space helpers for the dev axis compass. */

export type Vec3 = { x: number; y: number; z: number };

export type ModelViewerNav = {
  getCameraOrbit: () => { theta: number; phi: number; radius: number };
  getCameraTarget: () => Vec3;
};

const normalize = (v: Vec3): Vec3 => {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
};

const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

/** Camera position from model-viewer orbit + target (Y-up, radians). */
export const getCameraPosition = (mv: ModelViewerNav): Vec3 => {
  const { theta, phi, radius } = mv.getCameraOrbit();
  const target = mv.getCameraTarget();
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);

  return {
    x: target.x + radius * sinPhi * sinTheta,
    y: target.y + radius * cosPhi,
    z: target.z + radius * sinPhi * cosTheta,
  };
};

export type ViewAxisProjection = {
  /** Screen-plane direction for drawing an arrow in the mini compass (SVG coords). */
  dir: Vec3;
  /** 0–1 how much this axis faces the camera (1 = toward viewer). */
  facing: number;
};

/**
 * Project a world-space unit axis into the camera view plane for a 2D compass.
 * Returns null when the axis is edge-on (invisible in the mini widget).
 */
export const projectWorldAxisToCompass = (
  mv: ModelViewerNav,
  worldAxis: Vec3,
): ViewAxisProjection | null => {
  const cam = getCameraPosition(mv);
  const target = mv.getCameraTarget();
  const forward = normalize({
    x: target.x - cam.x,
    y: target.y - cam.y,
    z: target.z - cam.z,
  });
  const worldUp: Vec3 = { x: 0, y: 1, z: 0 };
  let right = cross(forward, worldUp);
  const rightLen = Math.hypot(right.x, right.y, right.z);
  if (rightLen < 1e-6) {
    right = { x: 1, y: 0, z: 0 };
  } else {
    right = { x: right.x / rightLen, y: right.y / rightLen, z: right.z / rightLen };
  }
  const up = normalize(cross(right, forward));

  const axis = normalize(worldAxis);
  const facing = dot(axis, forward);
  const planeX = dot(axis, right);
  const planeY = dot(axis, up);
  const planeLen = Math.hypot(planeX, planeY);
  if (planeLen < 0.08) {
    return { dir: { x: 0, y: 0, z: 0 }, facing };
  }

  return {
    dir: { x: planeX / planeLen, y: -planeY / planeLen, z: 0 },
    facing,
  };
};

export const parseMetersTriple = (
  value: string | undefined,
): Vec3 | null => {
  if (!value?.trim()) {
    return null;
  }
  const parts = value.trim().split(/\s+/);
  if (parts.length < 3) {
    return null;
  }
  const parse = (part: string) => Number.parseFloat(part.replace(/m$/i, ""));
  const x = parse(parts[0]);
  const y = parse(parts[1]);
  const z = parse(parts[2]);
  if (![x, y, z].every(Number.isFinite)) {
    return null;
  }
  return { x, y, z };
};

export const formatVec3 = (v: Vec3, digits = 3): string =>
  `${v.x.toFixed(digits)}, ${v.y.toFixed(digits)}, ${v.z.toFixed(digits)}`;
