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

import { falStudioApiEndpoint } from "../falStudioConfig";
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

type SanityImageAsset = {
  _id: string;
  altText?: string;
  originalFilename?: string;
  title?: string;
  url: string;
  metadata?: {
    dimensions?: {
      height?: number;
      width?: number;
    };
    lqip?: string;
  };
};

type FalGeneratedImage = {
  contentType: string;
  fileName: string;
  fileSize?: number;
  height?: number;
  prompt?: string;
  requestId?: string;
  url: string;
  variation?: string;
  width?: number;
};

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
    id: "fal-ai/ideogram/remove-background",
    family: "Ideogram",
    label: "Ideogram | Background Removal",
    description:
      "Remove image background — outputs transparent PNG. Select a Sanity image as the source.",
    imageReference: true,
    supportsWebp: true,
    removeBgOnly: true,
  },
  {
    id: "fal-ai/flux/schnell",
    family: "Flux",
    label: "Flux | Schnell",
    description: "Fast drafts and social concepts",
    imageReference: true,
  },
  {
    id: "fal-ai/flux/dev",
    family: "Flux",
    label: "Flux | Dev",
    description: "Higher-quality campaign images",
    imageReference: true,
  },
  {
    id: "fal-ai/flux-lora",
    family: "Flux",
    label: "Flux | txshingle LoRA",
    description:
      "Birdcreek-trained asphalt shingle texture — text-to-image only. Prompts auto-include the txshingle trigger.",
  },
  {
    id: "fal-ai/flux/krea",
    family: "Flux",
    label: "Flux | Krea",
    description: "Photorealistic brand and product-style image drafts",
  },
  {
    id: "fal-ai/flux-pro/v1.1",
    family: "Flux Pro",
    label: "Flux Pro | 1.1",
    description: "Sharper commercial concepts with better prompt following",
  },
  {
    id: "fal-ai/flux-pro/v1.1-ultra",
    family: "Flux Pro",
    label: "Flux Pro | 1.1 Ultra",
    description: "Premium high-detail creative output",
  },
  {
    id: "fal-ai/flux-pro/kontext/text-to-image",
    family: "Flux Kontext",
    label: "Flux Kontext | Text to image",
    description: "Context-aware text-to-image concepts",
  },
  {
    id: "fal-ai/flux-2/flash",
    family: "Flux 2",
    label: "Flux 2 | Flash",
    description: "Fast newer-generation image drafts",
    supportsWebp: true,
  },
  {
    id: "fal-ai/flux-2",
    family: "Flux 2",
    label: "Flux 2 | Standard",
    description: "Newer-generation balanced image generation",
    supportsWebp: true,
  },
  {
    id: "fal-ai/flux-2-pro",
    family: "Flux 2",
    imageReference: true,
    label: "Flux 2 | Pro",
    description: "Higher-end Flux 2 generation and image edits",
  },
  {
    id: "fal-ai/qwen-image",
    family: "Qwen",
    imageReference: true,
    label: "Qwen | Image",
    description: "Strong typography, signs, and visual detail",
  },
  {
    id: "fal-ai/ideogram/v3",
    family: "Ideogram",
    label: "Ideogram | V3",
    description: "Ad concepts with strong composition and text rendering",
  },
  {
    id: "fal-ai/recraft/v4/text-to-image",
    family: "Recraft",
    label: "Recraft | V4",
    description: "Graphic design, illustration, and controlled brand visuals",
    supportsWebp: true,
  },
  {
    id: "fal-ai/bytedance/seedream/v4/text-to-image",
    family: "Seedream",
    label: "Seedream | V4",
    description: "Flexible high-quality campaign image generation",
  },
  {
    id: "fal-ai/imagen4/preview",
    family: "Google",
    label: "Imagen 4 | Preview",
    description: "Google image generation through Fal",
  },
  {
    id: "fal-ai/nano-banana-pro",
    family: "Google",
    label: "Nano Banana | Pro",
    description: "Nano Banana image generation through Fal",
  },
];

const FAL_IMAGE_LONG_EDGE_PX = 1800;

