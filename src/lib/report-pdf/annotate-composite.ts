/**
 * Render editable photo annotations (see `AnnotationScene`) onto a canvas and
 * flatten them into a JPEG. The same `drawScene` is used by the live annotator
 * canvas and by the composite baked into the preview/PDF, so what Tandra draws
 * is exactly what ships.
 */
import type { AnnotationScene } from "./types";

const JPEG_QUALITY = 0.85;
const HIGHLIGHTER_ALPHA = 0.35;
const HIGHLIGHTER_WIDTH_MULTIPLIER = 3.5;

/** Font stack mirrors the site UI (Hanken Grotesk) for a consistent hand. */
export const TEXT_FONT =
  '"Hanken Grotesk", "Hanken Grotesk Variable", sans-serif';

/** Line spacing multiplier for multi-line text annotations (of `item.size`). */
export const TEXT_LINE_HEIGHT_MULTIPLIER = 1.2;

const drawStroke = (
  ctx: CanvasRenderingContext2D,
  points: number[],
  scale: number
): void => {
  if (points.length < 2) {
    return;
  }
  ctx.beginPath();
  ctx.moveTo(points[0] * scale, points[1] * scale);
  if (points.length <= 4) {
    // A dot or a single segment: draw straight (no midpoints to smooth).
    for (let i = 2; i < points.length; i += 2) {
      ctx.lineTo(points[i] * scale, points[i + 1] * scale);
    }
    if (points.length === 2) {
      ctx.lineTo(points[0] * scale + 0.01, points[1] * scale);
    }
  } else {
    // Quadratic smoothing through segment midpoints for a hand-drawn feel.
    for (let i = 2; i < points.length - 2; i += 2) {
      const midX = (points[i] + points[i + 2]) / 2;
      const midY = (points[i + 1] + points[i + 3]) / 2;
      ctx.quadraticCurveTo(
        points[i] * scale,
        points[i + 1] * scale,
        midX * scale,
        midY * scale
      );
    }
    const last = points.length;
    ctx.lineTo(points[last - 2] * scale, points[last - 1] * scale);
  }
  ctx.stroke();
};

/**
 * Draw a scene onto `ctx`. `scale` maps natural px → target canvas px (1 when
 * compositing at full resolution, <1 for the on-screen editor).
 */
export const drawScene = (
  ctx: CanvasRenderingContext2D,
  scene: AnnotationScene,
  scale: number
): void => {
  for (const item of scene.items) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (item.kind === "pen" || item.kind === "highlighter") {
      ctx.strokeStyle = item.color;
      if (item.kind === "highlighter") {
        ctx.globalAlpha = HIGHLIGHTER_ALPHA;
        ctx.globalCompositeOperation = "multiply";
        ctx.lineWidth = item.width * HIGHLIGHTER_WIDTH_MULTIPLIER * scale;
      } else {
        ctx.lineWidth = item.width * scale;
      }
      drawStroke(ctx, item.points, scale);
    } else if (item.kind === "circle") {
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.width * scale;
      ctx.beginPath();
      ctx.ellipse(
        (item.x + item.w / 2) * scale,
        (item.y + item.h / 2) * scale,
        (Math.abs(item.w) / 2) * scale,
        (Math.abs(item.h) / 2) * scale,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    } else if (item.kind === "text") {
      ctx.fillStyle = item.color;
      ctx.font = `600 ${item.size * scale}px ${TEXT_FONT}`;
      ctx.textBaseline = "top";
      for (const [line, index] of item.text
        .split("\n")
        .map((value, i): [string, number] => [value, i])) {
        ctx.fillText(
          line,
          item.x * scale,
          (item.y + index * item.size * TEXT_LINE_HEIGHT_MULTIPLIER) * scale
        );
      }
    }
    ctx.restore();
  }
};

const canvasToJpeg = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  // oxlint-disable-next-line promise/avoid-new -- canvas.toBlob is callback-based
  new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
  });

/**
 * Flatten `scene` onto `original`, returning a new JPEG blob + object URL. When
 * the scene is empty the original is re-encoded unchanged (callers can treat
 * the result as the canonical display image either way).
 */
export const compositeAnnotatedPhoto = async (
  original: Blob,
  scene: AnnotationScene | null
): Promise<{ blob: Blob; url: string }> => {
  const bitmap = await createImageBitmap(original);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not render annotations (canvas unavailable).");
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  if (scene && scene.items.length > 0) {
    drawScene(ctx, scene, canvas.width / scene.width);
  }
  const blob = await canvasToJpeg(canvas);
  if (!blob) {
    throw new Error("Could not render annotations.");
  }
  return { blob, url: URL.createObjectURL(blob) };
};
