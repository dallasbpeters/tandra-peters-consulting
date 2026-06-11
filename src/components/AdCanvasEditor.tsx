import { usePostHog } from "@posthog/react";
import { toBlob } from "html-to-image";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  FastArrowDown,
  FastArrowUp,
  Lock,
  PlusSquare,
  Text,
  Trash,
} from "iconoir-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { CreativeState, LogoVariant, PlatformPreset, PlatformShape } from "../lib/adCreative";

import {
  CANVAS_FONT_FAMILIES,
  SNAP_THRESHOLD,
  collectSnapTargets,
  createElementId,
  createRectElement,
  createTextElement,
  findSnapShift,
  seedCanvasElements,
  syncElementsFromCreative,
  type CanvasElement,
  type CanvasGuide,
  type TextCanvasElement,
} from "../lib/adCanvasDoc";
import { formatAdDimensions, getExportPixelSize } from "../lib/adCreative";
import { AdColorSwatch } from "./AdColorSwatch";
import "../styles/ad-canvas.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const LOGO_SOURCES: Record<LogoVariant, string> = {
  "horizontal-white": "/BC_Horizontal_White.svg",
  "vertical-white": "/BC_Vertical_White.svg",
};

const MIN_ELEMENT_WIDTH = 3;
const MIN_ELEMENT_HEIGHT = 2;
const MIN_FONT_SIZE = 0.8;
const MAX_FONT_SIZE = 40;
const NUDGE_STEP = 0.5;
const NUDGE_STEP_LARGE = 2;

/** Touch has no right-click — holding still this long opens the context menu. */
const LONG_PRESS_MS = 450;
/** Pointer travel (px) below which a touch is a press, not a drag. */
const TOUCH_DRAG_DEAD_ZONE = 8;

type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const FIXED_HEIGHT_HANDLES: HandleId[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const AUTO_HEIGHT_HANDLES: HandleId[] = ["nw", "ne", "se", "sw", "e", "w"];

type ContextMenuState = { x: number; y: number; elementId: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPreviewBaseWidth = (shape: PlatformShape) => {
  if (shape === "wide") return "56rem";
  if (shape === "tall") return "28rem";
  return "44rem";
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toCanvasImageUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === "https:" &&
      parsed.hostname === "cdn.sanity.io" &&
      parsed.pathname.startsWith("/images/7irm699i/production/")
    ) {
      return `/api/sanity-image?url=${encodeURIComponent(url)}`;
    }
    if (
      parsed.protocol === "https:" &&
      (parsed.hostname === "images.unsplash.com" || parsed.hostname === "plus.unsplash.com")
    ) {
      return `/api/unsplash-image?url=${encodeURIComponent(url)}`;
    }
  } catch {
    return url;
  }
  return url;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const exportCanvasNode = async (
  node: HTMLElement,
  exportWidth: number,
  exportHeight: number,
  backgroundColor: string,
): Promise<Blob> => {
  if (document.fonts) {
    await document.fonts.ready;
  }

  const previousBoxShadow = node.style.boxShadow;
  node.style.boxShadow = "none";

  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const previewWidth = node.offsetWidth;
    const previewHeight = node.offsetHeight;

    if (previewWidth <= 0 || previewHeight <= 0) {
      throw new Error("The ad canvas is not ready yet.");
    }

    const pixelRatio = Math.min(exportWidth / previewWidth, exportHeight / previewHeight);

    const blob = await toBlob(node, {
      backgroundColor,
      cacheBust: true,
      canvasWidth: exportWidth,
      canvasHeight: exportHeight,
      height: previewHeight,
      includeQueryParams: true,
      pixelRatio,
      skipAutoScale: true,
      type: "image/png",
      width: previewWidth,
    });

    if (!blob) throw new Error("Could not export PNG.");

    return blob;
  } finally {
    node.style.boxShadow = previousBoxShadow;
  }
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag.startsWith("WA-");
};

