import { usePostHog } from "@posthog/react";
import { toBlob } from "html-to-image";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  Eye,
  FastArrowDown,
  FastArrowUp,
  Lock,
  PlusSquare,
  QrCode,
  Text,
  Trash,
  Xmark,
} from "iconoir-react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CanvasElement,
  CanvasGuide,
  TextCanvasElement,
} from "../lib/ad-canvas-doc";
import {
  CANVAS_FONT_FAMILIES,
  collectSnapTargets,
  createElementId,
  createQrElement,
  createRectElement,
  createTextElement,
  findSnapShift,
  SNAP_THRESHOLD,
  seedCanvasElements,
  syncElementsFromCreative,
} from "../lib/ad-canvas-doc";
import type {
  CreativeState,
  LogoVariant,
  PlatformPreset,
  PlatformShape,
} from "../lib/ad-creative";
import { formatAdDimensions, getExportPixelSize } from "../lib/ad-creative";
import { buildCutoutMaskDataUri, renderDoorMockup } from "../lib/door-hanger";
import { buildQrDataUri } from "../lib/qr-code";
import { AdColorSwatch } from "./ad-color-swatch";

import "../styles/ad-canvas.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRAILING_NEWLINES_RE = /\n+$/;

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

const FIXED_HEIGHT_HANDLES: HandleId[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];
const AUTO_HEIGHT_HANDLES: HandleId[] = ["nw", "ne", "se", "sw", "e", "w"];

interface ContextMenuState {
  elementId: string;
  x: number;
  y: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPreviewBaseWidth = (shape: PlatformShape) => {
  if (shape === "wide") {
    return "56rem";
  }
  if (shape === "tall") {
    return "28rem";
  }
  return "44rem";
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

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
      (parsed.hostname === "images.unsplash.com" ||
        parsed.hostname === "plus.unsplash.com")
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
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const exportCanvasNode = async (
  node: HTMLElement,
  exportWidth: number,
  exportHeight: number,
  backgroundColor: string,
  stripMask = false
): Promise<Blob> => {
  if (document.fonts) {
    await document.fonts.ready;
  }

  const previousBoxShadow = node.style.boxShadow;
  node.style.boxShadow = "none";

  // For the door mockup we want a clean rectangular export (the mockup clips it
  // to the silhouette itself), so temporarily drop the die-cut mask.
  const previousMask = node.style.maskImage;
  const previousWebkitMask = node.style.webkitMaskImage;
  if (stripMask) {
    node.style.maskImage = "none";
    node.style.webkitMaskImage = "none";
  }

  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const previewWidth = node.offsetWidth;
    const previewHeight = node.offsetHeight;

    if (previewWidth <= 0 || previewHeight <= 0) {
      throw new Error("The ad canvas is not ready yet.");
    }

    const pixelRatio = Math.min(
      exportWidth / previewWidth,
      exportHeight / previewHeight
    );

    const blob = await toBlob(node, {
      backgroundColor,
      cacheBust: true,
      canvasHeight: exportHeight,
      canvasWidth: exportWidth,
      height: previewHeight,
      includeQueryParams: true,
      pixelRatio,
      skipAutoScale: true,
      type: "image/png",
      width: previewWidth,
    });

    if (!blob) {
      throw new Error("Could not export PNG.");
    }

    return blob;
  } finally {
    node.style.boxShadow = previousBoxShadow;
    if (stripMask) {
      node.style.maskImage = previousMask;
      node.style.webkitMaskImage = previousWebkitMask;
    }
  }
};

const blobToImage = (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load the exported design."));
    };
    img.src = url;
  });

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    tag.startsWith("WA-")
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export interface AdCanvasCaptureHandle {
  /** Capture a thumbnail of the current canvas. Returns a data URL or null on failure. */
  captureThumb: () => Promise<string | null>;
}

interface AdCanvasEditorProps {
  /** Ref that receives a { captureThumb } handle for capturing thumbnails. */
  captureRef?: React.RefObject<AdCanvasCaptureHandle | null>;
  creative: CreativeState;
  selectedPlatform: PlatformPreset;
  selectedPlatformShape: PlatformShape;
  /** Menus rendered after the toolbar actions (account). */
  toolbarEnd?: React.ReactNode;
  /** Menus rendered at the start of the toolbar (format/design/image/brand). */
  toolbarStart?: React.ReactNode;
}

