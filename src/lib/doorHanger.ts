import type { DoorHangerCutout } from "./adCreative";

// ─── Cutout silhouette geometry ────────────────────────────────────────────────
// The door-hanger silhouette is a rounded-top rectangle with a keyhole (a
// doorknob hole plus a slit up to the top edge) punched out of it. Everything is
// expressed in the format's own units (inches) so the SVG `viewBox` can use the
// raw width/height and the shape stretches with the canvas (`mask-size: 100% 100%`).

const round = (value: number) => Math.round(value * 1000) / 1000;

/** SVG `d` for the rounded-top, square-bottom outer rectangle. */
const outlinePath = (w: number, h: number, r: number): string => {
  const radius = Math.min(r, w / 2, h / 2);
  return [
    `M 0 ${round(h)}`,
    `L 0 ${round(radius)}`,
    `Q 0 0 ${round(radius)} 0`,
    `L ${round(w - radius)} 0`,
    `Q ${round(w)} 0 ${round(w)} ${round(radius)}`,
    `L ${round(w)} ${round(h)}`,
    "Z",
  ].join(" ");
};

/**
 * SVG `d` for the keyhole subpath: a full circular doorknob hole with a slot
 * running up to the top edge at a 45° angle. The slot is a constant-width strip
 * (its walls stay parallel) angled up-and-to-the-left, exiting the top edge.
 * The circle stays whole — only the small cap between the two walls (on the
 * opening side) is absorbed into the slot; the rest of the circle is traced as
 * two arcs through the far point so the arc flags are unambiguous.
 */
const keyholePath = (w: number, cutout: DoorHangerCutout): string => {
  const cx = w / 2;
  const r = cutout.holeDiameter / 1.5;
  const cy = cutout.holeCenterFromTop;
  // Keep the half-width below the radius so the wall/circle intersection is real.
  const h = Math.min(cutout.slotWidth / 5, r * 0.9);
  const k = Math.sqrt(Math.max(r * r - h * h, 0));
  const s = Math.SQRT1_2; // 1/√2 — the slot runs at 45°.

  // Top-edge endpoints of the two parallel walls (y = 0).
  const t1x = cx - cy - h * Math.SQRT2; // outer (left) wall
  const t2x = cx - cy + h * Math.SQRT2; // inner (right) wall
  // Where each wall meets the circle, on the opening (up-left) side.
  const m1x = cx - (h + k) * s;
  const m1y = cy + (h - k) * s;
  const m2x = cx + (h - k) * s;
  const m2y = cy - (h + k) * s;
  // Far point of the circle, diametrically opposite the opening (down-right).
  const fx = cx + r * s;
  const fy = cy + r * s;

  return [
    `M ${round(t1x)} 0`,
    // Down the left wall to the circle.
    `L ${round(m1x)} ${round(m1y)}`,
    // Around the far (down-right) side of the circle via the opposite point.
    `A ${round(r)} ${round(r)} 0 0 0 ${round(fx)} ${round(fy)}`,
    `A ${round(r)} ${round(r)} 0 0 0 ${round(m2x)} ${round(m2y)}`,
    // Up the right wall back to the top edge.
    `L ${round(t2x)} 0`,
    "Z",
  ].join(" ");
};

/**
 * Single even-odd path that keeps the hanger silhouette and cuts out the
 * keyhole. White-on-transparent so it works as both a luminance and an alpha
 * mask (cross-browser safe for `mask-image`).
 */
export const buildCutoutMaskSvg = (
  cutout: DoorHangerCutout,
  widthIn: number,
  heightIn: number,
): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(widthIn)} ${round(heightIn)}" preserveAspectRatio="none">` +
  `<path fill="#fff" fill-rule="evenodd" d="${outlinePath(widthIn, heightIn, cutout.topRadius)} ${keyholePath(widthIn, cutout)}"/>` +
  `</svg>`;

/** `url("data:image/svg+xml,...")` value for CSS `mask-image`. */
export const buildCutoutMaskDataUri = (
  cutout: DoorHangerCutout,
  widthIn: number,
  heightIn: number,
): string =>
  `url("data:image/svg+xml,${encodeURIComponent(buildCutoutMaskSvg(cutout, widthIn, heightIn))}")`;

// ─── On-door mockup ─────────────────────────────────────────────────────────────

export type DoorMockup = {
  src: string;
  /** Width the knob/scale measurements were taken at. */
  baselineWidth: number;
  /** Doorknob center as a fraction of the door image (0–1). */
  knobX: number;
  knobY: number;
  /** Door-face pixels per inch at {@link baselineWidth}. */
  pxPerInch: number;
};