// ─── Component ────────────────────────────────────────────────────────────────

type AdCanvasEditorProps = {
  creative: CreativeState;
  selectedPlatform: PlatformPreset;
  selectedPlatformShape: PlatformShape;
  /** Menus rendered at the start of the toolbar (format/design/image/brand). */
  toolbarStart?: React.ReactNode;
  /** Menus rendered after the toolbar actions (account). */
  toolbarEnd?: React.ReactNode;
};

export const AdCanvasEditor = ({
  creative,
  selectedPlatform,
  selectedPlatformShape,
  toolbarStart,
  toolbarEnd,
}: AdCanvasEditorProps) => {
  const posthog = usePostHog();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<Record<string, HTMLDivElement | null>>({});
  const editRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [elements, setElements] = useState<CanvasElement[]>(() => seedCanvasElements(creative));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [guides, setGuides] = useState<CanvasGuide[]>([]);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const elementsRef = useRef(elements);
  elementsRef.current = elements;

  const exportPixelSize = useMemo(
    () => getExportPixelSize(creative.adWidth, creative.adHeight, creative.unit),
    [creative.adWidth, creative.adHeight, creative.unit],
  );

  // ── Re-seed when template or platform changes ────────────────────────────
  const seedKey = `${creative.templateId}|${creative.platformId}|${creative.layout}|${creative.fontPresetId}`;
  const prevSeedKey = useRef(seedKey);
  useEffect(() => {
    if (prevSeedKey.current === seedKey) return;
    prevSeedKey.current = seedKey;
    setElements(seedCanvasElements(creative));
    setSelectedId(null);
    setEditingId(null);
    setMenu(null);
  }, [seedKey, creative]);

  // ── Sync panel copy edits into role elements ─────────────────────────────
  useEffect(() => {
    setElements((prev) => syncElementsFromCreative(prev, creative));
  }, [creative]);

  // ── Fit-to-viewport scaling ───────────────────────────────────────────────
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return undefined;

    let frame = 0;

    const updateScale = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const styles = getComputedStyle(viewport);
        const availableWidth =
          viewport.clientWidth -
          Number.parseFloat(styles.paddingLeft) -
          Number.parseFloat(styles.paddingRight);
        const availableHeight =
          viewport.clientHeight -
          Number.parseFloat(styles.paddingTop) -
          Number.parseFloat(styles.paddingBottom);
        const canvasWidth = canvas.offsetWidth;
        const canvasHeight = canvas.offsetHeight;

        if (availableWidth <= 0 || availableHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
          setPreviewScale(1);
          return;
        }

        const nextScale = Math.min(1, availableWidth / canvasWidth, availableHeight / canvasHeight);
        setPreviewScale(Number.parseFloat(Math.max(0.1, nextScale).toFixed(3)));
      });
    };

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(viewport);
    resizeObserver.observe(canvas);
    updateScale();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [exportPixelSize.height, exportPixelSize.width, selectedPlatformShape]);

  // ── Element updates ───────────────────────────────────────────────────────
  const patchElement = useCallback((id: string, patch: Partial<CanvasElement>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? ({ ...el, ...patch } as CanvasElement) : el)),
    );
  }, []);

  const removeElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedId((current) => (current === id ? null : current));
    setEditingId((current) => (current === id ? null : current));
    setMenu(null);
  }, []);

  const duplicateElement = useCallback((id: string) => {
    setElements((prev) => {
      const source = prev.find((el) => el.id === id);
      if (!source) return prev;
      const copy: CanvasElement = {
        ...source,
        id: createElementId(),
        name: `${source.name} copy`,
        x: clamp(source.x + 3, -20, 95),
        y: clamp(source.y + 3, -20, 95),
        locked: false,
      };
      setSelectedId(copy.id);
      return [...prev, copy];
    });
    setMenu(null);
  }, []);

  const moveLayer = useCallback((id: string, action: "forward" | "backward" | "front" | "back") => {
    setElements((prev) => {
      const index = prev.findIndex((el) => el.id === id);
      if (index < 0) return prev;
      const next = [...prev];
      const [el] = next.splice(index, 1);
      const target =
        action === "front"
          ? next.length
          : action === "back"
            ? 0
            : action === "forward"
              ? Math.min(next.length, index + 1)
              : Math.max(0, index - 1);
      next.splice(target, 0, el);
      return next;
    });
    setMenu(null);
  }, []);

  // ── Inline text editing ───────────────────────────────────────────────────
  const beginEdit = useCallback((id: string) => {
    setEditingId(id);
    setMenu(null);
  }, []);

  useEffect(() => {
    if (!editingId) return;
    const node = editRef.current;
    if (!node) return;
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editingId]);

  const commitEdit = useCallback(() => {
    const node = editRef.current;
    if (node && editingId) {
      const text = node.innerText.replace(/\n+$/, "");
      patchElement(editingId, { text });
    }
    setEditingId(null);
  }, [editingId, patchElement]);

  // ── Context menu open helper (shared by right-click and touch long-press) ──
  const openMenuAt = useCallback((x: number, y: number, elementId: string) => {
    setSelectedId(elementId);
    setMenu({ x, y, elementId });
  }, []);

  // ── Drag to move ──────────────────────────────────────────────────────────
  const startMove = useCallback(
    (event: ReactPointerEvent, id: string) => {
      if (event.button !== 0) return;
      if (editingId === id) return;
      const canvas = canvasRef.current;
      const el = elementsRef.current.find((item) => item.id === id);
      if (!canvas || !el) return;

      event.preventDefault();
      event.stopPropagation();
      setSelectedId(id);
      setMenu(null);
      if (editingId) commitEdit();

      const isTouch = event.pointerType === "touch";
      // Locked elements can't drag, but touch still needs the long-press menu.
      if (el.locked && !isTouch) return;

      const rect = canvas.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const origin = { x: el.x, y: el.y, width: el.width, height: el.height };
      const { xTargets, yTargets } = collectSnapTargets(
        elementsRef.current,
        id,
        rect.height / rect.width,
      );

      // Touch: the element doesn't move inside the dead zone, so a long-press
      // opens the menu without nudging it. Mouse drags start immediately.
      let dragging = !isTouch;
      let longPressFired = false;
      let longPressTimer: number | null = isTouch
        ? window.setTimeout(() => {
            longPressFired = true;
            setGuides([]);
            openMenuAt(startX, startY, id);
          }, LONG_PRESS_MS)
        : null;

      const cancelLongPress = () => {
        if (longPressTimer != null) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };

      const onMove = (move: PointerEvent) => {
        if (longPressFired) return;
        const dxPx = move.clientX - startX;
        const dyPx = move.clientY - startY;

        if (!dragging) {
          if (Math.hypot(dxPx, dyPx) < TOUCH_DRAG_DEAD_ZONE) return;
          cancelLongPress();
          if (el.locked) return;
          dragging = true;
        }

        const dx = (dxPx / rect.width) * 100;
        const dy = (dyPx / rect.height) * 100;
        let nx = origin.x + dx;
        let ny = origin.y + dy;

        const node = nodesRef.current[id];
        const heightPct =
          origin.height ??
          (node && canvas.offsetHeight > 0 ? (node.offsetHeight / canvas.offsetHeight) * 100 : 0);

        const xSnap = findSnapShift(
          [nx, nx + origin.width / 2, nx + origin.width],
          xTargets,
          SNAP_THRESHOLD,
        );
        const ySnap = findSnapShift(
          [ny, ny + heightPct / 2, ny + heightPct],
          yTargets,
          SNAP_THRESHOLD,
        );
        nx += xSnap.delta;
        ny += ySnap.delta;

        nx = clamp(nx, -origin.width + 2, 98);
        ny = clamp(ny, -heightPct + 2, 98);

        const nextGuides: CanvasGuide[] = [];
        if (xSnap.guide != null) nextGuides.push({ axis: "x", position: xSnap.guide });
        if (ySnap.guide != null) nextGuides.push({ axis: "y", position: ySnap.guide });

        patchElement(id, { x: nx, y: ny });
        setGuides(nextGuides);
      };

      const onUp = () => {
        cancelLongPress();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        setGuides([]);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [commitEdit, editingId, openMenuAt, patchElement],
  );

  // ── Resize via handles ────────────────────────────────────────────────────
  const startResize = useCallback(
    (event: ReactPointerEvent, id: string, handle: HandleId) => {
      if (event.button !== 0) return;
      const canvas = canvasRef.current;
      const el = elementsRef.current.find((item) => item.id === id);
      if (!canvas || !el || el.locked) return;

      event.preventDefault();
      event.stopPropagation();

      const rect = canvas.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const origin = {
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        fontSize: el.kind === "text" ? el.fontSize : 0,
      };
      const isCorner = handle.length === 2;
      const east = handle.includes("e");
      const west = handle.includes("w");
      const north = handle.includes("n");
      const south = handle.includes("s");

      const onMove = (move: PointerEvent) => {
        const dx = ((move.clientX - startX) / rect.width) * 100;
        const dy = ((move.clientY - startY) / rect.height) * 100;

        let width = origin.width;
        if (east) width = origin.width + dx;
        if (west) width = origin.width - dx;
        width = Math.max(MIN_ELEMENT_WIDTH, width);

        let height = origin.height;
        if (origin.height != null) {
          if (isCorner) {
            height = origin.height * (width / origin.width);
          } else {
            if (south) height = origin.height + dy;
            if (north) height = origin.height - dy;
          }
          height = Math.max(MIN_ELEMENT_HEIGHT, height);
        }

        let x = origin.x;
        let y = origin.y;
        if (west) x = origin.x + (origin.width - width);
        if (north && origin.height != null && height != null) {
          y = origin.y + (origin.height - height);
        }

        const patch: Partial<CanvasElement> = { x, y, width };
        if (height != null) patch.height = height;
        if (el.kind === "text" && isCorner) {
          (patch as Partial<TextCanvasElement>).fontSize = clamp(
            origin.fontSize * (width / origin.width),
            MIN_FONT_SIZE,
            MAX_FONT_SIZE,
          );
        }

        patchElement(id, patch);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
    },
    [patchElement],
  );

  // ── Context menu ──────────────────────────────────────────────────────────
  const openMenu = useCallback(
    (event: ReactPointerEvent | React.MouseEvent, id: string) => {
      event.preventDefault();
      event.stopPropagation();
      openMenuAt(event.clientX, event.clientY, id);
    },
    [openMenuAt],
  );

  useEffect(() => {
    if (!menu) return undefined;
    const close = (event: MouseEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest(".ad-canvas-menu")) return;
      setMenu(null);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menu]);

  // Keep the menu on-screen — long-press near a viewport edge would otherwise
  // push it off the bottom/right on small screens.
  useLayoutEffect(() => {
    const node = menuRef.current;
    if (!menu || !node) return;
    const rect = node.getBoundingClientRect();
    const margin = 8;
    node.style.left = `${clamp(menu.x, margin, Math.max(margin, window.innerWidth - rect.width - margin))}px`;
    node.style.top = `${clamp(menu.y, margin, Math.max(margin, window.innerHeight - rect.height - margin))}px`;
  }, [menu]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (menu) {
          setMenu(null);
          return;
        }
        if (editingId) {
          commitEdit();
          return;
        }
        setSelectedId(null);
        return;
      }

      if (isEditableTarget(event.target)) return;
      if (!selectedId) return;
      const selected = elementsRef.current.find((el) => el.id === selectedId);
      if (!selected) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        if (!selected.locked) {
          event.preventDefault();
          removeElement(selectedId);
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateElement(selectedId);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "]") {
        event.preventDefault();
        moveLayer(selectedId, event.shiftKey ? "front" : "forward");
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "[") {
        event.preventDefault();
        moveLayer(selectedId, event.shiftKey ? "back" : "backward");
        return;
      }

      const step = event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP;
      if (event.key === "ArrowLeft" && !selected.locked) {
        event.preventDefault();
        patchElement(selectedId, { x: selected.x - step });
      } else if (event.key === "ArrowRight" && !selected.locked) {
        event.preventDefault();
        patchElement(selectedId, { x: selected.x + step });
      } else if (event.key === "ArrowUp" && !selected.locked) {
        event.preventDefault();
        patchElement(selectedId, { y: selected.y - step });
      } else if (event.key === "ArrowDown" && !selected.locked) {
        event.preventDefault();
        patchElement(selectedId, { y: selected.y + step });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    commitEdit,
    duplicateElement,
    editingId,
    menu,
    moveLayer,
    patchElement,
    removeElement,
    selectedId,
  ]);

  // ── Add elements ──────────────────────────────────────────────────────────
  const addText = useCallback(() => {
    const el = createTextElement("Your text here");
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  }, []);

  const addShape = useCallback(() => {
    const el = createRectElement(creative.accentColor);
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  }, [creative.accentColor]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setExportError("The ad canvas is not ready yet.");
      return;
    }

    setSelectedId(null);
    setEditingId(null);
    setMenu(null);
    setExporting(true);
    setExportError(null);

    try {
      const blob = await exportCanvasNode(
        canvas,
        exportPixelSize.width,
        exportPixelSize.height,
        creative.backgroundColor,
      );
      downloadBlob(blob, `tandra-ad-${selectedPlatform.id}-${Date.now()}.png`);
      posthog?.capture("ad_creative_exported", {
        platform: selectedPlatform.id,
        layout: creative.layout,
        elementCount: elementsRef.current.length,
        editor: "canvas",
      });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Could not export PNG.");
    } finally {
      setExporting(false);
    }
  }, [
    creative.backgroundColor,
    creative.layout,
    exportPixelSize.height,
    exportPixelSize.width,
    posthog,
    selectedPlatform.id,
  ]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const selected = elements.find((el) => el.id === selectedId) ?? null;

  const canvasStyle: CSSProperties = {
    width: getPreviewBaseWidth(selectedPlatformShape),
    aspectRatio: `${exportPixelSize.width} / ${exportPixelSize.height}`,
    background: creative.backgroundColor,
  };

  const frameStyle = {
    transform: `scale(${previewScale})`,
    "--canvas-scale": String(previewScale),
  } as CSSProperties;

  const getSelectionStyle = (el: CanvasElement): CSSProperties => {
    const style: CSSProperties = {
      left: `${el.x}%`,
      top: `${el.y}%`,
      width: `${el.width}%`,
    };
    if (el.height != null) {
      style.height = `${el.height}%`;
    } else {
      const node = nodesRef.current[el.id];
      const canvas = canvasRef.current;
      if (node && canvas && canvas.offsetHeight > 0) {
        style.height = `${(node.offsetHeight / canvas.offsetHeight) * 100}%`;
      }
    }
    return style;
  };

  // ── Render: elements ──────────────────────────────────────────────────────
  const renderElement = (el: CanvasElement, index: number) => {
    const isEditing = el.id === editingId;

    const style: CSSProperties = {
      left: `${el.x}%`,
      top: `${el.y}%`,
      width: `${el.width}%`,
      height: el.height != null ? `${el.height}%` : "auto",
      opacity: el.opacity,
      zIndex: index + 1,
    };

    let inner: React.ReactNode;

    if (el.kind === "text") {
      const textStyle: CSSProperties = {
        fontFamily: el.fontFamily,
        fontWeight: el.fontWeight,
        fontStyle: el.fontStyle,
        fontSize: `${el.fontSize}cqw`,
        lineHeight: el.lineHeight,
        letterSpacing: `${el.letterSpacing}em`,
        textAlign: el.textAlign,
        textTransform: el.textTransform,
        color: el.color,
        background: el.background ?? undefined,
        padding: `${el.paddingY}cqw ${el.paddingX}cqw`,
        borderRadius: `${el.borderRadius}cqw`,
      };
      inner = (
        <div
          className={`ad-canvas-text${isEditing ? " is-editing" : ""}`}
          style={textStyle}
          contentEditable={isEditing}
          suppressContentEditableWarning
          ref={isEditing ? editRef : undefined}
          onBlur={isEditing ? commitEdit : undefined}
        >
          {el.text}
        </div>
      );
    } else if (el.kind === "image") {
      inner = (
        <img
          src={toCanvasImageUrl(el.src)}
          alt=""
          draggable={false}
          style={{ objectFit: el.objectFit }}
        />
      );
    } else if (el.kind === "logo") {
      inner = <img src={LOGO_SOURCES[el.variant]} alt="Birdcreek Roofing" draggable={false} />;
    } else {
      inner = (
        <div
          className="ad-canvas-rect"
          style={{ background: el.fill, borderRadius: `${el.borderRadius}cqw` }}
        />
      );
    }

    return (
      <div
        key={el.id}
        ref={(node) => {
          nodesRef.current[el.id] = node;
        }}
        className={`ad-canvas-el${el.locked ? " is-locked" : ""}${isEditing ? " is-editing" : ""}`}
        style={style}
        onPointerDown={(event) => startMove(event, el.id)}
        onDoubleClick={el.kind === "text" ? () => beginEdit(el.id) : undefined}
        onContextMenu={(event) => openMenu(event, el.id)}
      >
        {inner}
      </div>
    );
  };

  // ── Render: context bar controls ──────────────────────────────────────────
  const renderContextBar = () => {
    if (!selected) {
      return (
        <p className="ad-canvas-context-hint">
          Select an element to edit it — drag to move, handles to resize, double-click text to edit,
          right-click for more.
        </p>
      );
    }

    return (
      <div className="ad-canvas-context-controls">
        <span className="ad-canvas-context-name">{selected.name}</span>

        {selected.kind === "text" ? (
          <>
            <select
              aria-label="Font family"
              value={selected.fontFamily}
              onChange={(event) => patchElement(selected.id, { fontFamily: event.target.value })}
            >
              {CANVAS_FONT_FAMILIES.map((font) => (
                <option key={font.css} value={font.css}>
                  {font.label}
                </option>
              ))}
            </select>
            <input
              aria-label="Font size"
              type="number"
              min={MIN_FONT_SIZE}
              max={MAX_FONT_SIZE}
              step={0.2}
              value={Number.parseFloat(selected.fontSize.toFixed(1))}
              onChange={(event) => {
                const value = Number.parseFloat(event.target.value);
                if (Number.isFinite(value)) {
                  patchElement(selected.id, {
                    fontSize: clamp(value, MIN_FONT_SIZE, MAX_FONT_SIZE),
                  });
                }
              }}
            />
            <AdColorSwatch
              label="Text color"
              value={selected.color}
              onChange={(hex) => patchElement(selected.id, { color: hex })}
            />
            <button
              type="button"
              className={selected.fontWeight >= 700 ? "is-active" : ""}
              aria-label="Bold"
              onClick={() =>
                patchElement(selected.id, { fontWeight: selected.fontWeight >= 700 ? 400 : 750 })
              }
            >
              B
            </button>
            <button
              type="button"
              className={selected.fontStyle === "italic" ? "is-active" : ""}
              aria-label="Italic"
              onClick={() =>
                patchElement(selected.id, {
                  fontStyle: selected.fontStyle === "italic" ? "normal" : "italic",
                })
              }
            >
              I
            </button>
            <button
              type="button"
              className={selected.textTransform === "uppercase" ? "is-active" : ""}
              aria-label="Uppercase"
              onClick={() =>
                patchElement(selected.id, {
                  textTransform: selected.textTransform === "uppercase" ? "none" : "uppercase",
                })
              }
            >
              AA
            </button>
            <select
              aria-label="Text align"
              value={selected.textAlign}
              onChange={(event) =>
                patchElement(selected.id, {
                  textAlign: event.target.value as TextCanvasElement["textAlign"],
                })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
            <AdColorSwatch
              label="Background color"
              value={selected.background ?? "#000000"}
              onChange={(hex) => patchElement(selected.id, { background: hex })}
            />
            <button
              type="button"
              aria-label="Clear background"
              disabled={!selected.background}
              onClick={() => patchElement(selected.id, { background: null })}
            >
              No fill
            </button>
          </>
        ) : null}

        {selected.kind === "image" ? (
          <button
            type="button"
            onClick={() =>
              patchElement(selected.id, {
                objectFit: selected.objectFit === "cover" ? "contain" : "cover",
              })
            }
          >
            Fit: {selected.objectFit}
          </button>
        ) : null}

        {selected.kind === "rect" ? (
          <>
            <AdColorSwatch
              label="Fill color"
              value={selected.fill}
              onChange={(hex) => patchElement(selected.id, { fill: hex })}
            />
            <input
              aria-label="Corner radius"
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={selected.borderRadius}
              onChange={(event) => {
                const value = Number.parseFloat(event.target.value);
                if (Number.isFinite(value)) {
                  patchElement(selected.id, { borderRadius: clamp(value, 0, 20) });
                }
              }}
            />
          </>
        ) : null}

        {selected.kind === "logo" ? (
          <select
            aria-label="Logo variant"
            value={selected.variant}
            onChange={(event) =>
              patchElement(selected.id, { variant: event.target.value as LogoVariant })
            }
          >
            <option value="horizontal-white">Horizontal (white)</option>
            <option value="vertical-white">Vertical (white)</option>
          </select>
        ) : null}

        <label className="ad-canvas-opacity">
          <span>Opacity</span>
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(selected.opacity * 100)}
            onChange={(event) =>
              patchElement(selected.id, { opacity: Number.parseInt(event.target.value, 10) / 100 })
            }
          />
        </label>

        <span className="ad-canvas-context-spacer" />

        <div className="ad-canvas-layer-group" role="group" aria-label="Layer order">
          <button
            type="button"
            aria-label="Bring forward"
            title="Bring forward"
            onClick={() => moveLayer(selected.id, "forward")}
          >
            <ArrowUp width={15} height={15} />
          </button>
          <button
            type="button"
            aria-label="Send backward"
            title="Send backward"
            onClick={() => moveLayer(selected.id, "backward")}
          >
            <ArrowDown width={15} height={15} />
          </button>
          <button
            type="button"
            aria-label="Bring to front"
            title="Bring to front"
            onClick={() => moveLayer(selected.id, "front")}
          >
            <FastArrowUp width={15} height={15} />
          </button>
          <button
            type="button"
            aria-label="Send to back"
            title="Send to back"
            onClick={() => moveLayer(selected.id, "back")}
          >
            <FastArrowDown width={15} height={15} />
          </button>
        </div>

        <button
          type="button"
          aria-label={selected.locked ? "Unlock" : "Lock"}
          className={selected.locked ? "is-active" : ""}
          onClick={() => patchElement(selected.id, { locked: !selected.locked })}
        >
          <Lock width={15} height={15} />
        </button>
        <button type="button" aria-label="Duplicate" onClick={() => duplicateElement(selected.id)}>
          <Copy width={15} height={15} />
        </button>
        <button
          type="button"
          aria-label="Delete"
          className="is-danger"
          onClick={() => removeElement(selected.id)}
        >
          <Trash width={15} height={15} />
        </button>
      </div>
    );
  };

  const handles = selected
    ? selected.height != null
      ? FIXED_HEIGHT_HANDLES
      : AUTO_HEIGHT_HANDLES
    : [];

  return (
    <section className="ad-dashboard-stage">
      <div className="ad-dashboard-toolbar">
        {toolbarStart}
        <div className="ad-dashboard-toolbar-meta">
          <strong>{selectedPlatform.label}</strong>
          <span>
            {formatAdDimensions(creative.adWidth, creative.adHeight, creative.unit)}
            {creative.unit === "in"
              ? ` · ${exportPixelSize.width} x ${exportPixelSize.height}px export`
              : null}
          </span>
        </div>
        <div className="ad-canvas-toolbar-actions">
          <button type="button" className="ad-canvas-add-btn" onClick={addText}>
            <Text width={16} height={16} />
            Text
          </button>
          <button type="button" className="ad-canvas-add-btn" onClick={addShape}>
            <PlusSquare width={16} height={16} />
            Shape
          </button>
          <button
            type="button"
            className="ad-dashboard-export"
            onClick={() => void handleExport()}
            disabled={exporting}
          >
            <Download width={18} height={18} />
            {exporting ? "Exporting..." : "Export PNG"}
          </button>
          {toolbarEnd}
        </div>
      </div>

      <div className="ad-canvas-context-bar">{renderContextBar()}</div>

      {exportError ? (
        <p className="ad-dashboard-error ad-dashboard-export-error">{exportError}</p>
      ) : null}

      <div className="ad-dashboard-preview-wrap ad-canvas-viewport" ref={viewportRef}>
        <div className="ad-canvas-frame" style={frameStyle}>
          <div
            className="ad-canvas"
            ref={canvasRef}
            style={canvasStyle}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedId(null);
                setMenu(null);
                if (editingId) commitEdit();
              }
            }}
          >
            {elements.map(renderElement)}
          </div>

          <div className="ad-canvas-overlay" aria-hidden>
            {guides.map((guide, index) => (
              <div
                key={`${guide.axis}-${guide.position}-${index}`}
                className={`ad-canvas-guide ad-canvas-guide--${guide.axis}`}
                style={
                  guide.axis === "x"
                    ? { left: `${guide.position}%` }
                    : { top: `${guide.position}%` }
                }
              />
            ))}

            {selected ? (
              <div
                className={`ad-canvas-selection${selected.locked ? " is-locked" : ""}`}
                style={getSelectionStyle(selected)}
              >
                {!selected.locked
                  ? handles.map((handle) => (
                      <div
                        key={handle}
                        className={`ad-canvas-handle ad-canvas-handle--${handle}`}
                        onPointerDown={(event) => startResize(event, selected.id, handle)}
                      />
                    ))
                  : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {menu ? (
        <div
          ref={menuRef}
          className="ad-canvas-menu"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          {(() => {
            const el = elements.find((item) => item.id === menu.elementId);
            if (!el) return null;
            return (
              <>
                {el.kind === "text" ? (
                  <button type="button" role="menuitem" onClick={() => beginEdit(el.id)}>
                    Edit text
                  </button>
                ) : null}
                <button type="button" role="menuitem" onClick={() => duplicateElement(el.id)}>
                  Duplicate
                </button>
                <button type="button" role="menuitem" onClick={() => moveLayer(el.id, "forward")}>
                  Bring forward
                </button>
                <button type="button" role="menuitem" onClick={() => moveLayer(el.id, "backward")}>
                  Send backward
                </button>
                <button type="button" role="menuitem" onClick={() => moveLayer(el.id, "front")}>
                  Bring to front
                </button>
                <button type="button" role="menuitem" onClick={() => moveLayer(el.id, "back")}>
                  Send to back
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    patchElement(el.id, { locked: !el.locked });
                    setMenu(null);
                  }}
                >
                  {el.locked ? "Unlock" : "Lock"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="is-danger"
                  onClick={() => removeElement(el.id)}
                >
                  Delete
                </button>
              </>
            );
          })()}
        </div>
      ) : null}
    </section>
  );
};
