import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import {
  Check,
  Circle,
  Edit,
  EditPencil,
  FillColor,
  Redo,
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

import {
  drawScene,
  TEXT_FONT,
  TEXT_LINE_HEIGHT_MULTIPLIER,
} from "../../lib/report-pdf/annotate-composite";
import type {
  Annotation,
  AnnotationScene,
  PenAnnotation,
  TextAnnotation,
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
  /** Set when re-editing an existing text item's color/size instead of the current tool defaults. */
  color?: string;
  natX: number;
  natY: number;
  size?: number;
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
const TOUCH_DRAW_THRESHOLD_PX = 4;
const LOCKED_VIEWPORT_SUFFIX = "maximum-scale=1, user-scalable=no";

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

/** Tap/click tolerance (natural px) around a text item's bounding box. */
const TEXT_HIT_PADDING = 10;

/** Bounding box of a text item in natural px, matching drawScene's layout. */
const measureTextItem = (
  ctx: CanvasRenderingContext2D,
  item: TextAnnotation
): { height: number; width: number } => {
  ctx.font = `600 ${item.size}px ${TEXT_FONT}`;
  const lines = item.text.split("\n");
  const width = Math.max(
    0,
    ...lines.map((line) => ctx.measureText(line).width)
  );
  const height =
    (lines.length - 1) * item.size * TEXT_LINE_HEIGHT_MULTIPLIER + item.size;
  return { height, width };
};

/** Topmost (last-drawn) text item whose bounding box contains (x, y), if any. */
const findTextHitIndex = (
  ctx: CanvasRenderingContext2D,
  items: Annotation[],
  x: number,
  y: number
): number | null => {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (item.kind !== "text") {
      continue;
    }
    const { width, height } = measureTextItem(ctx, item);
    if (
      x >= item.x - TEXT_HIT_PADDING &&
      x <= item.x + width + TEXT_HIT_PADDING &&
      y >= item.y - TEXT_HIT_PADDING &&
      y <= item.y + height + TEXT_HIT_PADDING
    ) {
      return i;
    }
  }
  return null;
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
  const pendingTouchRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const pinchRef = useRef<{
    startCenter: { x: number; y: number };
    startDist: number;
    startView: ViewTransform;
  } | null>(null);
  const pinchedRef = useRef(false);
  /** In-progress drag of an already-placed text item (grab offset + live position). */
  const moveRef = useRef<{
    index: number;
    moved: boolean;
    offsetX: number;
    offsetY: number;
    x: number;
    y: number;
  } | null>(null);
  const pastRef = useRef<Annotation[][]>([]);
  const futureRef = useRef<Annotation[][]>([]);

  const [items, setItems] = useState<Annotation[]>(initialScene?.items ?? []);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [natural, setNatural] = useState({ height: 0, width: 0 });
  const [scale, setScale] = useState(1);
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [textSize, setTextSize] = useState(6 * TEXT_SIZE_MULTIPLIER);
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(
    null
  );
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 });
  const [historyCounts, setHistoryCounts] = useState({ future: 0, past: 0 });

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // iOS Safari may claim a pinch for page zoom before the canvas receives its
  // second pointer. Lock the browser viewport only while this full-screen
  // editor is open; the photo still zooms through the local view transform.
  useEffect(() => {
    const viewport = document.querySelector<HTMLMetaElement>(
      'meta[name="viewport"]'
    );
    if (!viewport) {
      return;
    }
    const originalContent = viewport.content;
    viewport.content = `${originalContent}, ${LOCKED_VIEWPORT_SUFFIX}`;
    return () => {
      viewport.content = originalContent;
    };
  }, []);

  /** Replaces the scene and records an undo step (skipped for no-op moves). */
  const commitItems = useCallback((next: Annotation[]) => {
    pastRef.current = [...pastRef.current, itemsRef.current];
    futureRef.current = [];
    setHistoryCounts({ future: 0, past: pastRef.current.length });
    setItems(next);
  }, []);

  useEffect(() => {
    if (tool !== "text") {
      setSelectedTextIndex(null);
    }
  }, [tool]);

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
      pendingTouchRef.current = null;
      pinchRef.current = null;
      pinchedRef.current = false;
      moveRef.current = null;
      pastRef.current = [];
      futureRef.current = [];
      setHistoryCounts({ future: 0, past: 0 });
      setSelectedTextIndex(null);
      setEditingIndex(null);
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

    let draftItems = itemsRef.current;
    const move = moveRef.current;
    if (move) {
      draftItems = draftItems.map((it, i) =>
        i === move.index ? { ...it, x: move.x, y: move.y } : it
      );
    }
    if (editingIndex !== null) {
      draftItems = draftItems.filter((_, i) => i !== editingIndex);
    }
    if (draftRef.current) {
      draftItems = [...draftItems, draftRef.current];
    }

    drawScene(
      ctx,
      { height: bitmap.height, items: draftItems, width: bitmap.width },
      scale
    );

    const selectedIndex = move ? move.index : selectedTextIndex;
    const selectedItem =
      selectedIndex === null ? undefined : draftItems[selectedIndex];
    if (selectedItem && selectedItem.kind === "text") {
      const { width, height } = measureTextItem(ctx, selectedItem);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        (selectedItem.x - TEXT_HIT_PADDING) * scale,
        (selectedItem.y - TEXT_HIT_PADDING) * scale,
        (width + TEXT_HIT_PADDING * 2) * scale,
        (height + TEXT_HIT_PADDING * 2) * scale
      );
      ctx.restore();
    }
  }, [editingIndex, scale, selectedTextIndex]);

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
    // oxlint-disable-next-line react-doctor/no-pass-live-state-to-parent -- redraw() only paints the local canvas ref, it doesn't call any parent prop.
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

  // iOS Safari can promote a two-finger canvas gesture to viewport zoom even
  // with touch-action:none. Cancel its native pinch events on the photo only;
  // our pointer handlers below continue to apply the zoom to canvas-wrap.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const preventNativePinch = (event: Event): void => {
      event.preventDefault();
    };
    const preventMultiTouch = (event: TouchEvent): void => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };
    canvas.addEventListener("gesturestart", preventNativePinch, {
      passive: false,
    });
    canvas.addEventListener("gesturechange", preventNativePinch, {
      passive: false,
    });
    // oxlint-disable-next-line github/require-passive-events -- iOS viewport zoom requires preventDefault on touchmove.
    canvas.addEventListener("touchmove", preventMultiTouch, {
      passive: false,
    });
    return () => {
      canvas.removeEventListener("gesturestart", preventNativePinch);
      canvas.removeEventListener("gesturechange", preventNativePinch);
      canvas.removeEventListener("touchmove", preventMultiTouch);
    };
  }, [ready]);

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
    commitItems([...itemsRef.current, draft]);
  }, [commitItems, redraw]);

  const beginSinglePointer = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      if (pinchedRef.current || textDraft) {
        return;
      }

      const effectiveScale = scale * view.scale;
      const { x, y } = clientToNatural(
        canvas,
        clientX,
        clientY,
        effectiveScale
      );
      if (tool === "text") {
        const ctx = canvas.getContext("2d");
        const hitIndex = ctx
          ? findTextHitIndex(ctx, itemsRef.current, x, y)
          : null;
        if (hitIndex !== null) {
          const item = itemsRef.current[hitIndex] as TextAnnotation;
          setSelectedTextIndex(hitIndex);
          moveRef.current = {
            index: hitIndex,
            moved: false,
            offsetX: x - item.x,
            offsetY: y - item.y,
            x: item.x,
            y: item.y,
          };
          scheduleRedraw();
          return;
        }
        setSelectedTextIndex(null);
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

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      // A second finger claims the interaction for pinch zoom before the first
      // touch is allowed to become a drawing or text-placement gesture.
      if (pointersRef.current.size >= 2) {
        for (const pointerId of pointersRef.current.keys()) {
          canvas.setPointerCapture(pointerId);
        }
        pendingTouchRef.current = null;
        draftRef.current = null;
        moveRef.current = null;
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

      // Text placement always waits for pointer-up. Some iPhone Safari builds
      // report the first contact without a reliable pointerType, so using the
      // tool itself as a pending-tap signal keeps a later second finger from
      // leaving text behind when the interaction becomes a pinch.
      if (event.pointerType === "touch" || tool === "text") {
        pendingTouchRef.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
        };
        return;
      }

      canvas.setPointerCapture(event.pointerId);
      beginSinglePointer(event.clientX, event.clientY);
    },
    [beginSinglePointer, scheduleRedraw, tool, view]
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

      if (pinchedRef.current) {
        return;
      }

      const pendingTouch = pendingTouchRef.current;
      if (
        pendingTouch?.pointerId === event.pointerId &&
        Math.hypot(
          event.clientX - pendingTouch.x,
          event.clientY - pendingTouch.y
        ) >= TOUCH_DRAW_THRESHOLD_PX
      ) {
        pendingTouchRef.current = null;
        canvas.setPointerCapture(event.pointerId);
        beginSinglePointer(pendingTouch.x, pendingTouch.y);
      }

      const effectiveScale = scale * view.scale;
      const move = moveRef.current;
      if (move) {
        const { x, y } = clientToNatural(
          canvas,
          event.clientX,
          event.clientY,
          effectiveScale
        );
        const nextX = x - move.offsetX;
        const nextY = y - move.offsetY;
        moveRef.current = {
          ...move,
          moved: move.moved || nextX !== move.x || nextY !== move.y,
          x: nextX,
          y: nextY,
        };
        scheduleRedraw();
        return;
      }

      const draft = draftRef.current;
      if (!draft) {
        return;
      }
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
    [beginSinglePointer, scale, scheduleRedraw, view]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      const pendingTouch = pendingTouchRef.current;
      if (pendingTouch?.pointerId === event.pointerId) {
        pendingTouchRef.current = null;
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
        if (pendingTouch && !pinchedRef.current) {
          beginSinglePointer(pendingTouch.x, pendingTouch.y);
        }
        pinchedRef.current = false;
        const move = moveRef.current;
        moveRef.current = null;
        if (move) {
          if (move.moved) {
            commitItems(
              itemsRef.current.map((it, i) =>
                i === move.index ? { ...it, x: move.x, y: move.y } : it
              )
            );
          }
          return;
        }
        commitDraft();
      }
    },
    [beginSinglePointer, commitDraft, commitItems, view]
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      pointersRef.current.delete(event.pointerId);
      if (pendingTouchRef.current?.pointerId === event.pointerId) {
        pendingTouchRef.current = null;
      }
      // Cancellation means Safari or the browser claimed the gesture. Never
      // turn it into a tap, text placement, stroke, or completed text move.
      draftRef.current = null;
      moveRef.current = null;
      if (pointersRef.current.size < 2) {
        pinchRef.current = null;
      }
      if (pointersRef.current.size === 0) {
        pinchedRef.current = false;
      }
      scheduleRedraw();
    },
    [scheduleRedraw]
  );

  const commitText = useCallback(() => {
    const draft = textDraft;
    if (!draft) {
      return;
    }
    const trimmed = draft.value.trim();
    if (editingIndex !== null) {
      if (trimmed) {
        const original = itemsRef.current[editingIndex] as TextAnnotation;
        const updated: TextAnnotation = {
          ...original,
          color: draft.color ?? original.color,
          size: draft.size ?? original.size,
          text: draft.value,
          x: draft.natX,
          y: draft.natY,
        };
        commitItems(
          itemsRef.current.map((it, i) => (i === editingIndex ? updated : it))
        );
      } else {
        commitItems(itemsRef.current.filter((_, i) => i !== editingIndex));
      }
      setEditingIndex(null);
    } else if (trimmed) {
      const nextSize = draft.size ?? textSize;
      const nextColor = draft.color ?? color;
      const annotation: Annotation = {
        color: nextColor,
        kind: "text",
        size: nextSize,
        text: draft.value,
        x: draft.natX,
        y: draft.natY,
      };
      commitItems([...itemsRef.current, annotation]);
      setSelectedTextIndex(itemsRef.current.length);
      // Remember the size/color as the default for the next new text.
      setTextSize(nextSize);
      setColor(nextColor);
    }
    setTextDraft(null);
  }, [color, commitItems, editingIndex, textDraft, textSize]);

  const beginEditSelected = useCallback(() => {
    if (selectedTextIndex === null) {
      return;
    }
    const item = itemsRef.current[selectedTextIndex];
    if (!item || item.kind !== "text") {
      return;
    }
    setEditingIndex(selectedTextIndex);
    setSelectedTextIndex(null);
    setTextDraft({
      color: item.color,
      natX: item.x,
      natY: item.y,
      size: item.size,
      value: item.text,
    });
  }, [selectedTextIndex]);

  const deleteSelected = useCallback(() => {
    if (selectedTextIndex === null) {
      return;
    }
    commitItems(itemsRef.current.filter((_, i) => i !== selectedTextIndex));
    setSelectedTextIndex(null);
  }, [commitItems, selectedTextIndex]);

  const handleUndo = useCallback(() => {
    const previous = pastRef.current.at(-1);
    if (previous === undefined) {
      return;
    }
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [itemsRef.current, ...futureRef.current];
    setHistoryCounts({
      future: futureRef.current.length,
      past: pastRef.current.length,
    });
    setSelectedTextIndex(null);
    setItems(previous);
  }, []);

  const handleRedo = useCallback(() => {
    const next = futureRef.current.at(0);
    if (next === undefined) {
      return;
    }
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current, itemsRef.current];
    setHistoryCounts({
      future: futureRef.current.length,
      past: pastRef.current.length,
    });
    setSelectedTextIndex(null);
    setItems(next);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedTextIndex(null);
    commitItems([]);
  }, [commitItems]);

  // Delete/Backspace removes the selected text item; Cmd/Ctrl+Z undoes and
  // Cmd/Ctrl+Shift+Z (or Ctrl+Y) redoes, as long as no text field is focused.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "TEXTAREA" || target.tagName === "INPUT")
      ) {
        return;
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedTextIndex !== null
      ) {
        event.preventDefault();
        deleteSelected();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, handleRedo, handleUndo, selectedTextIndex]);

  const handleSave = () => {
    onSave({ height: natural.height, items, width: natural.width });
  };

  const selectedTextItem =
    selectedTextIndex === null ? null : items[selectedTextIndex];
  const activeTextSize = textDraft
    ? (textDraft.size ?? textSize)
    : selectedTextItem && selectedTextItem.kind === "text"
      ? selectedTextItem.size
      : textSize;
  const activeColor = textDraft
    ? (textDraft.color ?? color)
    : selectedTextItem && selectedTextItem.kind === "text"
      ? selectedTextItem.color
      : color;

  // The size slider fires continuously while dragging; only snapshot history
  // once per drag (reset on release) so undo isn't flooded with one entry per tick.
  const sizeDragSnapshotRef = useRef(false);

  const setActiveTextSize = (size: number) => {
    if (textDraft) {
      setTextDraft((draft) => (draft ? { ...draft, size } : draft));
      return;
    }
    if (selectedTextIndex !== null) {
      if (!sizeDragSnapshotRef.current) {
        pastRef.current = [...pastRef.current, itemsRef.current];
        futureRef.current = [];
        sizeDragSnapshotRef.current = true;
      }
      setHistoryCounts({ future: 0, past: pastRef.current.length });
      setItems(
        itemsRef.current.map((it, i) =>
          i === selectedTextIndex ? { ...it, size } : it
        )
      );
      return;
    }
    setTextSize(size);
  };

  const endSizeDrag = () => {
    sizeDragSnapshotRef.current = false;
  };

  const setActiveColor = (value: string) => {
    if (textDraft) {
      setTextDraft((draft) => (draft ? { ...draft, color: value } : draft));
      return;
    }
    if (selectedTextIndex !== null) {
      commitItems(
        itemsRef.current.map((it, i) =>
          i === selectedTextIndex ? { ...it, color: value } : it
        )
      );
      return;
    }
    setColor(value);
  };

  const presets = sizePresets(natural.width || 1000);
  const minTextSize = Math.max(
    4,
    Math.round(presets.small * TEXT_SIZE_MULTIPLIER * 0.5)
  );
  const maxTextSize = Math.round(presets.large * TEXT_SIZE_MULTIPLIER * 3);
  const showTextControls = tool === "text" || selectedTextIndex !== null;

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
            onPointerCancel={handlePointerCancel}
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
                  setEditingIndex(null);
                }
              }}
              placeholder="Type…"
              style={{
                color: textDraft.color ?? color,
                fontSize: `${(textDraft.size ?? textSize) * scale}px`,
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
              aria-pressed={activeColor === value}
              className="photo-annotator__swatch"
              key={value}
              onClick={() => setActiveColor(value)}
              style={{ background: value }}
              type="button"
            />
          ))}
        </div>

        {showTextControls ? (
          <div className="photo-annotator__group photo-annotator__text-size">
            <label
              className="photo-annotator__text-size-label"
              htmlFor="photo-annotator-text-size"
            >
              Font size
            </label>
            <input
              aria-label="Font size"
              className="photo-annotator__text-size-range"
              style={{
                minBlockSize: 40,
              }}
              id="photo-annotator-text-size"
              max={maxTextSize}
              min={minTextSize}
              onChange={(event) =>
                setActiveTextSize(Number(event.target.value))
              }
              onPointerUp={endSizeDrag}
              type="range"
              value={Math.round(activeTextSize)}
            />
            <span className="photo-annotator__text-size-value">
              {Math.round(activeTextSize)}px
            </span>
            {selectedTextIndex === null ? null : (
              <>
                <button
                  aria-label="Edit text"
                  className="photo-annotator__tool"
                  onClick={beginEditSelected}
                  title="Edit text"
                  type="button"
                >
                  <Edit height={ICON} width={ICON} />
                </button>
                <button
                  aria-label="Delete text"
                  className="photo-annotator__tool"
                  onClick={deleteSelected}
                  title="Delete text"
                  type="button"
                >
                  <Trash height={ICON} width={ICON} />
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="photo-annotator__group">
            {(["small", "medium", "large"] as const).map((key) => {
              const value = presets[key];
              const label = `${key} width`;
              return (
                <button
                  aria-label={label}
                  aria-pressed={strokeWidth === value}
                  className="photo-annotator__size"
                  key={key}
                  onClick={() => setStrokeWidth(value)}
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
        )}

        <div className="photo-annotator__group">
          <button
            aria-label="Undo"
            className="photo-annotator__tool"
            disabled={historyCounts.past === 0}
            onClick={handleUndo}
            title="Undo"
            type="button"
          >
            <Undo height={ICON} width={ICON} />
          </button>
          <button
            aria-label="Redo"
            className="photo-annotator__tool"
            disabled={historyCounts.future === 0}
            onClick={handleRedo}
            title="Redo"
            type="button"
          >
            <Redo height={ICON} width={ICON} />
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