/**
 * Default door photo + measured handle position (1024×682). The black lever's
 * rosette — where a hanger naturally rests — is centered at ~(0.75, 0.345). The
 * door face measures ~25 px/in at the baseline width, so a 4.25×11″ hanger
 * lands at a believable size with the keyhole sitting over the lever.
 */
export const DEFAULT_DOOR_MOCKUP: DoorMockup = {
  src: "/door-hanger-mockup-door.jpg",
  baselineWidth: 1024,
  knobX: 0.75,
  knobY: 0.345,
  pxPerInch: 25,
};

const traceOutline = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${src}`));
    img.src = src;
  });

let doorImagePromise: Promise<HTMLImageElement> | null = null;
const loadDoorImage = (src: string): Promise<HTMLImageElement> => {
  doorImagePromise ??= loadImage(src);
  return doorImagePromise;
};

export type RenderDoorMockupOptions = {
  /** Rectangular design export (opaque PNG, no clip applied). */
  design: HTMLImageElement;
  cutout: DoorHangerCutout;
  hangerWidthInches: number;
  hangerHeightInches: number;
  mockup?: DoorMockup;
  /** Multiplier over the mockup's measured px/in (1 = as measured). */
  scale?: number;
};

/**
 * Composites the rectangular design onto the door photo: clips it to the hanger
 * silhouette, drapes it from the doorknob, punches the doorknob through the
 * hole, and adds a soft drop shadow. Returns a PNG blob.
 */
export const renderDoorMockup = async ({
  design,
  cutout,
  hangerWidthInches,
  hangerHeightInches,
  mockup = DEFAULT_DOOR_MOCKUP,
  scale = 1,
}: RenderDoorMockupOptions): Promise<Blob> => {
  const door = await loadDoorImage(mockup.src);
  const W = door.naturalWidth || mockup.baselineWidth;
  const H = door.naturalHeight || Math.round(mockup.baselineWidth * 0.666);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is unavailable.");

  const factor = W / mockup.baselineWidth;
  const hangerPpi = mockup.pxPerInch * factor * scale;
  const hangerW = hangerWidthInches * hangerPpi;
  const hangerH = hangerHeightInches * hangerPpi;
  const topRadius = cutout.topRadius * hangerPpi;

  const knobX = mockup.knobX * W;
  const knobY = mockup.knobY * H;
  const hangerX = knobX - hangerW / 2;
  const hangerY = knobY - cutout.holeCenterFromTop * hangerPpi;

  const holeRadius = (cutout.holeDiameter / 2) * hangerPpi;
  const slotHalf = (cutout.slotWidth / 2) * hangerPpi;

  ctx.drawImage(door, 0, 0, W, H);

  // Soft drop shadow behind the hanger.
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.32)";
  ctx.shadowBlur = 16 * factor;
  ctx.shadowOffsetX = 3 * factor;
  ctx.shadowOffsetY = 10 * factor;
  ctx.fillStyle = "#000";
  traceOutline(ctx, hangerX, hangerY, hangerW, hangerH, topRadius);
  ctx.fill();
  ctx.restore();

  // Clip to the silhouette and paint the design.
  ctx.save();
  traceOutline(ctx, hangerX, hangerY, hangerW, hangerH, topRadius);
  ctx.clip();
  ctx.drawImage(design, hangerX, hangerY, hangerW, hangerH);
  ctx.restore();

  // Punch the doorknob through the circular hole.
  ctx.save();
  ctx.beginPath();
  ctx.arc(knobX, knobY, holeRadius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(door, 0, 0, W, H);
  ctx.restore();

  // Punch the 45-degree slit above the hole. The circle is punched separately,
  // so this is just a constant-width strip running at 45° from the top edge into
  // the hole. Centerline goes from the top edge down-right to the knob center.
  ctx.save();
  ctx.beginPath();
  const s = Math.SQRT1_2;
  const vDist = knobY - hangerY; // top edge → knob center
  // Centerline endpoints: top edge (45° up-left of the knob) and just past the knob.
  const topX = knobX - vDist;
  const topY = hangerY;
  const botX = knobX + holeRadius * s;
  const botY = knobY + holeRadius * s;
  // Perpendicular offset (half the slot width) for the parallel walls.
  const nx = slotHalf * s;
  const ny = -slotHalf * s;
  ctx.moveTo(topX + nx, topY + ny);
  ctx.lineTo(botX + nx, botY + ny);
  ctx.lineTo(botX - nx, botY - ny);
  ctx.lineTo(topX - nx, topY - ny);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(door, 0, 0, W, H);
  ctx.restore();

  // Subtle edge so the white-on-white hanger reads against the door.
  ctx.save();
  traceOutline(ctx, hangerX, hangerY, hangerW, hangerH, topRadius);
  ctx.lineWidth = 1.5 * factor;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.14)";
  ctx.stroke();
  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not render the door mockup."));
    }, "image/png");
  });
};
