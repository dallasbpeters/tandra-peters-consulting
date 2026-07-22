import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import {
  Check,
  Circle,
  EditPencil,
  FillColor,
  Text,
  Trash,
  Undo,
  Xmark,
} from "iconoir-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { drawScene } from "../../lib/report-pdf/annotate-composite";
import type {
  Annotation,
  AnnotationScene,
  PenAnnotation,
} from "../../lib/report-pdf/types";

import "../../styles/photo-annotator.css";

type Tool = "circle" | "highlighter" | "pen" | "text";

interface PhotoAnnotatorProps {
  /** Original (unannotated) processed photo. */
  image: Blob;
  /** Existing annotations to keep editing, or null to start fresh. */
  initialScene: AnnotationScene | null;
  onCancel: () => void;
  onSave: (scene: AnnotationScene) => void;
}

interface TextDraft {
  natX: number;
  natY: number;
  value: string;
}

interface ViewTransform {
  scale: number;
  x: number;
  y: number;
}

const COLORS = [
  "#e02424",
  "#f59e0b",
  "#2563eb",
  "#16a34a",
  "#111111",
  "#ffffff",
];

const ICON = 20;

/** Stroke/text sizes scale with the image so they read at full resolution. */
const sizePresets = (naturalWidth: number) => ({
  large: Math.max(6, Math.round(naturalWidth * 0.014)),
  medium: Math.max(4, Math.round(naturalWidth * 0.009)),
  small: Math.max(2, Math.round(naturalWidth * 0.005)),
});

/** Text reads best a bit larger than the thickest stroke preset. */
const TEXT_SIZE_MULTIPLIER = 1.4;

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

const clientToNatural = (
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  scale: number
): { x: number; y: number } => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale,
  };
};

const pinchDistance = (
  a: { x: number; y: number },
  b: { x: number; y: number }
): number => Math.hypot(a.x - b.x, a.y - b.y);

const pinchCenter = (
  a: { x: number; y: number },
  b: { x: number; y: number }
): { x: number; y: number } => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Clamps zoom to [MIN_ZOOM, MAX_ZOOM] and keeps pan within the stage bounds. */
const clampView = (
  next: ViewTransform,
  stage: { clientHeight: number; clientWidth: number }
): ViewTransform => {
  const clampedScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.scale));
  const maxPanX = (stage.clientWidth * (clampedScale - 1)) / 2;
  const maxPanY = (stage.clientHeight * (clampedScale - 1)) / 2;
  return {
    scale: clampedScale,
    x: Math.min(maxPanX, Math.max(-maxPanX, next.x)),
    y: Math.min(maxPanY, Math.max(-maxPanY, next.y)),
  };
};

/**
 * Full-screen editor for hand-drawn photo annotations (pen, highlighter,
 * circle, text). Draws onto a single fitted canvas; commits a vector
 * `AnnotationScene` so edits stay re-openable. The image itself is never
 * mutated — the scene is composited onto it downstream.
 */
