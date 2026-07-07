// oxlint-disable func-style promise/prefer-await-to-then
import type WaCheckboxElement from "@awesome.me/webawesome/dist/components/checkbox/checkbox.js";
import type WaNumberInputElement from "@awesome.me/webawesome/dist/components/number-input/number-input.js";
import type WaSliderElement from "@awesome.me/webawesome/dist/components/slider/slider.js";
import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaCheckbox from "@awesome.me/webawesome/dist/react/checkbox/index.js";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaNumberInput from "@awesome.me/webawesome/dist/react/number-input/index.js";
import WaOption from "@awesome.me/webawesome/dist/react/option/index.js";
import WaSelect from "@awesome.me/webawesome/dist/react/select/index.js";
import WaSlider from "@awesome.me/webawesome/dist/react/slider/index.js";
import WaTextarea from "@awesome.me/webawesome/dist/react/textarea/index.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useColorSchemeValue } from "sanity";

import { falStudioApiEndpoint } from "../fal-studio-config";
import { useStudioClient } from "../hooks/useStudioClient";

import "./falImageStudioTool.css";

type BackgroundRemovalModel = "birefnet-heavy" | "bria" | "ideogram";
type GenerateMode = "text" | "image" | "series" | "remove-bg" | "remove-sky";
type FalModelId =
  | "fal-ai/ideogram/remove-background"
  | "fal-ai/flux/schnell"
  | "fal-ai/flux/dev"
  | "fal-ai/flux-lora"
  | "fal-ai/flux/krea"
  | "fal-ai/flux-pro/v1.1"
  | "fal-ai/flux-pro/v1.1-ultra"
  | "fal-ai/flux-pro/kontext/text-to-image"
  | "fal-ai/flux-2/flash"
  | "fal-ai/flux-2"
  | "fal-ai/flux-2-pro"
  | "fal-ai/qwen-image"
  | "fal-ai/ideogram/v3"
  | "fal-ai/recraft/v4/text-to-image"
  | "fal-ai/bytedance/seedream/v4/text-to-image"
  | "fal-ai/imagen4/preview"
  | "fal-ai/nano-banana-pro";
type FalImageSize =
  | "square_hd"
  | "square"
  | "portrait_4_3"
  | "portrait_16_9"
  | "landscape_4_3"
  | "landscape_16_9";

interface SanityImageAsset {
  _id: string;
  altText?: string;
  metadata?: {
    dimensions?: {
      height?: number;
      width?: number;
    };
    lqip?: string;
  };
  originalFilename?: string;
  title?: string;
  url: string;
}

interface FalGeneratedImage {
  contentType: string;
  fileName: string;
  fileSize?: number;
  height?: number;
  prompt?: string;
  requestId?: string;
  url: string;
  variation?: string;
  width?: number;
}

type FalGenerateResponse =
  | {
      ok: true;
      images: FalGeneratedImage[];
      jobs: {
        appliedLoraScale?: number;
        appliedReferenceAdherence?: number;
        appliedStrength?: number;
        endpoint: string;
        loraUrl?: string;
        requestId: string;
        variation?: string;
      }[];
    }
  | {
      error?: string;
      ok?: false;
    };

const imageAssetQuery = `*[_type == "sanity.imageAsset" && defined(url)] | order(_createdAt desc)[0...160] {
  _id,
  altText,
  originalFilename,
  title,
  url,
  metadata {
    dimensions {
      height,
      width
    },
    lqip
  }
}`;

const MODEL_OPTIONS: {
  description: string;
  family: string;
  id: FalModelId;
  imageReference?: boolean;
  label: string;
  supportsWebp?: boolean;
  removeBgOnly?: boolean;
}[] = [
  {
    description:
      "Remove image background — outputs transparent PNG. Select a Sanity image as the source.",
    family: "Ideogram",
    id: "fal-ai/ideogram/remove-background",
    imageReference: true,
    label: "Ideogram | Background Removal",
    removeBgOnly: true,
    supportsWebp: true,
  },
  {
    description: "Fast drafts and social concepts",
    family: "Flux",
    id: "fal-ai/flux/schnell",
    imageReference: true,
    label: "Flux | Schnell",
  },
  {
    description: "Higher-quality campaign images",
    family: "Flux",
    id: "fal-ai/flux/dev",
    imageReference: true,
    label: "Flux | Dev",
  },
  {
    description:
      "Birdcreek-trained asphalt shingle texture — text-to-image only. Prompts auto-include the txshingle trigger.",
    family: "Flux",
    id: "fal-ai/flux-lora",
    label: "Flux | txshingle LoRA",
  },
  {
    description: "Photorealistic brand and product-style image drafts",
    family: "Flux",
    id: "fal-ai/flux/krea",
    label: "Flux | Krea",
  },
  {
    description: "Sharper commercial concepts with better prompt following",
    family: "Flux Pro",
    id: "fal-ai/flux-pro/v1.1",
    label: "Flux Pro | 1.1",
  },
  {
    description: "Premium high-detail creative output",
    family: "Flux Pro",
    id: "fal-ai/flux-pro/v1.1-ultra",
    label: "Flux Pro | 1.1 Ultra",
  },
  {
    description: "Context-aware text-to-image concepts",
    family: "Flux Kontext",
    id: "fal-ai/flux-pro/kontext/text-to-image",
    label: "Flux Kontext | Text to image",
  },
  {
    description: "Fast newer-generation image drafts",
    family: "Flux 2",
    id: "fal-ai/flux-2/flash",
    label: "Flux 2 | Flash",
    supportsWebp: true,
  },
  {
    description: "Newer-generation balanced image generation",
    family: "Flux 2",
    id: "fal-ai/flux-2",
    label: "Flux 2 | Standard",
    supportsWebp: true,
  },
  {
    description: "Higher-end Flux 2 generation and image edits",
    family: "Flux 2",
    id: "fal-ai/flux-2-pro",
    imageReference: true,
    label: "Flux 2 | Pro",
  },
  {
    description: "Strong typography, signs, and visual detail",
    family: "Qwen",
    id: "fal-ai/qwen-image",
    imageReference: true,
    label: "Qwen | Image",
  },
  {
    description: "Ad concepts with strong composition and text rendering",
    family: "Ideogram",
    id: "fal-ai/ideogram/v3",
    label: "Ideogram | V3",
  },
  {
    description: "Graphic design, illustration, and controlled brand visuals",
    family: "Recraft",
    id: "fal-ai/recraft/v4/text-to-image",
    label: "Recraft | V4",
    supportsWebp: true,
  },
  {
    description: "Flexible high-quality campaign image generation",
    family: "Seedream",
    id: "fal-ai/bytedance/seedream/v4/text-to-image",
    label: "Seedream | V4",
  },
  {
    description: "Google image generation through Fal",
    family: "Google",
    id: "fal-ai/imagen4/preview",
    label: "Imagen 4 | Preview",
  },
  {
    description: "Nano Banana image generation through Fal",
    family: "Google",
    id: "fal-ai/nano-banana-pro",
    label: "Nano Banana | Pro",
  },
];

const FAL_IMAGE_LONG_EDGE_PX = 1800;

