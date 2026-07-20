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

  const [items, setItems] = useState<Annotation[]>(initialScene?.items ?? []);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [natural, setNatural] = useState({ height: 0, width: 0 });
  const [scale, setScale] = useState(1);
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
  const [ready, setReady] = useState(false);

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
      setNatural({ height: decoded.height, width: decoded.width });
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
      if (!canvas || textDraft) {
        return;
      }
      const { x, y } = clientToNatural(
        canvas,
        event.clientX,
        event.clientY,
        scale
      );
      if (tool === "text") {
        setTextDraft({ natX: x, natY: y, value: "" });
        return;
      }
      canvas.setPointerCapture(event.pointerId);
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
    [color, scale, scheduleRedraw, strokeWidth, textDraft, tool]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const draft = draftRef.current;
      const canvas = canvasRef.current;
      if (!(draft && canvas)) {
        return;
      }
      const { x, y } = clientToNatural(
        canvas,
        event.clientX,
        event.clientY,
        scale
      );
      if (draft.kind === "circle") {
        draft.w = x - draft.x;
        draft.h = y - draft.y;
      } else if (draft.kind === "pen" || draft.kind === "highlighter") {
        draft.points.push(x, y);
      }
      scheduleRedraw();
    },
    [scale, scheduleRedraw]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      commitDraft();
    },
    [commitDraft]
  );

  const commitText = useCallback(() => {
    setTextDraft((draft) => {
      if (draft && draft.value.trim()) {
        const size = sizePresets(natural.width).large * 1.4;
        const annotation: Annotation = {
          color,
          kind: "text",
          size,
          text: draft.value,
          x: draft.natX,
          y: draft.natY,
        };
        setItems((prev) => [...prev, annotation]);
      }
      return null;
    });
  }, [color, natural.width]);

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
        <div className="photo-annotator__canvas-wrap">
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
                fontSize: `${presets.large * 1.4 * scale}px`,
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
          {(["small", "medium", "large"] as const).map((key) => (
            <button
              aria-label={`${key} width`}
              aria-pressed={strokeWidth === presets[key]}
              className="photo-annotator__size"
              key={key}
              onClick={() => setStrokeWidth(presets[key])}
              type="button"
            >
              <span
                className="photo-annotator__size-dot"
                style={{
                  height: `${Math.min(22, 6 + presets[key] * 0.9)}px`,
                  width: `${Math.min(22, 6 + presets[key] * 0.9)}px`,
                }}
              />
            </button>
          ))}
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