export const AdCanvasEditor = ({
  captureRef,
  creative,
  selectedPlatform,
  selectedPlatformShape,
  toolbarStart,
  toolbarEnd,
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
}: AdCanvasEditorProps) => {
  const posthog = usePostHog();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<Record<string, HTMLElement | null>>({});
  const editRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [elements, setElements] = useState<CanvasElement[]>(() =>
    seedCanvasElements(creative, selectedPlatform.cutout)
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [guides, setGuides] = useState<CanvasGuide[]>([]);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [mockupBusy, setMockupBusy] = useState(false);
  const [mockupError, setMockupError] = useState<string | null>(null);

  const elementsRef = useRef(elements);
  elementsRef.current = elements;

  const exportPixelSize = useMemo(
    () =>
      getExportPixelSize(creative.adWidth, creative.adHeight, creative.unit),
    [creative.adWidth, creative.adHeight, creative.unit]
  );

  // Expose a captureThumb handle to the parent via captureRef.
  const exportPixelSizeRef = useRef(exportPixelSize);
  exportPixelSizeRef.current = exportPixelSize;
  const backgroundColorRef = useRef(creative.backgroundColor);
  backgroundColorRef.current = creative.backgroundColor;
  useEffect(() => {
    if (!captureRef) {
      return;
    }
    captureRef.current = {
      captureThumb: async () => {
        const node = canvasRef.current;
        if (!node) {
          return null;
        }
        try {
          const { width, height } = exportPixelSizeRef.current;
          const thumbWidth = 320;
          const thumbHeight = Math.round((height / width) * thumbWidth);
          const blob = await exportCanvasNode(
            node,
            thumbWidth,
            thumbHeight,
            backgroundColorRef.current
          );
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      },
    };
    return () => {
      captureRef.current = null;
    };
  }, [captureRef]);

  // ── Re-seed when template or platform changes ────────────────────────────
  const seedKey = `${creative.templateId}|${creative.platformId}|${creative.layout}|${creative.fontPresetId}`;
  const prevSeedKey = useRef(seedKey);
  useEffect(() => {
    if (prevSeedKey.current === seedKey) {
      return;
    }
    prevSeedKey.current = seedKey;
    setElements(seedCanvasElements(creative, selectedPlatform.cutout));
    setSelectedId(null);
    setEditingId(null);
    setMenu(null);
  }, [seedKey, creative, selectedPlatform.cutout]);

  // ── Sync panel copy edits into role elements ─────────────────────────────
  useEffect(() => {
    setElements((prev) => syncElementsFromCreative(prev, creative));
  }, [creative]);

  // ── Fit-to-viewport scaling ───────────────────────────────────────────────
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!(viewport && canvas)) {
      return;
    }

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

        if (
          availableWidth <= 0 ||
          availableHeight <= 0 ||
          canvasWidth <= 0 ||
          canvasHeight <= 0
        ) {
          setPreviewScale(1);
          return;
        }

        const nextScale = Math.min(
          1,
          availableWidth / canvasWidth,
          availableHeight / canvasHeight
        );
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
  }, []);

  // ── Element updates ───────────────────────────────────────────────────────
  const patchElement = useCallback(
    (id: string, patch: Partial<CanvasElement>) => {
      setElements((prev) =>
        prev.map((el) =>
          el.id === id ? ({ ...el, ...patch } as CanvasElement) : el
        )
      );
    },
    []
  );

  const removeElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedId((current) => (current === id ? null : current));
    setEditingId((current) => (current === id ? null : current));
    setMenu(null);
  }, []);

  const duplicateElement = useCallback((id: string) => {
    setElements((prev) => {
      const source = prev.find((el) => el.id === id);
      if (!source) {
        return prev;
      }
      const copy: CanvasElement = {
        ...source,
        id: createElementId(),
        locked: false,
        name: `${source.name} copy`,
        x: clamp(source.x + 3, -20, 95),
        y: clamp(source.y + 3, -20, 95),
      };
      setSelectedId(copy.id);
      return [...prev, copy];
    });
    setMenu(null);
  }, []);

  const moveLayer = useCallback(
    (id: string, action: "forward" | "backward" | "front" | "back") => {
      setElements((prev) => {
        const index = prev.findIndex((el) => el.id === id);
        if (index === -1) {
          return prev;
        }
        const next = [...prev];
        const [el] = next.splice(index, 1);
        const targetWhenNotFrontOrBack =
          action === "forward"
            ? Math.min(next.length, index + 1)
            : Math.max(0, index - 1);
        const targetWhenNotFront =
          action === "back" ? 0 : targetWhenNotFrontOrBack;
        const target = action === "front" ? next.length : targetWhenNotFront;
        next.splice(target, 0, el);
        return next;
      });
      setMenu(null);
    },
    []
  );

  // ── Inline text editing ───────────────────────────────────────────────────
  const beginEdit = useCallback((id: string) => {
    setEditingId(id);
    setMenu(null);
  }, []);

  useEffect(() => {
    if (!editingId) {
      return;
    }
    const node = editRef.current;
    if (!node) {
      return;
    }
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
      const text = node.textContent.replace(TRAILING_NEWLINES_RE, "");
      patchElement(editingId, { text });
    }
    setEditingId(null);
  }, [editingId, patchElement]);

  // ── Context menu open helper (shared by right-click and touch long-press) ──
  const openMenuAt = useCallback((x: number, y: number, elementId: string) => {
    setSelectedId(elementId);
    setMenu({ elementId, x, y });
  }, []);

  // ── Drag to move ──────────────────────────────────────────────────────────
  const startMove = useCallback(
    (event: ReactPointerEvent, id: string) => {
      if (event.button !== 0) {
        return;
      }
      if (editingId === id) {
        return;
      }
      const canvas = canvasRef.current;
      const el = elementsRef.current.find((item) => item.id === id);
      if (!(canvas && el)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setSelectedId(id);
      setMenu(null);
      if (editingId) {
        commitEdit();
      }

      const isTouch = event.pointerType === "touch";
      // Locked elements can't drag, but touch still needs the long-press menu.
      if (el.locked && !isTouch) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const origin = { height: el.height, width: el.width, x: el.x, y: el.y };
      const { xTargets, yTargets } = collectSnapTargets(
        elementsRef.current,
        id,
        rect.height / rect.width
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

      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
      const onMove = (move: PointerEvent) => {
        if (longPressFired) {
          return;
        }
        const dxPx = move.clientX - startX;
        const dyPx = move.clientY - startY;

        if (!dragging) {
          if (Math.hypot(dxPx, dyPx) < TOUCH_DRAG_DEAD_ZONE) {
            return;
          }
          cancelLongPress();
          if (el.locked) {
            return;
          }
          dragging = true;
        }

        const dx = (dxPx / rect.width) * 100;
        const dy = (dyPx / rect.height) * 100;
        let nx = origin.x + dx;
        let ny = origin.y + dy;

        const node = nodesRef.current[id];
        const heightPct =
          origin.height ??
          (node && canvas.offsetHeight > 0
            ? (node.offsetHeight / canvas.offsetHeight) * 100
            : 0);

        const xSnap = findSnapShift(
          [nx, nx + origin.width / 2, nx + origin.width],
          xTargets,
          SNAP_THRESHOLD
        );
        const ySnap = findSnapShift(
          [ny, ny + heightPct / 2, ny + heightPct],
          yTargets,
          SNAP_THRESHOLD
        );
        nx += xSnap.delta;
        ny += ySnap.delta;

        nx = clamp(nx, -origin.width + 2, 98);
        ny = clamp(ny, -heightPct + 2, 98);

        const nextGuides: CanvasGuide[] = [];
        if (xSnap.guide != null) {
          nextGuides.push({ axis: "x", position: xSnap.guide });
        }
        if (ySnap.guide != null) {
          nextGuides.push({ axis: "y", position: ySnap.guide });
        }

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
    [commitEdit, editingId, openMenuAt, patchElement]
  );

  // ── Resize via handles ────────────────────────────────────────────────────
  const startResize = useCallback(
    (event: ReactPointerEvent, id: string, handle: HandleId) => {
      if (event.button !== 0) {
        return;
      }
      const canvas = canvasRef.current;
      const el = elementsRef.current.find((item) => item.id === id);
      if (!(canvas && el) || el.locked) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const rect = canvas.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const origin = {
        fontSize: el.kind === "text" ? el.fontSize : 0,
        height: el.height,
        width: el.width,
        x: el.x,
        y: el.y,
      };
      const isCorner = handle.length === 2;
      const east = handle.includes("e");
      const west = handle.includes("w");
      const north = handle.includes("n");
      const south = handle.includes("s");

      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
      const onMove = (move: PointerEvent) => {
        const dx = ((move.clientX - startX) / rect.width) * 100;
        const dy = ((move.clientY - startY) / rect.height) * 100;

        let { width } = origin;
        if (east) {
          width = origin.width + dx;
        }
        if (west) {
          width = origin.width - dx;
        }
        width = Math.max(MIN_ELEMENT_WIDTH, width);

        let { height } = origin;
        if (origin.height != null) {
          if (isCorner) {
            height = origin.height * (width / origin.width);
          } else {
            if (south) {
              height = origin.height + dy;
            }
            if (north) {
              height = origin.height - dy;
            }
          }
          height = Math.max(MIN_ELEMENT_HEIGHT, height);
        }

        let { x } = origin;
        let { y } = origin;
        if (west) {
          x = origin.x + (origin.width - width);
        }
        if (north && origin.height != null && height != null) {
          y = origin.y + (origin.height - height);
        }

        const patch: Partial<CanvasElement> = { width, x, y };
        if (height != null) {
          patch.height = height;
        }
        if (el.kind === "text" && isCorner) {
          (patch as Partial<TextCanvasElement>).fontSize = clamp(
            origin.fontSize * (width / origin.width),
            MIN_FONT_SIZE,
            MAX_FONT_SIZE
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
    [patchElement]
  );

  // ── Context menu ──────────────────────────────────────────────────────────
  const openMenu = useCallback(
    (event: ReactPointerEvent | React.MouseEvent, id: string) => {
      event.preventDefault();
      event.stopPropagation();
      openMenuAt(event.clientX, event.clientY, id);
    },
    [openMenuAt]
  );

  useEffect(() => {
    if (!menu) {
      return;
    }
    const close = (event: MouseEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest(".ad-canvas-menu")
      ) {
        return;
      }
      setMenu(null);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menu]);

  // Keep the menu on-screen — long-press near a viewport edge would otherwise
  // push it off the bottom/right on small screens.
  useLayoutEffect(() => {
    const node = menuRef.current;
    if (!(menu && node)) {
      return;
    }
    const rect = node.getBoundingClientRect();
    const margin = 8;
    node.style.left = `${clamp(menu.x, margin, Math.max(margin, window.innerWidth - rect.width - margin))}px`;
    node.style.top = `${clamp(menu.y, margin, Math.max(margin, window.innerHeight - rect.height - margin))}px`;
  }, [menu]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
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

      if (isEditableTarget(event.target)) {
        return;
      }
      if (!selectedId) {
        return;
      }
      const selected = elementsRef.current.find((el) => el.id === selectedId);
      if (!selected) {
        return;
      }

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

  const addQr = useCallback(() => {
    const el = createQrElement();
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  }, []);

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
        true
      );
      downloadBlob(blob, `tandra-ad-${selectedPlatform.id}-${Date.now()}.png`);
      posthog?.capture("ad_creative_exported", {
        editor: "canvas",
        elementCount: elementsRef.current.length,
        layout: creative.layout,
        platform: selectedPlatform.id,
      });
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Could not export PNG."
      );
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

  const handlePreviewOnDoor = useCallback(async () => {
    const canvas = canvasRef.current;
    const cutoutSpec = selectedPlatform.cutout;
    if (!(canvas && cutoutSpec)) {
      return;
    }

    setSelectedId(null);
    setEditingId(null);
    setMenu(null);
    setMockupBusy(true);
    setMockupError(null);

    try {
      const blob = await exportCanvasNode(
        canvas,
        exportPixelSize.width,
        exportPixelSize.height,
        creative.backgroundColor,
        true
      );
      const design = await blobToImage(blob);
      const mockupBlob = await renderDoorMockup({
        cutout: cutoutSpec,
        design,
        hangerHeightInches: selectedPlatform.height,
        hangerWidthInches: selectedPlatform.width,
      });
      setMockupUrl((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }
        return URL.createObjectURL(mockupBlob);
      });
      posthog?.capture("ad_door_mockup_generated", {
        platform: selectedPlatform.id,
      });
    } catch (error) {
      setMockupError(
        error instanceof Error
          ? error.message
          : "Could not build the door mockup."
      );
    } finally {
      setMockupBusy(false);
    }
  }, [
    creative.backgroundColor,
    exportPixelSize.height,
    exportPixelSize.width,
    posthog,
    selectedPlatform.cutout,
    selectedPlatform.height,
    selectedPlatform.id,
    selectedPlatform.width,
  ]);

  const closeMockup = useCallback(() => {
    setMockupUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return null;
    });
    setMockupError(null);
  }, []);

  const backdropRef = useCallback(
    (node: HTMLDialogElement | null) => {
      if (!node) {
        return;
      }
      const handleClick = (e: MouseEvent) => {
        if (e.target === e.currentTarget) {
          closeMockup();
        }
      };
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          closeMockup();
        }
      };
      node.addEventListener("click", handleClick);
      node.addEventListener("keydown", handleKeyDown);
      return () => {
        node.removeEventListener("click", handleClick);
        node.removeEventListener("keydown", handleKeyDown);
      };
    },
    [closeMockup]
  );

  useEffect(
    () => () => {
      if (mockupUrl) {
        URL.revokeObjectURL(mockupUrl);
      }
    },
    [mockupUrl]
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const selected = elements.find((el) => el.id === selectedId) ?? null;

  const { cutout } = selectedPlatform;
  const canvasStyle: CSSProperties = {
    aspectRatio: `${exportPixelSize.width} / ${exportPixelSize.height}`,
    background: creative.backgroundColor,
    width: getPreviewBaseWidth(selectedPlatformShape),
  };
  if (cutout) {
    const maskUri = buildCutoutMaskDataUri(
      cutout,
      selectedPlatform.width,
      selectedPlatform.height
    );
    // The die-cut silhouette defines the corners + knob hole; drop the rounded
    // canvas frame so the mask isn't clipped twice.
    canvasStyle.borderRadius = 0;
    canvasStyle.maskImage = maskUri;
    canvasStyle.WebkitMaskImage = maskUri;
    canvasStyle.maskSize = "100% 100%";
    canvasStyle.WebkitMaskSize = "100% 100%";
    canvasStyle.maskRepeat = "no-repeat";
    canvasStyle.WebkitMaskRepeat = "no-repeat";
  }

  const frameStyle = {
    "--canvas-scale": String(previewScale),
    transform: `scale(${previewScale})`,
  } as CSSProperties;

  const getSelectionStyle = (el: CanvasElement): CSSProperties => {
    const style: CSSProperties = {
      left: `${el.x}%`,
      top: `${el.y}%`,
      width: `${el.width}%`,
    };
    if (el.height == null) {
      const node = nodesRef.current[el.id];
      const canvas = canvasRef.current;
      if (node && canvas && canvas.offsetHeight > 0) {
        style.height = `${(node.offsetHeight / canvas.offsetHeight) * 100}%`;
      }
    } else {
      style.height = `${el.height}%`;
    }
    return style;
  };

  // ── Render: elements ──────────────────────────────────────────────────────
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
  const renderElement = (el: CanvasElement, index: number) => {
    const isEditing = el.id === editingId;

    const style: CSSProperties = {
      // oxlint-disable-next-line eqeqeq no-eq-null
      height: el.height == null ? "auto" : `${el.height}%`,
      left: `${el.x}%`,
      opacity: el.opacity,
      position: "absolute",
      top: `${el.y}%`,
      width: `${el.width}%`,
      zIndex: index + 1,
    };

    let inner: React.ReactNode;

    if (el.kind === "text") {
      const textStyle: CSSProperties = {
        background: el.background ?? undefined,
        borderRadius: `${el.borderRadius}cqw`,
        color: el.color,
        fontFamily: el.fontFamily,
        fontSize: `${el.fontSize}cqw`,
        fontStyle: el.fontStyle,
        fontWeight: el.fontWeight,
        letterSpacing: `${el.letterSpacing}em`,
        lineHeight: el.lineHeight,
        padding: `${el.paddingY}cqw ${el.paddingX}cqw`,
        textAlign: el.textAlign,
        textTransform: el.textTransform,
      };
      inner = (
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: element becomes role="textbox" when isEditing; onBlur is undefined when not editing
        // biome-ignore lint/a11y/noStaticElementInteractions: element becomes role="textbox" when isEditing; onBlur is undefined when not editing
        // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-multiline is only set when role="textbox" is also active
        <div
          aria-multiline={isEditing ? "true" : undefined}
          className={`ad-canvas-text${isEditing ? "is-editing" : ""}`}
          contentEditable={isEditing}
          onBlur={isEditing ? commitEdit : undefined}
          ref={isEditing ? editRef : undefined}
          role={isEditing ? "textbox" : undefined}
          style={textStyle}
          suppressContentEditableWarning
        >
          {el.text}
        </div>
      );
    } else if (el.kind === "image") {
      inner = (
        // biome-ignore lint/correctness/useImageSize: dynamic size controlled by canvas element
        <img
          alt=""
          draggable={false}
          src={toCanvasImageUrl(el.src)}
          style={{ objectFit: el.objectFit }}
        />
      );
    } else if (el.kind === "logo") {
      inner = (
        // biome-ignore lint/correctness/useImageSize: dynamic size controlled by canvas element
        <img
          alt="Birdcreek Roofing"
          draggable={false}
          src={LOGO_SOURCES[el.variant]}
        />
      );
    } else if (el.kind === "qr") {
      inner = (
        // biome-ignore lint/correctness/useImageSize: dynamic size controlled by canvas element
        <img
          alt={`QR code linking to ${el.value}`}
          className="ad-canvas-qr"
          draggable={false}
          src={buildQrDataUri(el.value, el.fgColor, el.bgColor)}
        />
      );
    } else {
      inner = (
        <div
          className="ad-canvas-rect"
          style={{ background: el.fill, borderRadius: `${el.borderRadius}cqw` }}
        />
      );
    }

    return (
      <button
        aria-label={el.name}
        className={[
          "ad-canvas-el",
          el.locked && "ad-canvas-el is-locked",
          isEditing && "ad-canvas-el is-editing",
        ]
          .filter(Boolean)
          .join(" ")}
        key={el.id}
        onContextMenu={(event) => openMenu(event, el.id)}
        onDoubleClick={el.kind === "text" ? () => beginEdit(el.id) : undefined}
        onKeyDown={(event) => {
          if (event.key === "Enter" && el.kind === "text") {
            beginEdit(el.id);
          }
        }}
        onPointerDown={(event) => startMove(event, el.id)}
        ref={(node) => {
          nodesRef.current[el.id] = node;
        }}
        style={style}
        type="button"
      >
        {inner}
      </button>
    );
  };

  // ── Render: context bar controls ──────────────────────────────────────────
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
  const renderContextBar = () => {
    if (!selected) {
      return (
        <p className="ad-canvas-context-hint whitespace-pre-wrap">
          Select an element to edit it — drag to move, handles to resize,
          double-click text to edit, right-click for more.
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
              id="ad-font-family"
              name="ad-font-family"
              onChange={(event) =>
                patchElement(selected.id, { fontFamily: event.target.value })
              }
              value={selected.fontFamily}
            >
              {CANVAS_FONT_FAMILIES.map((font) => (
                <option key={font.css} value={font.css}>
                  {font.label}
                </option>
              ))}
            </select>
            <input
              aria-label="Font size"
              id="ad-font-size"
              max={MAX_FONT_SIZE}
              min={MIN_FONT_SIZE}
              name="ad-font-size"
              onChange={(event) => {
                const value = Number.parseFloat(event.target.value);
                if (Number.isFinite(value)) {
                  patchElement(selected.id, {
                    fontSize: clamp(value, MIN_FONT_SIZE, MAX_FONT_SIZE),
                  });
                }
              }}
              step={0.2}
              type="number"
              value={Number.parseFloat(selected.fontSize.toFixed(1))}
            />
            <AdColorSwatch
              label="Text color"
              onChange={(hex) => patchElement(selected.id, { color: hex })}
              value={selected.color}
            />
            <button
              aria-label="Bold"
              className={selected.fontWeight >= 700 ? "is-active" : ""}
              onClick={() =>
                patchElement(selected.id, {
                  fontWeight: selected.fontWeight >= 700 ? 400 : 750,
                })
              }
              type="button"
            >
              B
            </button>
            <button
              aria-label="Italic"
              className={selected.fontStyle === "italic" ? "is-active" : ""}
              onClick={() =>
                patchElement(selected.id, {
                  fontStyle:
                    selected.fontStyle === "italic" ? "normal" : "italic",
                })
              }
              type="button"
            >
              I
            </button>
            <button
              aria-label="Uppercase"
              className={
                selected.textTransform === "uppercase" ? "is-active" : ""
              }
              onClick={() =>
                patchElement(selected.id, {
                  textTransform:
                    selected.textTransform === "uppercase"
                      ? "none"
                      : "uppercase",
                })
              }
              type="button"
            >
              AA
            </button>
            <select
              aria-label="Text align"
              id="ad-text-align"
              name="ad-text-align"
              onChange={(event) =>
                patchElement(selected.id, {
                  textAlign: event.target
                    .value as TextCanvasElement["textAlign"],
                })
              }
              value={selected.textAlign}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
            <AdColorSwatch
              label="Background color"
              onChange={(hex) => patchElement(selected.id, { background: hex })}
              value={selected.background ?? "#000000"}
            />
            <button
              aria-label="Clear background"
              disabled={!selected.background}
              onClick={() => patchElement(selected.id, { background: null })}
              type="button"
            >
              No fill
            </button>
          </>
        ) : null}

        {selected.kind === "image" ? (
          <button
            onClick={() =>
              patchElement(selected.id, {
                objectFit: selected.objectFit === "cover" ? "contain" : "cover",
              })
            }
            type="button"
          >
            Fit: {selected.objectFit}
          </button>
        ) : null}

        {selected.kind === "rect" ? (
          <>
            <AdColorSwatch
              label="Fill color"
              onChange={(hex) => patchElement(selected.id, { fill: hex })}
              value={selected.fill}
            />
            <input
              aria-label="Corner radius"
              id="ad-border-radius"
              max={20}
              min={0}
              name="ad-border-radius"
              onChange={(event) => {
                const value = Number.parseFloat(event.target.value);
                if (Number.isFinite(value)) {
                  patchElement(selected.id, {
                    borderRadius: clamp(value, 0, 20),
                  });
                }
              }}
              step={0.5}
              type="number"
              value={selected.borderRadius}
            />
          </>
        ) : null}

        {selected.kind === "qr" ? (
          <>
            <input
              aria-label="QR code link"
              className="ad-canvas-qr-input"
              id="ad-qr-value"
              inputMode="url"
              name="ad-qr-value"
              onChange={(event) =>
                patchElement(selected.id, { value: event.target.value })
              }
              placeholder="https://..."
              type="text"
              value={selected.value}
            />
            <AdColorSwatch
              label="QR color"
              onChange={(hex) => patchElement(selected.id, { fgColor: hex })}
              value={selected.fgColor}
            />
            <AdColorSwatch
              label="QR background"
              onChange={(hex) => patchElement(selected.id, { bgColor: hex })}
              value={selected.bgColor}
            />
          </>
        ) : null}

        {selected.kind === "logo" ? (
          <select
            aria-label="Logo variant"
            id="ad-logo-variant"
            name="ad-logo-variant"
            onChange={(event) =>
              patchElement(selected.id, {
                variant: event.target.value as LogoVariant,
              })
            }
            value={selected.variant}
          >
            <option value="horizontal-white">Horizontal (white)</option>
            <option value="vertical-white">Vertical (white)</option>
          </select>
        ) : null}

        <label className="ad-canvas-opacity">
          <span>Opacity</span>
          <input
            id="ad-opacity"
            max={100}
            min={10}
            name="ad-opacity"
            onChange={(event) =>
              patchElement(selected.id, {
                opacity: Number.parseInt(event.target.value, 10) / 100,
              })
            }
            type="range"
            value={Math.round(selected.opacity * 100)}
          />
        </label>

        <span className="ad-canvas-context-spacer" />

        <fieldset aria-label="Layer order" className="ad-canvas-layer-group">
          <button
            aria-label="Bring forward"
            onClick={() => moveLayer(selected.id, "forward")}
            title="Bring forward"
            type="button"
          >
            <ArrowUp height={15} width={15} />
          </button>
          <button
            aria-label="Send backward"
            onClick={() => moveLayer(selected.id, "backward")}
            title="Send backward"
            type="button"
          >
            <ArrowDown height={15} width={15} />
          </button>
          <button
            aria-label="Bring to front"
            onClick={() => moveLayer(selected.id, "front")}
            title="Bring to front"
            type="button"
          >
            <FastArrowUp height={15} width={15} />
          </button>
          <button
            aria-label="Send to back"
            onClick={() => moveLayer(selected.id, "back")}
            title="Send to back"
            type="button"
          >
            <FastArrowDown height={15} width={15} />
          </button>
        </fieldset>

        <button
          aria-label={selected.locked ? "Unlock" : "Lock"}
          className={selected.locked ? "is-active" : ""}
          onClick={() =>
            patchElement(selected.id, { locked: !selected.locked })
          }
          type="button"
        >
          <Lock height={15} width={15} />
        </button>
        <button
          aria-label="Duplicate"
          onClick={() => duplicateElement(selected.id)}
          type="button"
        >
          <Copy height={15} width={15} />
        </button>
        <button
          aria-label="Delete"
          className="is-danger"
          onClick={() => removeElement(selected.id)}
          type="button"
        >
          <Trash height={15} width={15} />
        </button>
      </div>
    );
  };

  const selectedHandles =
    selected?.height == null ? AUTO_HEIGHT_HANDLES : FIXED_HEIGHT_HANDLES;
  const handles = selected ? selectedHandles : [];

  const mockupContent = mockupUrl ? (
    <>
      {/* biome-ignore lint/correctness/useImageSize: dynamic size controlled by CSS */}
      <img
        alt="The door hanger design shown hanging on a real door"
        className="ad-mockup-image"
        src={mockupUrl}
      />
      <a
        className="ad-dashboard-export"
        download={`tandra-door-hanger-mockup-${Date.now()}.png`}
        href={mockupUrl}
      >
        <Download height={18} width={18} />
        Download mockup
      </a>
    </>
  ) : null;

  return (
    <section className="ad-dashboard-stage">
      <div className="ad-dashboard-toolbar">
        {toolbarStart}
        <div className="ad-dashboard-toolbar-meta">
          <strong>{selectedPlatform.label}</strong>
          <span>
            {formatAdDimensions(
              creative.adWidth,
              creative.adHeight,
              creative.unit
            )}
            {creative.unit === "in"
              ? ` · ${exportPixelSize.width} x ${exportPixelSize.height}px export`
              : null}
          </span>
        </div>
        <div className="ad-canvas-toolbar-actions">
          <button className="ad-canvas-add-btn" onClick={addText} type="button">
            <Text height={16} width={16} />
            Text
          </button>
          <button
            className="ad-canvas-add-btn"
            onClick={addShape}
            type="button"
          >
            <PlusSquare height={16} width={16} />
            Shape
          </button>
          <button className="ad-canvas-add-btn" onClick={addQr} type="button">
            <QrCode height={16} width={16} />
            QR code
          </button>
          {cutout ? (
            <button
              className="ad-canvas-add-btn"
              disabled={mockupBusy}
              onClick={() => {
                handlePreviewOnDoor();
              }}
              type="button"
            >
              <Eye height={16} width={16} />
              {mockupBusy ? "Rendering..." : "Preview on door"}
            </button>
          ) : null}
          <button
            className="ad-dashboard-export"
            disabled={exporting}
            onClick={() => {
              handleExport();
            }}
            type="button"
          >
            <Download height={18} width={18} />
            {exporting ? "Exporting..." : "Export PNG"}
          </button>
          {toolbarEnd}
        </div>
      </div>

      <div className="ad-canvas-context-bar">{renderContextBar()}</div>

      {exportError ? (
        <p className="ad-dashboard-error ad-dashboard-export-error">
          {exportError}
        </p>
      ) : null}

      <div
        className="ad-dashboard-preview-wrap ad-canvas-viewport"
        ref={viewportRef}
      >
        <div className="ad-canvas-frame" style={frameStyle}>
          <div
            className="ad-canvas"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedId(null);
                setMenu(null);
                if (editingId) {
                  commitEdit();
                }
              }
            }}
            ref={canvasRef}
            style={canvasStyle}
          >
            {elements.map(renderElement)}
          </div>

          <div aria-hidden className="ad-canvas-overlay">
            {guides.map((guide) => (
              <div
                className={`ad-canvas-guide ad-canvas-guide--${guide.axis}`}
                key={`${guide.axis}-${guide.position}`}
                style={
                  guide.axis === "x"
                    ? { left: `${guide.position}%` }
                    : { top: `${guide.position}%` }
                }
              />
            ))}

            {selected ? (
              <div
                className={`ad-canvas-selection${selected.locked ? "is-locked" : ""}`}
                style={getSelectionStyle(selected)}
              >
                {selected.locked
                  ? null
                  : handles.map((handle) => (
                      <div
                        className={`ad-canvas-handle ad-canvas-handle--${handle}`}
                        key={handle}
                        onPointerDown={(event) =>
                          startResize(event, selected.id, handle)
                        }
                      />
                    ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {menu ? (
        <div
          className="ad-canvas-menu"
          ref={menuRef}
          role="menu"
          style={{ left: menu.x, top: menu.y }}
        >
          {(() => {
            const el = elements.find((item) => item.id === menu.elementId);
            if (!el) {
              return null;
            }
            return (
              <>
                {el.kind === "text" ? (
                  <button
                    onClick={() => beginEdit(el.id)}
                    role="menuitem"
                    type="button"
                  >
                    Edit text
                  </button>
                ) : null}
                <button
                  onClick={() => duplicateElement(el.id)}
                  role="menuitem"
                  type="button"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => moveLayer(el.id, "forward")}
                  role="menuitem"
                  type="button"
                >
                  Bring forward
                </button>
                <button
                  onClick={() => moveLayer(el.id, "backward")}
                  role="menuitem"
                  type="button"
                >
                  Send backward
                </button>
                <button
                  onClick={() => moveLayer(el.id, "front")}
                  role="menuitem"
                  type="button"
                >
                  Bring to front
                </button>
                <button
                  onClick={() => moveLayer(el.id, "back")}
                  role="menuitem"
                  type="button"
                >
                  Send to back
                </button>
                <button
                  onClick={() => {
                    patchElement(el.id, { locked: !el.locked });
                    setMenu(null);
                  }}
                  role="menuitem"
                  type="button"
                >
                  {el.locked ? "Unlock" : "Lock"}
                </button>
                <button
                  className="is-danger"
                  onClick={() => removeElement(el.id)}
                  role="menuitem"
                  type="button"
                >
                  Delete
                </button>
              </>
            );
          })()}
        </div>
      ) : null}

      {mockupUrl || mockupError ? (
        <dialog
          aria-label="Door hanger mockup"
          aria-modal="true"
          className="ad-mockup-backdrop"
          open
          ref={backdropRef}
        >
          <div className="ad-mockup-modal">
            <div className="ad-mockup-head">
              <strong>Door hanger preview</strong>
              <button
                aria-label="Close preview"
                className="ad-mockup-close"
                onClick={closeMockup}
                type="button"
              >
                <Xmark height={18} width={18} />
              </button>
            </div>
            {mockupError ? (
              <p className="ad-dashboard-error">{mockupError}</p>
            ) : (
              mockupContent
            )}
          </div>
        </dialog>
      ) : null}
    </section>
  );
};