const falImagePixelSize = (
  imageSize: FalImageSize
): { height: number; width: number } => {
  switch (imageSize) {
    case "landscape_16_9": {
      return {
        height: Math.round((FAL_IMAGE_LONG_EDGE_PX * 9) / 16),
        width: FAL_IMAGE_LONG_EDGE_PX,
      };
    }
    case "landscape_4_3": {
      return {
        height: Math.round((FAL_IMAGE_LONG_EDGE_PX * 3) / 4),
        width: FAL_IMAGE_LONG_EDGE_PX,
      };
    }
    case "portrait_16_9": {
      return {
        height: FAL_IMAGE_LONG_EDGE_PX,
        width: Math.round((FAL_IMAGE_LONG_EDGE_PX * 9) / 16),
      };
    }
    case "portrait_4_3": {
      return {
        height: FAL_IMAGE_LONG_EDGE_PX,
        width: Math.round((FAL_IMAGE_LONG_EDGE_PX * 3) / 4),
      };
    }
    default: {
      return { height: FAL_IMAGE_LONG_EDGE_PX, width: FAL_IMAGE_LONG_EDGE_PX };
    }
  }
};

const formatFalSizeLabel = (imageSize: FalImageSize, name: string): string => {
  const { width, height } = falImagePixelSize(imageSize);
  return `${name} (${width}×${height})`;
};

const SIZE_OPTIONS: { id: FalImageSize; label: string }[] = [
  { id: "square_hd", label: formatFalSizeLabel("square_hd", "Square HD") },
  { id: "square", label: formatFalSizeLabel("square", "Square") },
  {
    id: "landscape_4_3",
    label: formatFalSizeLabel("landscape_4_3", "Landscape 4:3"),
  },
  {
    id: "landscape_16_9",
    label: formatFalSizeLabel("landscape_16_9", "Landscape 16:9"),
  },
  {
    id: "portrait_4_3",
    label: formatFalSizeLabel("portrait_4_3", "Portrait 4:3"),
  },
  {
    id: "portrait_16_9",
    label: formatFalSizeLabel("portrait_16_9", "Portrait 16:9"),
  },
];

const DEFAULT_PROMPT =
  "Casual smartphone photo of a real one-story house on a Central Texas suburban street, asphalt shingle roof and gutters taking up most of the frame, shot from the sidewalk at a slight angle — not centered, not symmetrical. Flat midday light or thin overcast, normal exposure with no HDR glow. Lived-in details: uneven grass, a parked SUV partly in frame, mailbox, oak tree branches cutting into the sky, neighbor roofline at the edge. Looks like a homeowner snapped it before calling a roofer — documentary, unstaged, imperfect framing. Not real estate listing photography, not magazine, not golden hour, not aerial, no text or logos.";

const SERIES_DIRECTION_PLACEHOLDER = `One full creative direction per line — scene, angle, subject, and mood (not just a headline).

Example:
Sidewalk snapshot: brick ranch slightly off-center, roof fills upper two-thirds, overcast Austin afternoon, hose coiled by the garage, feels like a phone photo not an ad shoot`;

const DEFAULT_SERIES = `Sidewalk snapshot: one-story brick ranch in Round Rock slightly off-center, roof and gutters fill the upper two-thirds, flat overcast afternoon, pickup truck mirror intruding at the left edge, documentary phone-photo feel

Driveway look-up: standing in a narrow Georgetown driveway shooting upward at a two-story home, mild barrel distortion, lifted ridge cap and subtle hail marks on south slopes, utility line and tree branch in frame, not a hero shot

Street-parked view: photo taken from inside a car window on a Cedar Park cul-de-sac, house at a three-quarter angle, windshield glare at the corner, roof readable but framing is casual and imperfect

Yard-level walk-by: eye-level photo walking past a Lubbock stucco home, partial fence post foreground, roofline slightly tilted, harsh noon sun with blown-out sky, real suburban clutter not styled

Backyard neighbor angle: over a wooden fence into a Westlake backyard, roof peaks above a grill and patio chairs, telephoto compression like a concerned neighbor took it, unstaged and ordinary

Post-storm porch step: standing on a wet Waco front porch looking out at the roof, raindrops on lens edge, gutters and downspout visible, gray sky, no dramatic storm lighting`;

const getSelectValue = (event: unknown): string =>
  (event as { target: { value: string } }).target.value;

const getInputValue = (event: unknown): string =>
  (event as { target: { value: string } }).target.value;

const getNumberInputValue = (event: unknown): number => {
  const { value } = (event as { target: WaNumberInputElement }).target;
  return Number(value);
};

const getCheckboxValue = (event: unknown): boolean =>
  Boolean((event as { target: WaCheckboxElement }).target.checked);

const imageLabel = (asset: SanityImageAsset): string =>
  asset.title?.trim() ||
  asset.altText?.trim() ||
  asset.originalFilename?.trim() ||
  "Untitled image";