const falImagePixelSize = (imageSize: FalImageSize): { height: number; width: number } => {
  switch (imageSize) {
    case "landscape_16_9":
      return {
        width: FAL_IMAGE_LONG_EDGE_PX,
        height: Math.round((FAL_IMAGE_LONG_EDGE_PX * 9) / 16),
      };
    case "landscape_4_3":
      return {
        width: FAL_IMAGE_LONG_EDGE_PX,
        height: Math.round((FAL_IMAGE_LONG_EDGE_PX * 3) / 4),
      };
    case "portrait_16_9":
      return {
        width: Math.round((FAL_IMAGE_LONG_EDGE_PX * 9) / 16),
        height: FAL_IMAGE_LONG_EDGE_PX,
      };
    case "portrait_4_3":
      return {
        width: Math.round((FAL_IMAGE_LONG_EDGE_PX * 3) / 4),
        height: FAL_IMAGE_LONG_EDGE_PX,
      };
    case "square_hd":
    case "square":
    default:
      return { width: FAL_IMAGE_LONG_EDGE_PX, height: FAL_IMAGE_LONG_EDGE_PX };
  }
};

const formatFalSizeLabel = (imageSize: FalImageSize, name: string): string => {
  const { width, height } = falImagePixelSize(imageSize);
  return `${name} (${width}×${height})`;
};

const SIZE_OPTIONS: { id: FalImageSize; label: string }[] = [
  { id: "square_hd", label: formatFalSizeLabel("square_hd", "Square HD") },
  { id: "square", label: formatFalSizeLabel("square", "Square") },
  { id: "landscape_4_3", label: formatFalSizeLabel("landscape_4_3", "Landscape 4:3") },
  { id: "landscape_16_9", label: formatFalSizeLabel("landscape_16_9", "Landscape 16:9") },
  { id: "portrait_4_3", label: formatFalSizeLabel("portrait_4_3", "Portrait 4:3") },
  { id: "portrait_16_9", label: formatFalSizeLabel("portrait_16_9", "Portrait 16:9") },
];

const DEFAULT_PROMPT = `Casual smartphone photo of a real one-story house on a Central Texas suburban street, asphalt shingle roof and gutters taking up most of the frame, shot from the sidewalk at a slight angle — not centered, not symmetrical. Flat midday light or thin overcast, normal exposure with no HDR glow. Lived-in details: uneven grass, a parked SUV partly in frame, mailbox, oak tree branches cutting into the sky, neighbor roofline at the edge. Looks like a homeowner snapped it before calling a roofer — documentary, unstaged, imperfect framing. Not real estate listing photography, not magazine, not golden hour, not aerial, no text or logos.`;

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
  const value = (event as { target: WaNumberInputElement }).target.value;
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

const imageDimensions = (image: FalGeneratedImage | SanityImageAsset): string => {
  const width =
    "url" in image && "contentType" in image ? image.width : image.metadata?.dimensions?.width;
  const height =
    "url" in image && "contentType" in image ? image.height : image.metadata?.dimensions?.height;
  if (!width || !height) {
    return "Unknown dimensions";
  }
  return `${width} x ${height}`;
};

const safeFilename = (value: string, fallback: string): string => {
  const clean = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || fallback;
};

// ── Crop tool ─────────────────────────────────────────────────────────────────

type CropRect = { x: number; y: number; w: number; h: number };
type DragHandle = "body" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