export const PhotoAnnotator = ({
  image,
  initialScene,
  onCancel,
  onSave,
}: PhotoAnnotatorProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const draftRef = useRef<Annotation | null>(null);
  const rafRef = useRef<number | null>(null);
  const itemsRef = useRef<Annotation[]>(initialScene?.items ?? []);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{
    startCenter: { x: number; y: number };
    startDist: number;
    startView: ViewTransform;
  } | null>(null);
  const pinchedRef = useRef(false);

  const [items, setItems] = useState<Annotation[]>(initialScene?.items ?? []);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [natural, setNatural] = useState({ height: 0, width: 0 });
  const [scale, setScale] = useState(1);
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [textSize, setTextSize] = useState(6 * TEXT_SIZE_MULTIPLIER);
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 });

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Decode the source image once.
  useEffect(() => {
    let cancelled = false;
    let bitmap: ImageBitmap | null = null;
    void createImageBitmap(image).then((decoded) => {
      if (cancelled) {
        decoded.close();
        return;
      }
      bitmap = decoded;
      bitmapRef.current = decoded;
      const presets = sizePresets(decoded.width);
      setStrokeWidth(presets.medium);
      setTextSize(presets.large * TEXT_SIZE_MULTIPLIER);
      setNatural({ height: decoded.height, width: decoded.width });
      setView({ scale: 1, x: 0, y: 0 });
      pointersRef.current.clear();
      pinchRef.current = null;
      pinchedRef.current = false;
      setReady(true);
    });
    return () => {
      cancelled = true;
      bitmap?.close();
      bitmapRef.current = null;
    };
  }, [image]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const bitmap = bitmapRef.current;
    if (!(canvas && bitmap)) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const displayW = bitmap.width * scale;
    const displayH = bitmap.height * scale;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displayW, displayH);
    ctx.drawImage(bitmap, 0, 0, displayW, displayH);
    const draftItems = draftRef.current
      ? [...itemsRef.current, draftRef.current]
      : itemsRef.current;
    drawScene(
      ctx,
      { height: bitmap.height, items: draftItems, width: bitmap.width },
      scale
    );
  }, [scale]);

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current !== null) {
      return;
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      redraw();
    });
  }, [redraw]);

  // Fit the canvas to the available stage, tracking viewport/orientation.
  useLayoutEffect(() => {
    if (!(ready && natural.width > 0)) {
      return;
    }
    const fit = () => {
      const stage = stageRef.current;
      const canvas = canvasRef.current;
      if (!(stage && canvas)) {
        return;
      }
      const maxW = stage.clientWidth;
      const maxH = stage.clientHeight;
      const nextScale = Math.min(maxW / natural.width, maxH / natural.height);
      const dpr = window.devicePixelRatio || 1;
      const displayW = natural.width * nextScale;
      const displayH = natural.height * nextScale;
      canvas.width = Math.round(displayW * dpr);
      canvas.height = Math.round(displayH * dpr);
      canvas.style.width = `${displayW}px`;
      canvas.style.height = `${displayH}px`;
      setScale(nextScale);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [natural.height, natural.width, ready]);

  // Redraw whenever committed items, scale, or readiness change.
  useEffect(() => {
    redraw();
  }, [items, redraw]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    },
    []
  );

  const commitDraft = useCallback(() => {
    const draft = draftRef.current;
    draftRef.current = null;
    if (!draft) {
      return;
    }
    // Drop near-zero circles (an accidental tap rather than a drag).
    if (
      draft.kind === "circle" &&
      (Math.abs(draft.w) < 4 || Math.abs(draft.h) < 4)
    ) {
      redraw();
      return;
    }
    // A highlighter tap-dot is just noise; pens keep single taps as a dot.
    if (draft.kind === "highlighter" && draft.points.length < 4) {
      redraw();
      return;
    }
    setItems((prev) => [...prev, draft]);
  }, [redraw]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      canvas.setPointerCapture(event.pointerId);
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      // A second finger starts a pinch-to-zoom gesture; abandon any in-progress draft.
      if (pointersRef.current.size >= 2) {
        draftRef.current = null;
        pinchedRef.current = true;
        const [p1, p2] = [...pointersRef.current.values()];
        pinchRef.current = {
          startCenter: pinchCenter(p1, p2),
          startDist: pinchDistance(p1, p2),
          startView: view,
        };
        scheduleRedraw();
        return;
      }

      if (pinchedRef.current || textDraft) {
        return;
      }

      const effectiveScale = scale * view.scale;
      const { x, y } = clientToNatural(
        canvas,
        event.clientX,
        event.clientY,
        effectiveScale
      );
      if (tool === "text") {
        setTextDraft({ natX: x, natY: y, value: "" });
        return;
      }
      if (tool === "circle") {
        draftRef.current = {
          color,
          h: 0,
          kind: "circle",
          w: 0,
          width: strokeWidth,
          x,
          y,
        };
      } else {
        draftRef.current = {
          color,
          kind: tool,
          points: [x, y],
          width: strokeWidth,
        } satisfies PenAnnotation;
      }
      scheduleRedraw();
    },
    [color, scale, scheduleRedraw, strokeWidth, textDraft, tool, view]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const stage = stageRef.current;
      if (!(canvas && stage)) {
        return;
      }
      if (pointersRef.current.has(event.pointerId)) {
        pointersRef.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
      }

      if (pointersRef.current.size >= 2 && pinchRef.current) {
        const [p1, p2] = [...pointersRef.current.values()];
        const dist = pinchDistance(p1, p2);
        const center = pinchCenter(p1, p2);
        const { startCenter, startDist, startView } = pinchRef.current;
        setView(
          clampView(
            {
              scale: startView.scale * (dist / startDist),
              x: startView.x + (center.x - startCenter.x),
              y: startView.y + (center.y - startCenter.y),
            },
            stage
          )
        );
        return;
      }

      const draft = draftRef.current;
      if (!draft || pinchedRef.current) {
        return;
      }
      const effectiveScale = scale * view.scale;
      const { x, y } = clientToNatural(
        canvas,
        event.clientX,
        event.clientY,
        effectiveScale
      );
      if (draft.kind === "circle") {
        draft.w = x - draft.x;
        draft.h = y - draft.y;
      } else if (draft.kind === "pen" || draft.kind === "highlighter") {
        draft.points.push(x, y);
      }
      scheduleRedraw();
    },
    [scale, scheduleRedraw, view]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      pointersRef.current.delete(event.pointerId);

      // One finger lifted mid-pinch: re-baseline on the remaining pair.
      if (pointersRef.current.size >= 2) {
        const [p1, p2] = [...pointersRef.current.values()];
        pinchRef.current = {
          startCenter: pinchCenter(p1, p2),
          startDist: pinchDistance(p1, p2),
          startView: view,
        };
        return;
      }

      pinchRef.current = null;
      if (pointersRef.current.size === 0) {
        pinchedRef.current = false;
        commitDraft();
      }
    },
    [commitDraft, view]
  );

  const commitText = useCallback(() => {
    setTextDraft((draft) => {
      if (draft && draft.value.trim()) {
        const annotation: Annotation = {
          color,
          kind: "text",
          size: textSize,
          text: draft.value,
          x: draft.natX,
          y: draft.natY,
        };
        setItems((prev) => [...prev, annotation]);
      }
      return null;
    });
  }, [color, textSize]);

  const handleUndo = () => setItems((prev) => prev.slice(0, -1));
  const handleClear = () => setItems([]);

  const handleSave = () => {
    onSave({ height: natural.height, items, width: natural.width });
  };

  const presets = sizePresets(natural.width || 1000);

  const toolButton = (value: Tool, label: string, icon: React.ReactNode) => (
    <button
      aria-label={label}
      aria-pressed={tool === value}
      className="photo-annotator__tool"
      onClick={() => setTool(value)}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );

  // Portal to <body> so the full-screen editor escapes the page's <main>
  // stacking context and layers above the fixed site navbar.
  return createPortal(
    <div aria-label="Annotate photo" className="photo-annotator" role="dialog">
      <header className="photo-annotator__bar">
        <WaButton appearance="plain" onClick={onCancel} size="small">
          <Xmark height={ICON} slot="start" width={ICON} />
          Cancel
        </WaButton>
        <span className="photo-annotator__title">Annotate photo</span>
        <WaButton
          appearance="filled"
          onClick={handleSave}
          size="small"
          variant="brand"
        >
          <Check height={ICON} slot="start" width={ICON} />
          Done
        </WaButton>
      </header>

      <div className="photo-annotator__stage" ref={stageRef}>
        <div
          className="photo-annotator__canvas-wrap"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
        >
          <canvas
            className="photo-annotator__canvas"
            onPointerCancel={handlePointerUp}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            ref={canvasRef}
          />
          {textDraft ? (
            <textarea
              autoFocus
              className="photo-annotator__text-input"
              onBlur={commitText}
              onChange={(event) =>
                setTextDraft((draft) =>
                  draft ? { ...draft, value: event.target.value } : draft
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  commitText();
                } else if (event.key === "Escape") {
                  setTextDraft(null);
                }
              }}
              placeholder="Type…"
              style={{
                color,
                fontSize: `${textSize * scale}px`,
                left: `${textDraft.natX * scale}px`,
                top: `${textDraft.natY * scale}px`,
              }}
              value={textDraft.value}
            />
          ) : null}
        </div>
      </div>

      <footer className="photo-annotator__toolbar">
        <div className="photo-annotator__group">
          {toolButton("pen", "Pen", <EditPencil height={ICON} width={ICON} />)}
          {toolButton(
            "highlighter",
            "Highlighter",
            <FillColor height={ICON} width={ICON} />
          )}
          {toolButton(
            "circle",
            "Circle",
            <Circle height={ICON} width={ICON} />
          )}
          {toolButton("text", "Text", <Text height={ICON} width={ICON} />)}
        </div>

        <div className="photo-annotator__group photo-annotator__colors">
          {COLORS.map((value) => (
            <button
              aria-label={`Color ${value}`}
              aria-pressed={color === value}
              className="photo-annotator__swatch"
              key={value}
              onClick={() => setColor(value)}
              style={{ background: value }}
              type="button"
            />
          ))}
        </div>

        <div className="photo-annotator__group">
          {(["small", "medium", "large"] as const).map((key) => {
            const isTextTool = tool === "text";
            const value = isTextTool
              ? presets[key] * TEXT_SIZE_MULTIPLIER
              : presets[key];
            const label = `${key} ${isTextTool ? "text size" : "width"}`;
            return (
              <button
                aria-label={label}
                aria-pressed={
                  isTextTool ? textSize === value : strokeWidth === value
                }
                className="photo-annotator__size"
                key={key}
                onClick={() =>
                  isTextTool ? setTextSize(value) : setStrokeWidth(value)
                }
                title={label}
                type="button"
              >
                <span
                  className="photo-annotator__size-dot"
                  style={{
                    height: `${Math.min(22, 6 + value * 0.9)}px`,
                    width: `${Math.min(22, 6 + value * 0.9)}px`,
                  }}
                />
              </button>
            );
          })}
        </div>

        <div className="photo-annotator__group">
          <button
            aria-label="Undo"
            className="photo-annotator__tool"
            disabled={items.length === 0}
            onClick={handleUndo}
            title="Undo"
            type="button"
          >
            <Undo height={ICON} width={ICON} />
          </button>
          <button
            aria-label="Clear all"
            className="photo-annotator__tool"
            disabled={items.length === 0}
            onClick={handleClear}
            title="Clear all"
            type="button"
          >
            <Trash height={ICON} width={ICON} />
          </button>
        </div>
      </footer>
    </div>,
    document.body
  );
};