const fileSize = (bytes?: number): string => {
  if (!bytes) {
    return "Unknown size";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;

  while (value >= 1824 && unit < units.length - 1) {
    value /= 1824;
    unit += 1;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
};

const imageDimensions = (
  image: FalGeneratedImage | SanityImageAsset
): string => {
  const width =
    "url" in image && "contentType" in image
      ? image.width
      : image.metadata?.dimensions?.width;
  const height =
    "url" in image && "contentType" in image
      ? image.height
      : image.metadata?.dimensions?.height;
  if (!(width && height)) {
    return "Unknown dimensions";
  }
  return `${width} x ${height}`;
};

const safeFilename = (value: string, fallback: string): string => {
  const clean = value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");
  return clean || fallback;
};

// ── Crop tool ─────────────────────────────────────────────────────────────────

interface CropRect {
  h: number;
  w: number;
  x: number;
  y: number;
}
type DragHandle = "body" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

const ASPECT_RATIOS: Record<string, number | null> = {
  "1 : 1": 1,
  "16 : 9": 16 / 9,
  "3 : 4": 3 / 4,
  "4 : 3": 4 / 3,
  "9 : 16": 9 / 16,
  Free: null,
};

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

const loadImageFromSource = async (src: string): Promise<HTMLImageElement> => {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
};

const cropMimeType = (format: "jpeg" | "png" | "webp"): string => {
  if (format === "jpeg") {
    return "image/jpeg";
  }
  if (format === "webp") {
    return "image/webp";
  }
  return "image/png";
};

const cropExtension = (format: "jpeg" | "png" | "webp"): string =>
  format === "jpeg" ? "jpg" : format;

const canvasToBlob = async (
  canvas: HTMLCanvasElement,
  format: "jpeg" | "png" | "webp"
): Promise<Blob> => {
  const quality = format === "png" ? undefined : 0.92;
  const response = await fetch(canvas.toDataURL(cropMimeType(format), quality));
  return response.blob();
};

function CropModal({
  imageUrl,
  label,
  onSave,
  onClose,
}: {
  imageUrl: string;
  label: string;
  onSave: (blob: Blob, filename: string) => Promise<void>;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({ h: 0, w: 0 });
  const [, forceUpdate] = useState(0);
  const [crop, setCrop] = useState<CropRect>({
    h: 0.8,
    w: 0.8,
    x: 0.1,
    y: 0.1,
  });
  const [aspectKey, setAspectKey] = useState("Free");
  const [cropFormat, setCropFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [applying, setApplying] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const drag = useRef<{
    handle: DragHandle;
    startX: number;
    startY: number;
    startCrop: CropRect;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadBlob = async () => {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        if (cancelled) {
          return;
        }
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobSrc(url);
      } catch {
        if (!cancelled) {
          setLoadError(true);
        }
      }
    };

    void loadBlob();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, [imageUrl]);

  const onImgLoad = () => {
    const img = imgRef.current;
    if (img) {
      setNaturalSize({ h: img.naturalHeight, w: img.naturalWidth });
      forceUpdate((n) => n + 1);
    }
  };

  const applyAspect = (rect: CropRect, ratio: number | null): CropRect => {
    if (!(ratio && naturalSize.w)) {
      return rect;
    }
    const { x, y, w } = rect;
    const h = clamp((w * naturalSize.w) / (ratio * naturalSize.h), 0.02, 1 - y);
    return { h, w, x, y };
  };

  const getDisplayRect = () => {
    const img = imgRef.current;
    const con = containerRef.current;
    if (!(img && con)) {
      return null;
    }
    const r = img.getBoundingClientRect();
    const c = con.getBoundingClientRect();
    const ox = r.left - c.left,
      oy = r.top - c.top;
    return {
      height: crop.h * r.height,
      imgH: r.height,
      imgLeft: ox,
      imgTop: oy,
      imgW: r.width,
      left: ox + crop.x * r.width,
      top: oy + crop.y * r.height,
      width: crop.w * r.width,
    };
  };

  const onPointerDown = (e: React.PointerEvent, handle: DragHandle) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      handle,
      startCrop: { ...crop },
      startX: e.clientX,
      startY: e.clientY,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!(drag.current && imgRef.current)) {
      return;
    }
    const r = imgRef.current.getBoundingClientRect();
    const dx = (e.clientX - drag.current.startX) / r.width;
    const dy = (e.clientY - drag.current.startY) / r.height;
    const { handle, startCrop } = drag.current;
    let { x, y, w, h } = startCrop;
    const ratio = ASPECT_RATIOS[aspectKey] ?? null;

    if (handle === "body") {
      x = clamp(x + dx, 0, 1 - w);
      y = clamp(y + dy, 0, 1 - h);
    } else {
      if (handle.includes("e")) {
        w = clamp(w + dx, 0.05, 1 - x);
      }
      if (handle.includes("w")) {
        x = clamp(x + dx, 0, x + w - 0.05);
        w = startCrop.x + startCrop.w - x;
      }
      if (handle.includes("s")) {
        h = clamp(h + dy, 0.05, 1 - y);
      }
      if (handle.includes("n")) {
        y = clamp(y + dy, 0, y + h - 0.05);
        h = startCrop.y + startCrop.h - y;
      }
    }
    const next = applyAspect({ h, w, x, y }, ratio);
    setCrop({
      h: clamp(next.h, 0.02, 1),
      w: clamp(next.w, 0.02, 1),
      x: clamp(next.x, 0, 1 - next.w),
      y: clamp(next.y, 0, 1 - next.h),
    });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const handleApply = async () => {
    if (!blobSrc) {
      return;
    }
    setApplying(true);
    try {
      const img = await loadImageFromSource(blobSrc);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * crop.w);
      canvas.height = Math.round(img.naturalHeight * crop.h);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas 2D context unavailable");
      }
      ctx.drawImage(
        img,
        Math.round(img.naturalWidth * crop.x),
        Math.round(img.naturalHeight * crop.y),
        Math.round(img.naturalWidth * crop.w),
        Math.round(img.naturalHeight * crop.h),
        0,
        0,
        canvas.width,
        canvas.height
      );
      const ext = cropExtension(cropFormat);
      const blob = await canvasToBlob(canvas, cropFormat);
      if (!blob) {
        throw new Error("Canvas export failed");
      }
      await onSave(blob, `cropped-${Date.now()}.${ext}`);
    } finally {
      setApplying(false);
    }
  };

  const dr = getDisplayRect();
  const outputW = naturalSize.w ? Math.round(naturalSize.w * crop.w) : 0;
  const outputH = naturalSize.h ? Math.round(naturalSize.h * crop.h) : 0;

  const handles: { id: DragHandle; style: React.CSSProperties }[] = [
    { id: "nw", style: { cursor: "nw-resize", left: -5, top: -5 } },
    {
      id: "n",
      style: {
        cursor: "ns-resize",
        left: "50%",
        top: -5,
        transform: "translateX(-50%)",
      },
    },
    { id: "ne", style: { cursor: "ne-resize", right: -5, top: -5 } },
    {
      id: "e",
      style: {
        cursor: "ew-resize",
        right: -5,
        top: "50%",
        transform: "translateY(-50%)",
      },
    },
    { id: "se", style: { bottom: -5, cursor: "se-resize", right: -5 } },
    {
      id: "s",
      style: {
        bottom: -5,
        cursor: "ns-resize",
        left: "50%",
        transform: "translateX(-50%)",
      },
    },
    { id: "sw", style: { bottom: -5, cursor: "sw-resize", left: -5 } },
    {
      id: "w",
      style: {
        cursor: "ew-resize",
        left: -5,
        top: "50%",
        transform: "translateY(-50%)",
      },
    },
  ];

  return (
    <div
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        alignItems: "center",
        background: "rgba(0,0,0,0.9)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        inset: 0,
        justifyContent: "center",
        padding: "1.5rem",
        position: "fixed",
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <div
        style={{
          alignItems: "center",
          color: "#fff",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          maxWidth: 960,
          width: "100%",
        }}
      >
        <strong
          style={{
            flex: 1,
            fontSize: "0.8125rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </strong>
        {outputW > 0 && (
          <span style={{ fontSize: "0.75rem", opacity: 0.55 }}>
            {outputW} × {outputH} px
          </span>
        )}
        <select
          onChange={(e) => {
            const k = e.target.value;
            setAspectKey(k);
            setCrop((c) => applyAspect(c, ASPECT_RATIOS[k] ?? null));
          }}
          style={{
            borderRadius: 4,
            fontSize: "0.75rem",
            padding: "0.25rem 0.5rem",
          }}
          value={aspectKey}
        >
          {Object.keys(ASPECT_RATIOS).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          onChange={(e) =>
            setCropFormat(e.target.value as "png" | "jpeg" | "webp")
          }
          style={{
            borderRadius: 4,
            fontSize: "0.75rem",
            padding: "0.25rem 0.5rem",
          }}
          value={cropFormat}
        >
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
          <option value="webp">WebP</option>
        </select>
      </div>

      {/* Image + crop overlay */}
      <div
        ref={containerRef}
        style={{
          alignItems: "center",
          display: "flex",
          flex: 1,
          justifyContent: "center",
          maxHeight: "calc(100vh - 14rem)",
          maxWidth: 960,
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        {loadError ? (
          <span style={{ color: "#f88" }}>Could not load image.</span>
        ) : null}
        {!loadError && blobSrc ? (
          <>
            <img
              alt=""
              draggable={false}
              onLoad={onImgLoad}
              ref={imgRef}
              src={blobSrc}
              style={{
                display: "block",
                maxHeight: "100%",
                maxWidth: "100%",
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
            {dr && (
              <>
                {/* Dark mask */}
                {(
                  [
                    {
                      height: dr.top - dr.imgTop,
                      left: dr.imgLeft,
                      top: dr.imgTop,
                      width: dr.imgW,
                    },
                    {
                      height: dr.imgTop + dr.imgH - dr.top - dr.height,
                      left: dr.imgLeft,
                      top: dr.top + dr.height,
                      width: dr.imgW,
                    },
                    {
                      height: dr.height,
                      left: dr.imgLeft,
                      top: dr.top,
                      width: dr.left - dr.imgLeft,
                    },
                    {
                      height: dr.height,
                      left: dr.left + dr.width,
                      top: dr.top,
                      width: dr.imgLeft + dr.imgW - dr.left - dr.width,
                    },
                  ] as React.CSSProperties[]
                ).map((s, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      ...s,
                      background: "rgba(0,0,0,0.6)",
                      pointerEvents: "none",
                    }}
                  />
                ))}
                {/* Crop box */}
                <div
                  onPointerDown={(e) => onPointerDown(e, "body")}
                  style={{
                    border: "2px solid rgba(255,255,255,0.9)",
                    boxSizing: "border-box",
                    cursor: "move",
                    height: dr.height,
                    left: dr.left,
                    position: "absolute",
                    top: dr.top,
                    width: dr.width,
                  }}
                >
                  {[1 / 3, 2 / 3].map((f) => (
                    <div
                      key={`v${f}`}
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        bottom: 0,
                        left: `${f * 100}%`,
                        pointerEvents: "none",
                        position: "absolute",
                        top: 0,
                        width: 1,
                      }}
                    />
                  ))}
                  {[1 / 3, 2 / 3].map((f) => (
                    <div
                      key={`h${f}`}
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        height: 1,
                        left: 0,
                        pointerEvents: "none",
                        position: "absolute",
                        right: 0,
                        top: `${f * 100}%`,
                      }}
                    />
                  ))}
                  {handles.map(({ id, style }) => (
                    <div
                      key={id}
                      onPointerDown={(e) => onPointerDown(e, id)}
                      style={{
                        background: "#fff",
                        borderRadius: 2,
                        height: 10,
                        position: "absolute",
                        width: 10,
                        ...style,
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : null}
        {!loadError && !blobSrc ? (
          <span style={{ color: "rgba(255,255,255,0.5)" }}>Loading…</span>
        ) : null}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <WaButton onClick={onClose} size="xs">
          Cancel
        </WaButton>
        <WaButton
          appearance="filled"
          disabled={!blobSrc || applying}
          onClick={() => void handleApply()}
          size="xs"
          variant="brand"
        >
          {applying ? "Saving…" : "Crop & save to Sanity"}
        </WaButton>
      </div>
    </div>
  );
}

interface ReferenceAdherenceSliderProps {
  onValueChange: (value: number) => void;
  value: number;
}

const ReferenceAdherenceSlider = ({
  onValueChange,
  value,
}: ReferenceAdherenceSliderProps) => {
  const sliderRef = useRef<WaSliderElement | null>(null);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) {
      return;
    }

    const handleUpdate = () => {
      const next = Number(slider.value);
      if (Number.isFinite(next)) {
        onValueChange(Math.min(1, Math.max(0.05, next)));
      }
    };

    slider.addEventListener("input", handleUpdate);
    slider.addEventListener("change", handleUpdate);
    return () => {
      slider.removeEventListener("input", handleUpdate);
      slider.removeEventListener("change", handleUpdate);
    };
  }, [onValueChange]);

  return (
    <div className="fis__control-group">
      <label htmlFor="reference-adherence-slider">Reference adherence</label>
      <p className="fis__control-hint">
        Higher keeps more of the reference photo. Lower lets the prompt reshape
        the scene.
      </p>
      <WaSlider
        id="reference-adherence-slider"
        max={1}
        min={0.05}
        ref={sliderRef}
        size="xs"
        step={0.01}
        value={value}
      />
      <span>{value.toFixed(2)}</span>
    </div>
  );
};

const LoraScaleSlider = ({
  onValueChange,
  value,
}: {
  onValueChange: (value: number) => void;
  value: number;
}) => {
  const sliderRef = useRef<WaSliderElement | null>(null);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) {
      return;
    }

    const handleInput = () => onValueChange(Number(slider.value));
    slider.addEventListener("input", handleInput);
    slider.addEventListener("change", handleInput);
    return () => {
      slider.removeEventListener("input", handleInput);
      slider.removeEventListener("change", handleInput);
    };
  }, [onValueChange]);

  return (
    <div className="fis__control-group">
      <label htmlFor="lora-scale-slider">LoRA strength</label>
      <p className="fis__control-hint">
        How strongly the txshingle granule texture applies. Lower for subtle
        blends; higher for obvious shingle detail.
      </p>
      <WaSlider
        id="lora-scale-slider"
        max={1.5}
        min={0.25}
        ref={sliderRef}
        size="xs"
        step={0.05}
        value={value}
      />
      <span>{value.toFixed(2)}</span>
    </div>
  );
};

const generateButtonLabel = (
  generating: boolean,
  mode: GenerateMode
): string => {
  if (generating) {
    if (mode === "remove-sky") {
      return "Removing sky...";
    }
    if (mode === "remove-bg") {
      return "Removing background...";
    }
    return "Generating...";
  }

  if (mode === "remove-sky") {
    return "Remove sky";
  }
  if (mode === "remove-bg") {
    return "Remove background";
  }
  return "Generate images";
};

const missingReferenceMessage = (
  mode: GenerateMode,
  isBackgroundRemovalMode: boolean,
  selectedAsset: SanityImageAsset | null
): string | null => {
  if (!((mode === "image" || isBackgroundRemovalMode) && !selectedAsset)) {
    return null;
  }
  if (mode === "remove-sky") {
    return "Select a Sanity image to remove the sky.";
  }
  if (mode === "remove-bg") {
    return "Select a Sanity image to remove its background.";
  }
  return "Select a Sanity image to use as the reference.";
};

interface GenerationRequestOptions {
  backgroundRemovalModel: BackgroundRemovalModel;
  enhancePrompt: boolean;
  imageSize: FalImageSize;
  isBackgroundRemovalMode: boolean;
  isTxshingleLoraModel: boolean;
  loraScale: number;
  mode: GenerateMode;
  model: FalModelId;
  numImages: number;
  outputFormat: "jpeg" | "png" | "webp";
  prompt: string;
  referenceAdherence: number;
  seed: string;
  selectedAsset: SanityImageAsset | null;
  seriesVariations: string;
  supportsReferenceStrength: boolean;
  usesReferenceImage: boolean;
}

const buildGenerationRequestBody = ({
  backgroundRemovalModel,
  enhancePrompt,
  imageSize,
  isBackgroundRemovalMode,
  isTxshingleLoraModel,
  loraScale,
  mode,
  model,
  numImages,
  outputFormat,
  prompt,
  referenceAdherence,
  seed,
  selectedAsset,
  seriesVariations,
  supportsReferenceStrength,
  usesReferenceImage,
}: GenerationRequestOptions): Record<string, unknown> => ({
  backgroundRemovalModel:
    mode === "remove-bg" ? backgroundRemovalModel : undefined,
  enhancePrompt,
  imageSize,
  loraScale: isTxshingleLoraModel ? loraScale : undefined,
  mode,
  model,
  numImages: isBackgroundRemovalMode ? 1 : numImages,
  outputFormat: isBackgroundRemovalMode ? "png" : outputFormat,
  prompt,
  referenceAdherence: supportsReferenceStrength
    ? referenceAdherence
    : undefined,
  referenceImageUrl:
    isBackgroundRemovalMode || usesReferenceImage
      ? selectedAsset?.url
      : undefined,
  seed: seed.trim(),
  seriesVariations,
});

const readFalGenerateResponse = async (
  response: Response
): Promise<FalGenerateResponse> => {
  try {
    return (await response.json()) as FalGenerateResponse;
  } catch {
    return {};
  }
};

const generatedNotice = (count: number): string =>
  `Generated ${count} image${count === 1 ? "" : "s"}.`;

const imageExtension = (contentType: string): "jpg" | "png" | "webp" => {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    return "jpg";
  }
  if (contentType.includes("webp")) {
    return "webp";
  }
  return "png";
};

const stripFilenameExtension = (value: string): string =>
  value.replace(/\.[^.]+$/u, "");

const lqipStyle = (
  asset: SanityImageAsset
): React.CSSProperties | undefined => {
  if (!asset.metadata?.lqip) {
    return;
  }
  return { backgroundImage: `url(${asset.metadata.lqip})` };
};

const resultJobSummary = (
  result: Extract<FalGenerateResponse, { ok: true }>
): string => {
  const jobCount = `${result.jobs.length} Fal job${result.jobs.length === 1 ? "" : "s"}`;
  const [firstJob] = result.jobs;
  if (firstJob?.appliedStrength === undefined) {
    return jobCount;
  }
  const adherence =
    firstJob.appliedReferenceAdherence === undefined
      ? "—"
      : firstJob.appliedReferenceAdherence.toFixed(2);
  return `${jobCount} · transform ${firstJob.appliedStrength.toFixed(2)} (adherence ${adherence})`;
};

const studioToolClassName = (colorScheme: string): string => {
  if (colorScheme === "dark") {
    return "studio-tool fis studio-tool--dark";
  }
  return "studio-tool fis studio-tool--light";
};

const isGenerateDisabled = ({
  generating,
  isBackgroundRemovalMode,
  prompt,
  selectedAsset,
}: {
  generating: boolean;
  isBackgroundRemovalMode: boolean;
  prompt: string;
  selectedAsset: SanityImageAsset | null;
}): boolean =>
  generating ||
  !(isBackgroundRemovalMode || prompt.trim()) ||
  (isBackgroundRemovalMode && !selectedAsset);

interface CropTarget {
  label: string;
  url: string;
}

interface FalToolHeaderProps {
  cropTarget: CropTarget | null;
  generateDisabled: boolean;
  generating: boolean;
  mode: GenerateMode;
  onCloseCrop: () => void;
  onGenerate: () => void;
  onSaveCrop: (blob: Blob, filename: string) => Promise<void>;
}

const FalToolHeader = ({
  cropTarget,
  generateDisabled,
  generating,
  mode,
  onCloseCrop,
  onGenerate,
  onSaveCrop,
}: FalToolHeaderProps) => (
  <header className="fis__header">
    <div>
      <p>Fal.ai</p>
      <h1>Image Studio</h1>
    </div>
    {cropTarget ? (
      <CropModal
        imageUrl={cropTarget.url}
        label={cropTarget.label}
        onClose={onCloseCrop}
        onSave={onSaveCrop}
      />
    ) : null}
    <WaButton
      appearance="filled"
      disabled={generateDisabled}
      onClick={() => void onGenerate()}
      size="xs"
      variant="brand"
    >
      {generateButtonLabel(generating, mode)}
    </WaButton>
  </header>
);

interface BackgroundRemovalControlsProps {
  backgroundRemovalModel: BackgroundRemovalModel;
  mode: GenerateMode;
  onBackgroundRemovalModelChange: (value: BackgroundRemovalModel) => void;
}

const BackgroundRemovalControls = ({
  backgroundRemovalModel,
  mode,
  onBackgroundRemovalModelChange,
}: BackgroundRemovalControlsProps) => {
  if (mode === "remove-sky") {
    return (
      <div className="fis__control-group">
        <p className="fis__control-hint">
          <strong>EVF-SAM2</strong> segments only the sky and clouds, then
          composites a transparent PNG while keeping the house, roof, trees, and
          yard intact. Best for exterior roofing photos where BiRefNet eats into
          the structure.
        </p>
      </div>
    );
  }

  if (mode !== "remove-bg") {
    return null;
  }

  return (
    <div className="fis__control-group">
      <WaSelect
        label="Background removal model"
        name="backgroundRemovalModel"
        onInput={(event) =>
          onBackgroundRemovalModelChange(
            getSelectValue(event) as BackgroundRemovalModel
          )
        }
        size="xs"
        value={backgroundRemovalModel}
        withClear={false}
      >
        <WaOption value="ideogram">
          Ideogram — clean edges (recommended)
        </WaOption>
        <WaOption value="bria">
          Bria RMBG 2.0 — commercial-safe matting
        </WaOption>
        <WaOption value="birefnet-heavy">
          BiRefNet Heavy — legacy fallback
        </WaOption>
      </WaSelect>
      <p className="fis__control-hint">
        Removes everything behind the main subject. For house photos where you
        only want the sky gone, use <strong>Remove sky</strong> instead.
      </p>
    </div>
  );
};

interface PromptControlsProps {
  isBackgroundRemovalMode: boolean;
  mode: GenerateMode;
  onPromptChange: (value: string) => void;
  onSeriesVariationsChange: (value: string) => void;
  prompt: string;
  seriesVariations: string;
}

const PromptControls = ({
  isBackgroundRemovalMode,
  mode,
  onPromptChange,
  onSeriesVariationsChange,
  prompt,
  seriesVariations,
}: PromptControlsProps) => {
  if (isBackgroundRemovalMode) {
    return null;
  }

  return (
    <>
      <div className="fis__control-group">
        <WaTextarea
          className="fis__prompt"
          label="Prompt"
          onInput={(event) => onPromptChange(getInputValue(event))}
          rows={10}
          size="xs"
          value={prompt}
        />
      </div>

      {mode === "series" ? (
        <div className="fis__control-group">
          <label htmlFor="series-variation-directions">
            Series variation directions
          </label>
          <WaTextarea
            className="fis__prompt"
            id="series-variation-directions"
            onInput={(event) => onSeriesVariationsChange(getInputValue(event))}
            placeholder={SERIES_DIRECTION_PLACEHOLDER}
            rows={12}
            size="xs"
            value={seriesVariations}
          />
          <span>
            One line per image (up to 12). Write scene, camera angle, roof
            detail, and mood — not ad headlines. The base prompt above stays
            shared; each line steers one Fal job. Optional reference image
            applies to every variation.
          </span>
        </div>
      ) : null}
    </>
  );
};

interface ModelSettingsControlsProps {
  imageSize: FalImageSize;
  isBackgroundRemovalMode: boolean;
  model: FalModelId;
  numImages: number;
  onImageSizeChange: (value: FalImageSize) => void;
  onModelChange: (value: FalModelId) => void;
  onNumImagesChange: (value: number) => void;
  onOutputFormatChange: (value: "jpeg" | "png" | "webp") => void;
  onSeedChange: (value: string) => void;
  outputFormat: "jpeg" | "png" | "webp";
  referenceModelNote: string;
  seed: string;
  selectedModel: (typeof MODEL_OPTIONS)[number];
  usesReferenceImage: boolean;
}

const ModelSettingsControls = ({
  imageSize,
  isBackgroundRemovalMode,
  model,
  numImages,
  onImageSizeChange,
  onModelChange,
  onNumImagesChange,
  onOutputFormatChange,
  onSeedChange,
  outputFormat,
  referenceModelNote,
  seed,
  selectedModel,
  usesReferenceImage,
}: ModelSettingsControlsProps) => {
  if (isBackgroundRemovalMode) {
    return null;
  }

  return (
    <div className="fis__grid-controls">
      <div className="fis__control-group">
        <WaSelect
          label="Model"
          name="model"
          onInput={(event) =>
            onModelChange(getSelectValue(event) as FalModelId)
          }
          size="xs"
          value={model}
          withClear={false}
        >
          {MODEL_OPTIONS.map((option) => (
            <WaOption key={option.id} value={option.id}>
              {option.label}
            </WaOption>
          ))}
        </WaSelect>
        <span>{referenceModelNote}</span>
      </div>

      <div className="fis__control-group">
        <WaSelect
          label="Size"
          name="size"
          onInput={(event) =>
            onImageSizeChange(getSelectValue(event) as FalImageSize)
          }
          size="xs"
          value={imageSize}
          withClear={false}
        >
          {SIZE_OPTIONS.map((option) => (
            <WaOption key={option.id} value={option.id}>
              {option.label}
            </WaOption>
          ))}
        </WaSelect>
      </div>

      <div className="fis__control-group">
        <WaNumberInput
          label="Count"
          max={4}
          min={1}
          name="count"
          onInput={(event) => onNumImagesChange(getNumberInputValue(event))}
          size="xs"
          value={String(numImages)}
        />
      </div>

      <div className="fis__control-group">
        <WaSelect
          disabled={usesReferenceImage}
          label="Format"
          name="format"
          onInput={(event) =>
            onOutputFormatChange(
              getSelectValue(event) as "jpeg" | "png" | "webp"
            )
          }
          size="xs"
          value={outputFormat}
          withClear={false}
        >
          <WaOption value="png">PNG</WaOption>
          <WaOption value="jpeg">JPEG</WaOption>
          <WaOption disabled={!selectedModel.supportsWebp} value="webp">
            WebP
          </WaOption>
        </WaSelect>
      </div>

      <div className="fis__control-group">
        <WaInput
          inputMode="numeric"
          label="Seed"
          name="seed"
          onInput={(event) => onSeedChange(getInputValue(event))}
          placeholder="Random"
          size="xs"
          type="text"
          value={seed}
        />
      </div>
    </div>
  );
};

interface ReferenceControlsProps {
  enhancePrompt: boolean;
  isBackgroundRemovalMode: boolean;
  isTxshingleLoraModel: boolean;
  loraScale: number;
  onEnhancePromptChange: (value: boolean) => void;
  onLoraScaleChange: (value: number) => void;
  onReferenceAdherenceChange: (value: number) => void;
  referenceAdherence: number;
  selectedModel: (typeof MODEL_OPTIONS)[number];
  supportsReferenceStrength: boolean;
  usesReferenceImage: boolean;
}

const ReferenceControls = ({
  enhancePrompt,
  isBackgroundRemovalMode,
  isTxshingleLoraModel,
  loraScale,
  onEnhancePromptChange,
  onLoraScaleChange,
  onReferenceAdherenceChange,
  referenceAdherence,
  selectedModel,
  supportsReferenceStrength,
  usesReferenceImage,
}: ReferenceControlsProps) => (
  <>
    {isTxshingleLoraModel && !isBackgroundRemovalMode ? (
      <LoraScaleSlider onValueChange={onLoraScaleChange} value={loraScale} />
    ) : null}

    {usesReferenceImage &&
    !isBackgroundRemovalMode &&
    supportsReferenceStrength ? (
      <ReferenceAdherenceSlider
        onValueChange={onReferenceAdherenceChange}
        value={referenceAdherence}
      />
    ) : null}

    {usesReferenceImage &&
    !isBackgroundRemovalMode &&
    selectedModel.id === "fal-ai/flux-2-pro" ? (
      <p className="fis__control-hint">
        Flux 2 Pro Edit follows your prompt but does not expose a
        reference-strength control. Use Flux Dev or Qwen for adjustable
        blending.
      </p>
    ) : null}

    {isBackgroundRemovalMode ? null : (
      <WaCheckbox
        checked={enhancePrompt}
        disabled={usesReferenceImage || isTxshingleLoraModel}
        onInput={(event) => onEnhancePromptChange(getCheckboxValue(event))}
        size="xs"
      >
        Enhance prompt
      </WaCheckbox>
    )}
  </>
);

interface GenerationControlsProps
  extends
    BackgroundRemovalControlsProps,
    PromptControlsProps,
    ModelSettingsControlsProps,
    ReferenceControlsProps {
  onModeChange: (value: GenerateMode) => void;
}

const GenerationControls = ({
  backgroundRemovalModel,
  enhancePrompt,
  imageSize,
  isBackgroundRemovalMode,
  isTxshingleLoraModel,
  loraScale,
  mode,
  model,
  numImages,
  onBackgroundRemovalModelChange,
  onEnhancePromptChange,
  onImageSizeChange,
  onLoraScaleChange,
  onModeChange,
  onModelChange,
  onNumImagesChange,
  onOutputFormatChange,
  onPromptChange,
  onReferenceAdherenceChange,
  onSeedChange,
  onSeriesVariationsChange,
  outputFormat,
  prompt,
  referenceAdherence,
  referenceModelNote,
  seed,
  selectedModel,
  seriesVariations,
  supportsReferenceStrength,
  usesReferenceImage,
}: GenerationControlsProps) => (
  <aside className="fis__controls">
    <div className="fis__control-group">
      <WaSelect
        label="Mode"
        onInput={(event) => onModeChange(getSelectValue(event) as GenerateMode)}
        size="xs"
        value={mode}
        withClear={false}
      >
        <WaOption value="text">Text to image</WaOption>
        <WaOption value="image">Image to image</WaOption>
        <WaOption value="series">Prompt series</WaOption>
        <WaOption value="remove-sky">Remove sky</WaOption>
        <WaOption value="remove-bg">Remove background</WaOption>
      </WaSelect>
    </div>

    <BackgroundRemovalControls
      backgroundRemovalModel={backgroundRemovalModel}
      mode={mode}
      onBackgroundRemovalModelChange={onBackgroundRemovalModelChange}
    />
    <PromptControls
      isBackgroundRemovalMode={isBackgroundRemovalMode}
      mode={mode}
      onPromptChange={onPromptChange}
      onSeriesVariationsChange={onSeriesVariationsChange}
      prompt={prompt}
      seriesVariations={seriesVariations}
    />
    <ModelSettingsControls
      imageSize={imageSize}
      isBackgroundRemovalMode={isBackgroundRemovalMode}
      model={model}
      numImages={numImages}
      onImageSizeChange={onImageSizeChange}
      onModelChange={onModelChange}
      onNumImagesChange={onNumImagesChange}
      onOutputFormatChange={onOutputFormatChange}
      onSeedChange={onSeedChange}
      outputFormat={outputFormat}
      referenceModelNote={referenceModelNote}
      seed={seed}
      selectedModel={selectedModel}
      usesReferenceImage={usesReferenceImage}
    />
    <ReferenceControls
      enhancePrompt={enhancePrompt}
      isBackgroundRemovalMode={isBackgroundRemovalMode}
      isTxshingleLoraModel={isTxshingleLoraModel}
      loraScale={loraScale}
      onEnhancePromptChange={onEnhancePromptChange}
      onLoraScaleChange={onLoraScaleChange}
      onReferenceAdherenceChange={onReferenceAdherenceChange}
      referenceAdherence={referenceAdherence}
      selectedModel={selectedModel}
      supportsReferenceStrength={supportsReferenceStrength}
      usesReferenceImage={usesReferenceImage}
    />
  </aside>
);

interface AssetLibraryProps {
  assetSearch: string;
  filteredAssets: SanityImageAsset[];
  loadingAssets: boolean;
  mode: GenerateMode;
  onAssetSearchChange: (value: string) => void;
  onClearReference: () => void;
  onCropAsset: (asset: SanityImageAsset) => void;
  onLoadAssets: () => void;
  onSelectAsset: (asset: SanityImageAsset) => void;
  selectedAsset: SanityImageAsset | null;
  selectedAssetId: string | null;
}

const AssetLibrary = ({
  assetSearch,
  filteredAssets,
  loadingAssets,
  mode,
  onAssetSearchChange,
  onClearReference,
  onCropAsset,
  onLoadAssets,
  onSelectAsset,
  selectedAsset,
  selectedAssetId,
}: AssetLibraryProps) => (
  <aside className="fis__library">
    <div className="fis__library-header">
      <div>
        <p>Sanity assets</p>
        <strong>Optional reference image</strong>
      </div>
      <WaButton disabled={loadingAssets} onClick={onLoadAssets} size="xs">
        Refresh
      </WaButton>
    </div>
    <WaInput
      onInput={(event) => onAssetSearchChange(getInputValue(event))}
      placeholder="Search images"
      size="xs"
      type="search"
      value={assetSearch}
    />

    {selectedAsset ? (
      <div className="fis__selected-reference">
        <img alt="" src={`${selectedAsset.url}?w=720&h=480&fit=crop&fm=webp`} />
        <strong>{imageLabel(selectedAsset)}</strong>
        <span>
          {imageDimensions(selectedAsset)}
          {mode === "series" ? " · used across the series" : ""}
        </span>
        <WaButton onClick={() => onCropAsset(selectedAsset)} size="xs">
          Crop
        </WaButton>
        <WaButton onClick={onClearReference} size="xs">
          Clear reference
        </WaButton>
      </div>
    ) : null}

    <div className="fis__asset-grid">
      {filteredAssets.map((asset) => (
        <WaButton
          appearance="plain"
          className={
            asset._id === selectedAssetId
              ? "fis__asset-tile is-selected"
              : "fis__asset-tile"
          }
          key={asset._id}
          onClick={() => onSelectAsset(asset)}
          size="xs"
          title={imageLabel(asset)}
        >
          <img
            alt=""
            loading="lazy"
            src={`${asset.url}?w=260&h=190&fit=crop&fm=webp`}
            style={lqipStyle(asset)}
          />
          <span>{imageLabel(asset)}</span>
        </WaButton>
      ))}
    </div>

    {!loadingAssets && filteredAssets.length === 0 ? (
      <div className="fis__empty-small">No images match that search.</div>
    ) : null}
  </aside>
);

interface ResultsPanelProps {
  onCropImage: (image: FalGeneratedImage, index: number) => void;
  onSaveImage: (image: FalGeneratedImage, index: number) => void;
  result: Extract<FalGenerateResponse, { ok: true }> | null;
  savingUrl: string | null;
}

const ResultsPanel = ({
  onCropImage,
  onSaveImage,
  result,
  savingUrl,
}: ResultsPanelProps) => (
  <section className="fis__results">
    {result ? (
      <>
        <div className="fis__result-summary">
          <div>
            <strong>{result.images.length} generated images</strong>
            <span>{resultJobSummary(result)}</span>
          </div>
        </div>

        <div className="fis__image-grid">
          {result.images.map((image, index) => (
            <article className="fis__image-card" key={`${image.url}-${index}`}>
              <img alt="" src={image.url} />
              <div>
                <strong>{image.variation || imageDimensions(image)}</strong>
                <span>{fileSize(image.fileSize)}</span>
              </div>
              {image.variation ? <p>{imageDimensions(image)}</p> : null}
              <div className="fis__image-actions">
                <WaButton
                  disabled={savingUrl === image.url}
                  onClick={() => onSaveImage(image, index)}
                  size="xs"
                  variant="brand"
                >
                  {savingUrl === image.url ? "Saving..." : "Save to Sanity"}
                </WaButton>
                <WaButton onClick={() => onCropImage(image, index)} size="xs">
                  Crop
                </WaButton>
                <WaButton
                  href={image.url}
                  rel="noreferrer"
                  size="xs"
                  target="_blank"
                >
                  Open
                </WaButton>
              </div>
            </article>
          ))}
        </div>
      </>
    ) : (
      <div className="fis__empty">
        Generate roofing campaign images, create a prompt series, or select a
        Sanity image for image-to-image and reference-based series.
      </div>
    )}
  </section>
);

// ──────────────────────────────────────────────────────────────────────────────

export function FalImageStudioTool() {
  const client = useStudioClient({ apiVersion: "2026-05-01" });
  const colorScheme = useColorSchemeValue();
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [mode, setMode] = useState<GenerateMode>("text");
  const [model, setModel] = useState<FalModelId>("fal-ai/flux/schnell");
  const [imageSize, setImageSize] = useState<FalImageSize>("landscape_4_3");
  const [numImages, setNumImages] = useState(2);
  const [outputFormat, setOutputFormat] = useState<"jpeg" | "png" | "webp">(
    "png"
  );
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [seed, setSeed] = useState("");
  const [referenceAdherence, setReferenceAdherence] = useState(0.35);
  const [loraScale, setLoraScale] = useState(0.9);
  const [backgroundRemovalModel, setBackgroundRemovalModel] =
    useState<BackgroundRemovalModel>("ideogram");
  const [seriesVariations, setSeriesVariations] = useState(DEFAULT_SERIES);
  const [assets, setAssets] = useState<SanityImageAsset[]>([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingUrl, setSavingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<
    FalGenerateResponse,
    { ok: true }
  > | null>(null);
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);

  const loadAssets = useCallback(async () => {
    setLoadingAssets(true);
    try {
      const nextAssets =
        await client.fetch<SanityImageAsset[]>(imageAssetQuery);
      setAssets(nextAssets);
      setSelectedAssetId((current) =>
        current && nextAssets.some((asset) => asset._id === current)
          ? current
          : null
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load Sanity images."
      );
    } finally {
      setLoadingAssets(false);
    }
  }, [client]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const selectedModel = useMemo(
    () =>
      MODEL_OPTIONS.find((option) => option.id === model) ?? MODEL_OPTIONS[0],
    [model]
  );

  useEffect(() => {
    if (outputFormat === "webp" && !selectedModel.supportsWebp) {
      setOutputFormat("png");
    }
  }, [outputFormat, selectedModel.supportsWebp]);

  const filteredAssets = useMemo(() => {
    const query = assetSearch.trim().toLowerCase();
    if (!query) {
      return assets;
    }
    return assets.filter((asset) =>
      [asset.title, asset.altText, asset.originalFilename, asset._id]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [assetSearch, assets]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset._id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );
  const isTxshingleLoraModel = model === "fal-ai/flux-lora";
  const usesReferenceImage = Boolean(
    !isTxshingleLoraModel &&
    selectedAsset &&
    (mode === "image" ||
      mode === "series" ||
      mode === "remove-bg" ||
      mode === "remove-sky")
  );
  const isBackgroundRemovalMode = mode === "remove-bg" || mode === "remove-sky";
  const supportsReferenceStrength = Boolean(
    usesReferenceImage &&
    !isBackgroundRemovalMode &&
    selectedModel.id !== "fal-ai/flux-2-pro"
  );

  const referenceModelNote = useMemo(() => {
    if (!usesReferenceImage || isBackgroundRemovalMode) {
      return selectedModel.description;
    }
    if (selectedModel.id === "fal-ai/flux-2-pro") {
      return "Edits your reference in place — prompt-driven, no adherence slider.";
    }
    if (selectedModel.imageReference) {
      return `${selectedModel.label} with reference adherence control.`;
    }
    return `${selectedModel.label} uses Flux Dev image-to-image — your Sanity reference is cropped to the selected size first (adherence slider applies).`;
  }, [isBackgroundRemovalMode, selectedModel, usesReferenceImage]);

  const clearNotice = () => {
    window.setTimeout(() => setNotice(null), 2800);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setNotice(null);

    try {
      const validationMessage = missingReferenceMessage(
        mode,
        isBackgroundRemovalMode,
        selectedAsset
      );
      if (validationMessage) {
        throw new Error(validationMessage);
      }

      const response = await fetch(falStudioApiEndpoint, {
        body: JSON.stringify(
          buildGenerationRequestBody({
            backgroundRemovalModel,
            enhancePrompt,
            imageSize,
            isBackgroundRemovalMode,
            isTxshingleLoraModel,
            loraScale,
            mode,
            model,
            numImages,
            outputFormat,
            prompt,
            referenceAdherence,
            seed,
            selectedAsset,
            seriesVariations,
            supportsReferenceStrength,
            usesReferenceImage,
          })
        ),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = await readFalGenerateResponse(response);
      if (!(response.ok && "ok" in body) || body.ok !== true) {
        const message = "error" in body ? body.error : undefined;
        throw new Error(
          message || `Fal request failed with ${response.status}.`
        );
      }
      setResult(body);
      setNotice(generatedNotice(body.images.length));
      clearNotice();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not generate images with Fal."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToSanity = async (
    image: FalGeneratedImage,
    index: number
  ) => {
    setSavingUrl(image.url);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(image.url);
      if (!response.ok) {
        throw new Error(
          `Could not download generated image (${response.status}).`
        );
      }
      const blob = await response.blob();
      const extension = imageExtension(image.contentType);
      const filename = `${safeFilename((image.variation || prompt).slice(0, 56), "fal-image")}-${index + 1}.${extension}`;
      const asset = await client.assets.upload("image", blob, {
        contentType: image.contentType,
        filename,
      });
      await client
        .patch(asset._id)
        .set({
          altText: (image.prompt || prompt).slice(0, 180),
          description: `Generated with ${selectedModel.label} in AI Image Studio.`,
          title: stripFilenameExtension(filename),
        })
        .commit();
      setNotice("Saved generated image to Sanity assets.");
      clearNotice();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save generated image."
      );
    } finally {
      setSavingUrl(null);
    }
  };

  const handleCropSave = async (blob: Blob, filename: string) => {
    setError(null);
    try {
      const asset = await client.assets.upload("image", blob, {
        contentType: blob.type,
        filename,
      });
      await client
        .patch(asset._id)
        .set({
          description: "Cropped in AI Image Studio.",
          title: stripFilenameExtension(filename),
        })
        .commit();
      setNotice("Saved cropped image to Sanity assets.");
      clearNotice();
      await loadAssets();
      setCropTarget(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save cropped image."
      );
      throw caughtError;
    }
  };

  const handleSelectAsset = (asset: SanityImageAsset) => {
    setSelectedAssetId(asset._id);
    setMode((current) => {
      if (current === "series") {
        return "series";
      }
      return "image";
    });
  };

  const handleCropAsset = (asset: SanityImageAsset) => {
    setCropTarget({
      label: imageLabel(asset),
      url: asset.url,
    });
  };

  const handleCropImage = (image: FalGeneratedImage, index: number) => {
    setCropTarget({
      label: image.variation || image.fileName || `Image ${index + 1}`,
      url: image.url,
    });
  };

  return (
    <main className={studioToolClassName(colorScheme)}>
      <FalToolHeader
        cropTarget={cropTarget}
        generateDisabled={isGenerateDisabled({
          generating,
          isBackgroundRemovalMode,
          prompt,
          selectedAsset,
        })}
        generating={generating}
        mode={mode}
        onCloseCrop={() => setCropTarget(null)}
        onGenerate={handleGenerate}
        onSaveCrop={handleCropSave}
      />

      {error ? <div className="fis__alert">{error}</div> : null}
      {notice ? <div className="fis__notice">{notice}</div> : null}

      <section className="fis__workspace">
        <GenerationControls
          backgroundRemovalModel={backgroundRemovalModel}
          enhancePrompt={enhancePrompt}
          imageSize={imageSize}
          isBackgroundRemovalMode={isBackgroundRemovalMode}
          isTxshingleLoraModel={isTxshingleLoraModel}
          loraScale={loraScale}
          mode={mode}
          model={model}
          numImages={numImages}
          onBackgroundRemovalModelChange={setBackgroundRemovalModel}
          onEnhancePromptChange={setEnhancePrompt}
          onImageSizeChange={setImageSize}
          onLoraScaleChange={setLoraScale}
          onModeChange={setMode}
          onModelChange={setModel}
          onNumImagesChange={setNumImages}
          onOutputFormatChange={setOutputFormat}
          onPromptChange={setPrompt}
          onReferenceAdherenceChange={setReferenceAdherence}
          onSeedChange={setSeed}
          onSeriesVariationsChange={setSeriesVariations}
          outputFormat={outputFormat}
          prompt={prompt}
          referenceAdherence={referenceAdherence}
          referenceModelNote={referenceModelNote}
          seed={seed}
          selectedModel={selectedModel}
          seriesVariations={seriesVariations}
          supportsReferenceStrength={supportsReferenceStrength}
          usesReferenceImage={usesReferenceImage}
        />
        <AssetLibrary
          assetSearch={assetSearch}
          filteredAssets={filteredAssets}
          loadingAssets={loadingAssets}
          mode={mode}
          onAssetSearchChange={setAssetSearch}
          onClearReference={() => setSelectedAssetId(null)}
          onCropAsset={handleCropAsset}
          onLoadAssets={() => void loadAssets()}
          onSelectAsset={handleSelectAsset}
          selectedAsset={selectedAsset}
          selectedAssetId={selectedAssetId}
        />
        <ResultsPanel
          onCropImage={handleCropImage}
          onSaveImage={(image, index) => void handleSaveToSanity(image, index)}
          result={result}
          savingUrl={savingUrl}
        />
      </section>
    </main>
  );
}