const ASPECT_RATIOS: Record<string, number | null> = {
  Free: null,
  "1 : 1": 1,
  "4 : 3": 4 / 3,
  "3 : 4": 3 / 4,
  "16 : 9": 16 / 9,
  "9 : 16": 9 / 16,
};

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

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
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [, forceUpdate] = useState(0);
  const [crop, setCrop] = useState<CropRect>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
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
    fetch(imageUrl)
      .then((r) => r.blob())
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobSrc(url);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, [imageUrl]);

  const onImgLoad = () => {
    const img = imgRef.current;
    if (img) {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      forceUpdate((n) => n + 1);
    }
  };

  const applyAspect = (rect: CropRect, ratio: number | null): CropRect => {
    if (!ratio || !naturalSize.w) return rect;
    const { x, y, w } = rect;
    const h = clamp((w * naturalSize.w) / (ratio * naturalSize.h), 0.02, 1 - y);
    return { x, y, w, h };
  };

  const getDisplayRect = () => {
    const img = imgRef.current;
    const con = containerRef.current;
    if (!img || !con) return null;
    const r = img.getBoundingClientRect();
    const c = con.getBoundingClientRect();
    const ox = r.left - c.left,
      oy = r.top - c.top;
    return {
      left: ox + crop.x * r.width,
      top: oy + crop.y * r.height,
      width: crop.w * r.width,
      height: crop.h * r.height,
      imgLeft: ox,
      imgTop: oy,
      imgW: r.width,
      imgH: r.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent, handle: DragHandle) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { handle, startX: e.clientX, startY: e.clientY, startCrop: { ...crop } };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !imgRef.current) return;
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
      if (handle.includes("e")) w = clamp(w + dx, 0.05, 1 - x);
      if (handle.includes("w")) {
        x = clamp(x + dx, 0, x + w - 0.05);
        w = startCrop.x + startCrop.w - x;
      }
      if (handle.includes("s")) h = clamp(h + dy, 0.05, 1 - y);
      if (handle.includes("n")) {
        y = clamp(y + dy, 0, y + h - 0.05);
        h = startCrop.y + startCrop.h - y;
      }
    }
    const next = applyAspect({ x, y, w, h }, ratio);
    setCrop({
      x: clamp(next.x, 0, 1 - next.w),
      y: clamp(next.y, 0, 1 - next.h),
      w: clamp(next.w, 0.02, 1),
      h: clamp(next.h, 0.02, 1),
    });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const handleApply = async () => {
    if (!blobSrc) return;
    setApplying(true);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = blobSrc;
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * crop.w);
      canvas.height = Math.round(img.naturalHeight * crop.h);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(
        img,
        Math.round(img.naturalWidth * crop.x),
        Math.round(img.naturalHeight * crop.y),
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const mime =
        cropFormat === "jpeg" ? "image/jpeg" : cropFormat === "webp" ? "image/webp" : "image/png";
      const ext = cropFormat === "jpeg" ? "jpg" : cropFormat;
      await new Promise<void>((res, rej) => {
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              rej(new Error("Canvas export failed"));
              return;
            }
            await onSave(blob, `cropped-${Date.now()}.${ext}`);
            res();
          },
          mime,
          0.92,
        );
      });
    } finally {
      setApplying(false);
    }
  };

  const dr = getDisplayRect();
  const outputW = naturalSize.w ? Math.round(naturalSize.w * crop.w) : 0;
  const outputH = naturalSize.h ? Math.round(naturalSize.h * crop.h) : 0;

  const handles: { id: DragHandle; style: React.CSSProperties }[] = [
    { id: "nw", style: { top: -5, left: -5, cursor: "nw-resize" } },
    {
      id: "n",
      style: { top: -5, left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" },
    },
    { id: "ne", style: { top: -5, right: -5, cursor: "ne-resize" } },
    {
      id: "e",
      style: { top: "50%", right: -5, transform: "translateY(-50%)", cursor: "ew-resize" },
    },
    { id: "se", style: { bottom: -5, right: -5, cursor: "se-resize" } },
    {
      id: "s",
      style: { bottom: -5, left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" },
    },
    { id: "sw", style: { bottom: -5, left: -5, cursor: "sw-resize" } },
    {
      id: "w",
      style: { top: "50%", left: -5, transform: "translateY(-50%)", cursor: "ew-resize" },
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.9)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "1.5rem",
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          width: "100%",
          maxWidth: 960,
          alignItems: "center",
          gap: "0.75rem",
          color: "#fff",
          flexWrap: "wrap",
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
          value={aspectKey}
          onChange={(e) => {
            const k = e.target.value;
            setAspectKey(k);
            setCrop((c) => applyAspect(c, ASPECT_RATIOS[k] ?? null));
          }}
          style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: 4 }}
        >
          {Object.keys(ASPECT_RATIOS).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          value={cropFormat}
          onChange={(e) => setCropFormat(e.target.value as "png" | "jpeg" | "webp")}
          style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: 4 }}
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
          position: "relative",
          flex: 1,
          width: "100%",
          maxWidth: 960,
          maxHeight: "calc(100vh - 14rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {loadError ? (
          <span style={{ color: "#f88" }}>Could not load image.</span>
        ) : !blobSrc ? (
          <span style={{ color: "rgba(255,255,255,0.5)" }}>Loading…</span>
        ) : (
          <>
            <img
              ref={imgRef}
              src={blobSrc}
              alt=""
              onLoad={onImgLoad}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                display: "block",
                userSelect: "none",
                pointerEvents: "none",
              }}
              draggable={false}
            />
            {dr && (
              <>
                {/* Dark mask */}
                {(
                  [
                    {
                      top: dr.imgTop,
                      left: dr.imgLeft,
                      width: dr.imgW,
                      height: dr.top - dr.imgTop,
                    },
                    {
                      top: dr.top + dr.height,
                      left: dr.imgLeft,
                      width: dr.imgW,
                      height: dr.imgTop + dr.imgH - dr.top - dr.height,
                    },
                    {
                      top: dr.top,
                      left: dr.imgLeft,
                      width: dr.left - dr.imgLeft,
                      height: dr.height,
                    },
                    {
                      top: dr.top,
                      left: dr.left + dr.width,
                      width: dr.imgLeft + dr.imgW - dr.left - dr.width,
                      height: dr.height,
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
                    position: "absolute",
                    left: dr.left,
                    top: dr.top,
                    width: dr.width,
                    height: dr.height,
                    border: "2px solid rgba(255,255,255,0.9)",
                    cursor: "move",
                    boxSizing: "border-box",
                  }}
                >
                  {[1 / 3, 2 / 3].map((f) => (
                    <div
                      key={`v${f}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: `${f * 100}%`,
                        width: 1,
                        background: "rgba(255,255,255,0.2)",
                        pointerEvents: "none",
                      }}
                    />
                  ))}
                  {[1 / 3, 2 / 3].map((f) => (
                    <div
                      key={`h${f}`}
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: `${f * 100}%`,
                        height: 1,
                        background: "rgba(255,255,255,0.2)",
                        pointerEvents: "none",
                      }}
                    />
                  ))}
                  {handles.map(({ id, style }) => (
                    <div
                      key={id}
                      onPointerDown={(e) => onPointerDown(e, id)}
                      style={{
                        position: "absolute",
                        width: 10,
                        height: 10,
                        background: "#fff",
                        borderRadius: 2,
                        ...style,
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <WaButton size="xs" onClick={onClose}>
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

type ReferenceAdherenceSliderProps = {
  onValueChange: (value: number) => void;
  value: number;
};

const ReferenceAdherenceSlider = ({ onValueChange, value }: ReferenceAdherenceSliderProps) => {
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
      <label>Reference adherence</label>
      <p className="fis__control-hint">
        Higher keeps more of the reference photo. Lower lets the prompt reshape the scene.
      </p>
      <WaSlider max={1} min={0.05} ref={sliderRef} size="xs" step={0.01} value={value} />
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
      <label>LoRA strength</label>
      <p className="fis__control-hint">
        How strongly the txshingle granule texture applies. Lower for subtle blends; higher for
        obvious shingle detail.
      </p>
      <WaSlider max={1.5} min={0.25} ref={sliderRef} size="xs" step={0.05} value={value} />
      <span>{value.toFixed(2)}</span>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────

export function FalImageStudioTool() {
  const client = useStudioClient({ apiVersion: "2026-05-01" });
  const colorScheme = useColorSchemeValue();
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [mode, setMode] = useState<GenerateMode>("text");
  const [model, setModel] = useState<FalModelId>("fal-ai/flux/schnell");
  const [imageSize, setImageSize] = useState<FalImageSize>("landscape_4_3");
  const [numImages, setNumImages] = useState(2);
  const [outputFormat, setOutputFormat] = useState<"jpeg" | "png" | "webp">("png");
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
  const [result, setResult] = useState<Extract<FalGenerateResponse, { ok: true }> | null>(null);
  const [cropTarget, setCropTarget] = useState<{ url: string; label: string } | null>(null);

  const loadAssets = useCallback(async () => {
    setLoadingAssets(true);
    try {
      const nextAssets = await client.fetch<SanityImageAsset[]>(imageAssetQuery);
      setAssets(nextAssets);
      setSelectedAssetId((current) =>
        current && nextAssets.some((asset) => asset._id === current) ? current : null,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load Sanity images.");
    } finally {
      setLoadingAssets(false);
    }
  }, [client]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const selectedModel = useMemo(
    () => MODEL_OPTIONS.find((option) => option.id === model) ?? MODEL_OPTIONS[0],
    [model],
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
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [assetSearch, assets]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset._id === selectedAssetId) ?? null,
    [assets, selectedAssetId],
  );
  const isTxshingleLoraModel = model === "fal-ai/flux-lora";
  const usesReferenceImage = Boolean(
    !isTxshingleLoraModel &&
    selectedAsset &&
    (mode === "image" || mode === "series" || mode === "remove-bg" || mode === "remove-sky"),
  );
  const isBackgroundRemovalMode = mode === "remove-bg" || mode === "remove-sky";
  const supportsReferenceStrength = Boolean(
    usesReferenceImage && !isBackgroundRemovalMode && selectedModel.id !== "fal-ai/flux-2-pro",
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
      if ((mode === "image" || isBackgroundRemovalMode) && !selectedAsset) {
        throw new Error(
          mode === "remove-sky"
            ? "Select a Sanity image to remove the sky."
            : mode === "remove-bg"
              ? "Select a Sanity image to remove its background."
              : "Select a Sanity image to use as the reference.",
        );
      }

      const response = await fetch(falStudioApiEndpoint, {
        body: JSON.stringify({
          backgroundRemovalModel: mode === "remove-bg" ? backgroundRemovalModel : undefined,
          enhancePrompt,
          imageSize,
          mode,
          model,
          numImages: isBackgroundRemovalMode ? 1 : numImages,
          outputFormat: isBackgroundRemovalMode ? "png" : outputFormat,
          prompt,
          referenceImageUrl:
            isBackgroundRemovalMode || usesReferenceImage ? selectedAsset?.url : undefined,
          seed: seed.trim(),
          loraScale: isTxshingleLoraModel ? loraScale : undefined,
          referenceAdherence: supportsReferenceStrength ? referenceAdherence : undefined,
          seriesVariations,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => ({}))) as FalGenerateResponse;
      if (!response.ok || !("ok" in body) || body.ok !== true) {
        const message = "error" in body ? body.error : undefined;
        throw new Error(message || `Fal request failed with ${response.status}.`);
      }
      setResult(body);
      setNotice(`Generated ${body.images.length} image${body.images.length === 1 ? "" : "s"}.`);
      clearNotice();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate images with Fal.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToSanity = async (image: FalGeneratedImage, index: number) => {
    setSavingUrl(image.url);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(image.url);
      if (!response.ok) {
        throw new Error(`Could not download generated image (${response.status}).`);
      }
      const blob = await response.blob();
      const extension =
        image.contentType.includes("jpeg") || image.contentType.includes("jpg")
          ? "jpg"
          : image.contentType.includes("webp")
            ? "webp"
            : "png";
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
          title: filename.replace(/\.[^.]+$/, ""),
        })
        .commit();
      setNotice("Saved generated image to Sanity assets.");
      clearNotice();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save generated image.");
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
          title: filename.replace(/\.[^.]+$/, ""),
          description: "Cropped in AI Image Studio.",
        })
        .commit();
      setNotice("Saved cropped image to Sanity assets.");
      clearNotice();
      await loadAssets();
      setCropTarget(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save cropped image.");
      throw caught;
    }
  };

  return (
    <main
      className={
        colorScheme === "dark"
          ? "studio-tool fis studio-tool--dark"
          : "studio-tool fis studio-tool--light"
      }
    >
      <header className="fis__header">
        <div>
          <p>Fal.ai</p>
          <h1>Image Studio</h1>
        </div>
        {cropTarget && (
          <CropModal
            imageUrl={cropTarget.url}
            label={cropTarget.label}
            onSave={handleCropSave}
            onClose={() => setCropTarget(null)}
          />
        )}
        <WaButton
          appearance="filled"
          disabled={
            generating ||
            (!isBackgroundRemovalMode && !prompt.trim()) ||
            (isBackgroundRemovalMode && !selectedAsset)
          }
          onClick={() => void handleGenerate()}
          size="xs"
          variant="brand"
        >
          {generating
            ? mode === "remove-sky"
              ? "Removing sky..."
              : mode === "remove-bg"
                ? "Removing background..."
                : "Generating..."
            : mode === "remove-sky"
              ? "Remove sky"
              : mode === "remove-bg"
                ? "Remove background"
                : "Generate images"}
        </WaButton>
      </header>

      {error ? <div className="fis__alert">{error}</div> : null}
      {notice ? <div className="fis__notice">{notice}</div> : null}

      <section className="fis__workspace">
        <aside className="fis__controls">
          <div className="fis__control-group">
            <WaSelect
              label="Mode"
              size="xs"
              value={mode}
              withClear={false}
              onInput={(event) => setMode(getSelectValue(event) as GenerateMode)}
            >
              <WaOption value="text">Text to image</WaOption>
              <WaOption value="image">Image to image</WaOption>
              <WaOption value="series">Prompt series</WaOption>
              <WaOption value="remove-sky">Remove sky</WaOption>
              <WaOption value="remove-bg">Remove background</WaOption>
            </WaSelect>
          </div>

          {mode === "remove-sky" ? (
            <div className="fis__control-group">
              <p className="fis__control-hint">
                <strong>EVF-SAM2</strong> segments only the sky and clouds, then composites a
                transparent PNG while keeping the house, roof, trees, and yard intact. Best for
                exterior roofing photos where BiRefNet eats into the structure.
              </p>
            </div>
          ) : null}

          {mode === "remove-bg" ? (
            <div className="fis__control-group">
              <WaSelect
                label="Background removal model"
                name="backgroundRemovalModel"
                onInput={(event) =>
                  setBackgroundRemovalModel(getSelectValue(event) as BackgroundRemovalModel)
                }
                size="xs"
                value={backgroundRemovalModel}
                withClear={false}
              >
                <WaOption value="ideogram">Ideogram — clean edges (recommended)</WaOption>
                <WaOption value="bria">Bria RMBG 2.0 — commercial-safe matting</WaOption>
                <WaOption value="birefnet-heavy">BiRefNet Heavy — legacy fallback</WaOption>
              </WaSelect>
              <p className="fis__control-hint">
                Removes everything behind the main subject. For house photos where you only want the
                sky gone, use <strong>Remove sky</strong> instead.
              </p>
            </div>
          ) : null}

          {!isBackgroundRemovalMode ? (
            <div className="fis__control-group">
              <WaTextarea
                label="Prompt"
                className="fis__prompt"
                onInput={(event) => setPrompt(getInputValue(event))}
                rows={10}
                size="xs"
                value={prompt}
              />
            </div>
          ) : null}

          {mode === "series" ? (
            <div className="fis__control-group">
              <label>Series variation directions</label>
              <WaTextarea
                className="fis__prompt"
                onInput={(event) => setSeriesVariations(getInputValue(event))}
                placeholder={SERIES_DIRECTION_PLACEHOLDER}
                rows={12}
                size="xs"
                value={seriesVariations}
              />
              <span>
                One line per image (up to 12). Write scene, camera angle, roof detail, and mood —
                not ad headlines. The base prompt above stays shared; each line steers one Fal job.
                Optional reference image applies to every variation.
              </span>
            </div>
          ) : null}

          {!isBackgroundRemovalMode && (
            <div className="fis__grid-controls">
              <div className="fis__control-group">
                <WaSelect
                  label="Model"
                  name="model"
                  size="xs"
                  value={model}
                  withClear={false}
                  onInput={(event) => setModel(getSelectValue(event) as FalModelId)}
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
                  size="xs"
                  value={imageSize}
                  withClear={false}
                  onInput={(event) => setImageSize(getSelectValue(event) as FalImageSize)}
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
                  size="xs"
                  name="count"
                  label="Count"
                  max={4}
                  min={1}
                  onInput={(event) => setNumImages(getNumberInputValue(event))}
                  value={String(numImages)}
                />
              </div>

              <div className="fis__control-group">
                <WaSelect
                  label="Format"
                  name="format"
                  size="xs"
                  disabled={usesReferenceImage}
                  value={outputFormat}
                  withClear={false}
                  onInput={(event) =>
                    setOutputFormat(getSelectValue(event) as "jpeg" | "png" | "webp")
                  }
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
                  size="xs"
                  name="seed"
                  label="Seed"
                  inputMode="numeric"
                  onInput={(event) => setSeed(getInputValue(event))}
                  placeholder="Random"
                  type="text"
                  value={seed}
                />
              </div>
            </div>
          )}

          {isTxshingleLoraModel && !isBackgroundRemovalMode ? (
            <LoraScaleSlider onValueChange={setLoraScale} value={loraScale} />
          ) : null}

          {usesReferenceImage && !isBackgroundRemovalMode && supportsReferenceStrength ? (
            <ReferenceAdherenceSlider
              onValueChange={setReferenceAdherence}
              value={referenceAdherence}
            />
          ) : null}

          {usesReferenceImage &&
          !isBackgroundRemovalMode &&
          selectedModel.id === "fal-ai/flux-2-pro" ? (
            <p className="fis__control-hint">
              Flux 2 Pro Edit follows your prompt but does not expose a reference-strength control.
              Use Flux Dev or Qwen for adjustable blending.
            </p>
          ) : null}

          {!isBackgroundRemovalMode && (
            <WaCheckbox
              checked={enhancePrompt}
              disabled={usesReferenceImage || isTxshingleLoraModel}
              onInput={(event) => setEnhancePrompt(getCheckboxValue(event))}
              size="xs"
            >
              Enhance prompt
            </WaCheckbox>
          )}
        </aside>

        <aside className="fis__library">
          <div className="fis__library-header">
            <div>
              <p>Sanity assets</p>
              <strong>Optional reference image</strong>
            </div>
            <WaButton disabled={loadingAssets} onClick={() => void loadAssets()} size="xs">
              Refresh
            </WaButton>
          </div>
          <WaInput
            size="xs"
            onInput={(event) => setAssetSearch(getInputValue(event))}
            placeholder="Search images"
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
              <WaButton
                onClick={() =>
                  setCropTarget({ url: selectedAsset.url, label: imageLabel(selectedAsset) })
                }
                size="xs"
              >
                Crop
              </WaButton>
              <WaButton onClick={() => setSelectedAssetId(null)} size="xs">
                Clear reference
              </WaButton>
            </div>
          ) : null}

          <div className="fis__asset-grid">
            {filteredAssets.map((asset) => (
              <WaButton
                appearance="plain"
                className={
                  asset._id === selectedAssetId ? "fis__asset-tile is-selected" : "fis__asset-tile"
                }
                key={asset._id}
                onClick={() => {
                  setSelectedAssetId(asset._id);
                  setMode((current) => (current === "series" ? "series" : "image"));
                }}
                size="xs"
                title={imageLabel(asset)}
              >
                <img
                  alt=""
                  loading="lazy"
                  src={`${asset.url}?w=260&h=190&fit=crop&fm=webp`}
                  style={
                    asset.metadata?.lqip
                      ? { backgroundImage: `url(${asset.metadata.lqip})` }
                      : undefined
                  }
                />
                <span>{imageLabel(asset)}</span>
              </WaButton>
            ))}
          </div>

          {!loadingAssets && filteredAssets.length === 0 ? (
            <div className="fis__empty-small">No images match that search.</div>
          ) : null}
        </aside>

        <section className="fis__results">
          {result ? (
            <>
              <div className="fis__result-summary">
                <div>
                  <strong>{result.images.length} generated images</strong>
                  <span>
                    {result.jobs.length} Fal job{result.jobs.length === 1 ? "" : "s"}
                    {result.jobs[0]?.appliedStrength != null
                      ? ` · transform ${result.jobs[0].appliedStrength.toFixed(2)} (adherence ${result.jobs[0].appliedReferenceAdherence?.toFixed(2) ?? "—"})`
                      : ""}
                  </span>
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
                        onClick={() => void handleSaveToSanity(image, index)}
                        size="xs"
                        variant="brand"
                      >
                        {savingUrl === image.url ? "Saving..." : "Save to Sanity"}
                      </WaButton>
                      <WaButton
                        size="xs"
                        onClick={() =>
                          setCropTarget({
                            url: image.url,
                            label: image.variation || image.fileName || `Image ${index + 1}`,
                          })
                        }
                      >
                        Crop
                      </WaButton>
                      <WaButton href={image.url} rel="noreferrer" size="xs" target="_blank">
                        Open
                      </WaButton>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="fis__empty">
              Generate roofing campaign images, create a prompt series, or select a Sanity image for
              image-to-image and reference-based series.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
