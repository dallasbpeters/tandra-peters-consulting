import {
  CloudUpload,
  Download,
  MediaImage,
  NavArrowDown,
  Play,
  Refresh,
} from "iconoir-react";
import type { ChangeEvent, DragEvent, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { SitePageChrome } from "../components/site-page-chrome";
import { useIsMobile } from "../hooks/is-mobile";
import { usePageMetadata } from "../hooks/use-page-metadata";

import "../styles/fal-upscaler.css";

const SCALE_OPTIONS = [2, 4, 8, 16] as const;

const MODEL_OPTIONS = [
  {
    description: "General purpose, clean detail recovery.",
    id: "RealESRGAN_x4plus",
    label: "RealESRGAN x4+",
  },
  {
    description: "Softer 2x output for smaller images.",
    id: "RealESRGAN_x2plus",
    label: "RealESRGAN x2+",
  },
  {
    description: "Sharper, stylized illustration-friendly output.",
    id: "RealESRGAN_x4plus_anime_6B",
    label: "Anime 6B",
  },
  {
    description: "Balanced detail pass with lower artifact risk.",
    id: "RealESRGAN_x4_v3",
    label: "RealESRGAN x4 v3",
  },
  {
    description: "Strong de-noise and restoration.",
    id: "RealESRGAN_x4_wdn_v3",
    label: "WDN v3",
  },
  {
    description: "Fast creative look for anime-heavy art.",
    id: "RealESRGAN_x4_anime_v3",
    label: "Anime v3",
  },
  {
    description: "Topaz general-purpose enhancement for most photographs.",
    id: "Standard V2",
    label: "Topaz Standard V2",
  },
  {
    description: "Topaz restoration tuned for small, low-resolution sources.",
    id: "Low Resolution V2",
    label: "Topaz Low Resolution V2",
  },
  {
    description: "Topaz enhancement for rendered and computer-generated art.",
    id: "CGI",
    label: "Topaz CGI",
  },
  {
    description: "Topaz preserves fine source detail with restrained changes.",
    id: "High Fidelity V2",
    label: "Topaz High Fidelity V2",
  },
  {
    description: "Topaz sharpens and restores text inside images.",
    id: "Text Refine",
    label: "Topaz Text Refine",
  },
  {
    description: "Topaz restores damaged or heavily degraded images.",
    id: "Recovery",
    label: "Topaz Recovery",
  },
  {
    description: "Topaz's newer recovery model with subject-aware enhancement.",
    id: "Recovery V2",
    label: "Topaz Recovery V2",
  },
  {
    description:
      "Generative Topaz enhancement that can reconstruct new detail.",
    id: "Redefine",
    label: "Topaz Redefine",
  },
  {
    description: "Topaz maximum-quality standard enhancement.",
    id: "Standard MAX",
    label: "Topaz Standard MAX",
  },
  {
    description:
      "Topaz generative enhancement for richer reconstructed detail.",
    id: "Wonder",
    label: "Topaz Wonder",
  },
  {
    description:
      "Topaz's latest Wonder model with automatic enhancement strength.",
    id: "Wonder 3",
    label: "Topaz Wonder 3",
  },
] as const;

const TOPAZ_MODELS = new Set<string>([
  "Low Resolution V2",
  "Standard V2",
  "CGI",
  "High Fidelity V2",
  "Text Refine",
  "Recovery",
  "Redefine",
  "Recovery V2",
  "Standard MAX",
  "Wonder",
  "Wonder 3",
]);

const STRIP_EXTENSION_REGEX = /\.[^.]+$/u;
const BASE64_CHUNK_SIZE = 32_768;

const OUTPUT_FORMATS = [
  {
    id: "png",
    label: "PNG",
  },
  {
    id: "jpeg",
    label: "JPEG",
  },
] as const;

interface UpscaleResponse {
  face: boolean;
  image: {
    content_type?: string;
    file_name?: string;
    file_size?: number;
    height?: number;
    url: string;
    width?: number;
  };
  model: string;
  provider: "esrgan" | "topaz";
  outputFormat: "jpeg" | "png";
  requestId: string;
  scale: number;
  sourceUrl: string;
  tile: number;
}

interface QueueItem {
  dataUrl: string;
  error?: string;
  file: File;
  id: string;
  previewUrl: string;
  result?: UpscaleResponse;
  status: "idle" | "processing" | "done" | "error";
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE) {
    binary += String.fromCodePoint(
      ...bytes.subarray(index, index + BASE64_CHUNK_SIZE)
    );
  }
  return btoa(binary);
};

const readFileAsDataUrl = async (file: File): Promise<string> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
};

const postUpscaleJob = async ({
  dataUrl,
  face,
  fileName,
  model,
  outputFormat,
  scale,
  tile,
}: {
  dataUrl: string;
  face: boolean;
  fileName: string;
  model: string;
  outputFormat: "jpeg" | "png";
  scale: number;
  tile: number;
}): Promise<UpscaleResponse> => {
  const response = await fetch("/api/fal/upscale-image", {
    body: JSON.stringify({
      face,
      fileName,
      imageDataUrl: dataUrl,
      model,
      outputFormat,
      scale,
      tile,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      payload?.error ?? `Upscale request failed (${response.status}).`
    );
  }

  return (await response.json()) as UpscaleResponse;
};

const downloadResult = (item: QueueItem) => {
  if (!item.result?.image.url) {
    return;
  }
  const anchor = document.createElement("a");
  anchor.href = item.result.image.url;
  anchor.download =
    item.result.image.file_name ??
    `${item.file.name.replace(STRIP_EXTENSION_REGEX, "")}.png`;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
};

const renderCanvasContent = ({
  activeDimensions,
  hasComparison,
  resultDimensions,
  resultUrl,
  scale,
  sourceUrl,
  onSplitChange,
  split,
}: {
  activeDimensions: { height: number; width: number } | null;
  hasComparison: boolean;
  resultDimensions: { height: number; width: number } | null;
  onSplitChange: (value: number) => void;
  resultUrl?: string;
  scale: (typeof SCALE_OPTIONS)[number];
  sourceUrl?: string;
  split: number;
}) => {
  if (!sourceUrl) {
    return (
      <div className="fal-upscaler-placeholder fal-upscaler-placeholder-empty">
        <MediaImage aria-hidden="true" />
        <strong>No source image selected</strong>
        <span>Choose a file from the queue or drop one into the panel.</span>
      </div>
    );
  }

  if (hasComparison) {
    const sourceWidth = activeDimensions?.width ?? 1;
    const sourceHeight = activeDimensions?.height ?? 1;
    const outputWidth =
      resultDimensions?.width ?? Math.max(1, sourceWidth * scale);
    const outputHeight =
      resultDimensions?.height ?? Math.max(1, sourceHeight * scale);

    return (
      <>
        <div className="fal-upscaler-comparison">
          <img
            alt=""
            draggable={false}
            height={outputHeight}
            src={resultUrl ?? ""}
            width={outputWidth}
          />
          <div
            className="fal-upscaler-comparison-before"
            style={{ width: `${split}%` }}
          >
            <img
              alt=""
              draggable={false}
              height={sourceHeight}
              src={sourceUrl}
              width={sourceWidth}
            />
          </div>
          <div className="fal-upscaler-divider" style={{ left: `${split}%` }}>
            <span />
          </div>
        </div>
        <label className="fal-upscaler-slider">
          <span>Before / after</span>
          <input
            max={100}
            min={0}
            onChange={(event) => {
              onSplitChange(Number(event.target.value));
            }}
            type="range"
            value={split}
          />
        </label>
      </>
    );
  }

  return (
    <div className="fal-upscaler-placeholder">
      <img
        alt=""
        draggable={false}
        height={activeDimensions?.height ?? 1}
        src={sourceUrl}
        width={activeDimensions?.width ?? 1}
      />
      <div>
        <strong>Source ready</strong>
        <span>Pick a model and press upscale to create the result.</span>
      </div>
    </div>
  );
};

const FalUpscalerQueuePanel = ({
  activeId,
  fileInputRef,
  onDrop,
  onFileChange,
  onSelectItem,
  queue,
}: {
  activeId: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDrop: (event: DragEvent<HTMLElement>) => Promise<void>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onSelectItem: (id: string) => void;
  queue: QueueItem[];
}) => (
  <aside className="fal-upscaler-panel fal-upscaler-queue">
    <div className="fal-upscaler-panel-header">
      <div>
        <h2>Queue</h2>
        <p>Drag images here or choose files from disk.</p>
      </div>
      <button
        className="fal-upscaler-icon-button"
        onClick={() => {
          fileInputRef.current?.click();
        }}
        type="button"
      >
        <CloudUpload aria-hidden="true" />
      </button>
      <input
        accept="image/*"
        multiple
        onChange={onFileChange}
        ref={fileInputRef}
        style={{ display: "none" }}
        type="file"
      />
    </div>

    <button
      className="fal-upscaler-dropzone"
      onClick={() => {
        fileInputRef.current?.click();
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={onDrop}
      type="button"
    >
      <MediaImage aria-hidden="true" />
      <strong>Drop image files here</strong>
      <span>PNG, JPG, WebP, AVIF, and GIF work well.</span>
    </button>

    <div className="fal-upscaler-list">
      {queue.length === 0 ? (
        <div className="fal-upscaler-empty-state">
          No images in the queue yet.
        </div>
      ) : (
        queue.map((item) => (
          <button
            className={`fal-upscaler-queue-item${item.id === activeId ? "is-active" : ""}`}
            key={item.id}
            onClick={() => {
              onSelectItem(item.id);
            }}
            type="button"
          >
            <img alt="" height={48} src={item.previewUrl} width={48} />
            <span>
              <strong>{item.file.name}</strong>
              <small>
                {formatBytes(item.file.size)} · {item.status}
              </small>
              {item.error ? <small>{item.error}</small> : null}
            </span>
          </button>
        ))
      )}
    </div>
  </aside>
);

const FalUpscalerPreviewPanel = ({
  activeDimensions,
  canDownload,
  hasComparison,
  isProcessing,
  onDownload,
  onProcessAll,
  onProcessSelected,
  onSplitChange,
  outputDimensions,
  queueLength,
  resultDimensions,
  resultUrl,
  scale,
  sourceUrl,
  split,
  title,
}: {
  activeDimensions: { height: number; width: number } | null;
  canDownload: boolean;
  hasComparison: boolean;
  isProcessing: boolean;
  onDownload: () => void;
  onProcessAll: () => void;
  onProcessSelected: () => void;
  onSplitChange: (value: number) => void;
  outputDimensions: { height: number; width: number } | null;
  queueLength: number;
  resultDimensions: { height: number; width: number } | null;
  resultUrl?: string;
  scale: (typeof SCALE_OPTIONS)[number];
  sourceUrl?: string;
  split: number;
  title: string;
}) => (
  <section className="fal-upscaler-panel fal-upscaler-viewer">
    <div className="fal-upscaler-panel-header">
      <div>
        <h2>Preview</h2>
        <p>Compare the source image and the fal result.</p>
      </div>
      <div className="fal-upscaler-viewer-actions">
        <button
          aria-label="Upscale selected"
          className="fal-upscaler-ghost-button"
          disabled={queueLength === 0}
          onClick={onProcessSelected}
          type="button"
        >
          <Play aria-hidden="true" />
          <span className="fal-upscaler-button-label">
            {isProcessing ? "Working" : "Upscale selected"}
          </span>
        </button>
        <button
          aria-label="Upscale all"
          className="fal-upscaler-ghost-button"
          disabled={queueLength === 0}
          onClick={onProcessAll}
          type="button"
        >
          <Refresh aria-hidden="true" />
          <span className="fal-upscaler-button-label">Upscale all</span>
        </button>
      </div>
    </div>

    <div className="fal-upscaler-canvas">
      {renderCanvasContent({
        activeDimensions,
        hasComparison,
        onSplitChange,
        resultDimensions,
        resultUrl,
        scale,
        sourceUrl,
        split,
      })}
    </div>

    <footer className="fal-upscaler-footer">
      <div>
        <strong>{title}</strong>
        <span>
          {activeDimensions
            ? `${activeDimensions.width} × ${activeDimensions.height}px`
            : "No dimensions yet"}
          {outputDimensions
            ? ` → ${outputDimensions.width} × ${outputDimensions.height}px`
            : ""}
        </span>
      </div>
      <div className="fal-upscaler-footer-actions">
        <button
          aria-label="Download result"
          className="fal-upscaler-ghost-button"
          disabled={!canDownload}
          onClick={onDownload}
          type="button"
        >
          <Download aria-hidden="true" />
          <span className="fal-upscaler-button-label">Download result</span>
        </button>
      </div>
    </footer>
  </section>
);

const FalUpscalerControlsPanel = ({
  face,
  isMobile,
  model,
  onFaceChange,
  onOutputFormatChange,
  onModelChange,
  onScaleChange,
  onTileChange,
  outputFormat,
  scale,
  tile,
}: {
  face: boolean;
  isMobile: boolean;
  model: (typeof MODEL_OPTIONS)[number]["id"];
  onFaceChange: (value: boolean) => void;
  onOutputFormatChange: (value: (typeof OUTPUT_FORMATS)[number]["id"]) => void;
  onModelChange: (value: (typeof MODEL_OPTIONS)[number]["id"]) => void;
  onScaleChange: (value: (typeof SCALE_OPTIONS)[number]) => void;
  onTileChange: (value: number) => void;
  outputFormat: (typeof OUTPUT_FORMATS)[number]["id"];
  scale: (typeof SCALE_OPTIONS)[number];
  tile: number;
}) => (
  <details
    className="fal-upscaler-panel fal-upscaler-controls"
    open={!isMobile}
  >
    <summary className="fal-upscaler-panel-header fal-upscaler-controls-summary">
      <div>
        <h2>Controls</h2>
        <p>These settings are sent directly to fal.</p>
      </div>
      <NavArrowDown aria-hidden="true" className="fal-upscaler-collapse-icon" />
    </summary>

    <div className="fal-upscaler-panel-body">
      <section className="fal-upscaler-control-group">
        <h3>Scale</h3>
        <div className="fal-upscaler-pill-row">
          {SCALE_OPTIONS.map((value) => (
            <button
              className={`fal-upscaler-pill${value === scale ? "is-active" : ""}`}
              key={value}
              onClick={() => {
                onScaleChange(value);
              }}
              type="button"
            >
              {value}x
            </button>
          ))}
        </div>
      </section>

      <section className="fal-upscaler-control-group">
        <h3>Model</h3>
        <label className="fal-upscaler-select">
          <span>Fal model</span>
          <select
            onChange={(event) => {
              onModelChange(
                event.target.value as (typeof MODEL_OPTIONS)[number]["id"]
              );
            }}
            value={model}
          >
            {MODEL_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="fal-upscaler-hint">
          {MODEL_OPTIONS.find((option) => option.id === model)?.description}
        </p>
      </section>

      <section className="fal-upscaler-control-group">
        <h3>Output</h3>
        <div className="fal-upscaler-pill-row">
          {OUTPUT_FORMATS.map((option) => (
            <button
              className={`fal-upscaler-pill${option.id === outputFormat ? "is-active" : ""}`}
              key={option.id}
              onClick={() => {
                onOutputFormatChange(option.id);
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="fal-upscaler-toggle">
          <input
            checked={face}
            onChange={(event) => {
              onFaceChange(event.target.checked);
            }}
            type="checkbox"
          />
          <span>Face enhancement</span>
        </label>
        {TOPAZ_MODELS.has(model) ? null : (
          <label className="fal-upscaler-number">
            <span>Tile size</span>
            <input
              max={800}
              min={0}
              onChange={(event) => {
                onTileChange(Number(event.target.value));
              }}
              step={50}
              type="number"
              value={tile}
            />
          </label>
        )}
      </section>

      <section className="fal-upscaler-control-group fal-upscaler-summary">
        <h3>Job summary</h3>
        <ul>
          <li>Model: {model}</li>
          <li>Scale: {scale}x</li>
          <li>Output: {outputFormat.toUpperCase()}</li>
          <li>Face enhance: {face ? "On" : "Off"}</li>
          <li>Provider: {TOPAZ_MODELS.has(model) ? "Topaz" : "ESRGAN"}</li>
          {TOPAZ_MODELS.has(model) ? null : <li>Tile: {tile}</li>}
        </ul>
      </section>
    </div>
  </details>
);

const useImageDimensions = (url?: string) => {
  const [dimensions, setDimensions] = useState<{
    height: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    if (!url) {
      setDimensions(null);
      return;
    }
    let cancelled = false;
    const image = new window.Image();
    const handleLoad = () => {
      if (!cancelled) {
        setDimensions({
          height: image.naturalHeight,
          width: image.naturalWidth,
        });
      }
    };
    const handleError = () => {
      if (!cancelled) {
        setDimensions(null);
      }
    };
    image.addEventListener("load", handleLoad, { once: true });
    image.addEventListener("error", handleError, { once: true });
    image.src = url;
    return () => {
      cancelled = true;
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    };
  }, [url]);

  return dimensions;
};

const buildQueueItems = async (files: File[]) => {
  const items = await Promise.all(
    files.map(async (file) => ({
      dataUrl: await readFileAsDataUrl(file),
      file,
      id: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      status: "idle" as const,
    }))
  );
  return items;
};

export const FalUpscalerPage = () => {
  usePageMetadata({
    description:
      "Fal-backed desktop upscaler with a browser UI and Electron packaging.",
    title: "Fal Upscaler | Tandra Peters",
  });

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scale, setScale] = useState<(typeof SCALE_OPTIONS)[number]>(4);
  const [model, setModel] =
    useState<(typeof MODEL_OPTIONS)[number]["id"]>("RealESRGAN_x4plus");
  const [face, setFace] = useState(true);
  const [tile, setTile] = useState(0);
  const [outputFormat, setOutputFormat] =
    useState<(typeof OUTPUT_FORMATS)[number]["id"]>("png");
  const [split, setSplit] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const isMobile = useIsMobile(720);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(
    () => () => {
      for (const item of queueRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    },
    []
  );

  const activeItem = useMemo(
    () => queue.find((item) => item.id === activeId) ?? queue[0] ?? null,
    [activeId, queue]
  );

  const activeDimensions = useImageDimensions(activeItem?.previewUrl);
  const resultDimensions = useImageDimensions(activeItem?.result?.image.url);
  const outputDimensions = activeDimensions
    ? {
        height: activeDimensions.height * scale,
        width: activeDimensions.width * scale,
      }
    : resultDimensions;

  const addFiles = async (files: File[]) => {
    const nextItems = await buildQueueItems(files);
    setQueue((current) => [...current, ...nextItems]);
    setActiveId((current) => current ?? nextItems[0]?.id ?? null);
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])].filter((file) =>
      file.type.startsWith("image/")
    );
    if (files.length === 0) {
      return;
    }
    await addFiles(files);
    event.target.value = "";
  };

  const onDrop = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const files = [...event.dataTransfer.files].filter((file) =>
      file.type.startsWith("image/")
    );
    if (files.length === 0) {
      return;
    }
    await addFiles(files);
  };

  const updateItem = (id: string, updater: (item: QueueItem) => QueueItem) => {
    setQueue((current) =>
      current.map((item) => (item.id === id ? updater(item) : item))
    );
  };

  const runUpscale = async (item: QueueItem) => {
    setError(null);
    updateItem(item.id, (current) => ({
      ...current,
      error: undefined,
      status: "processing",
    }));
    try {
      const result = await postUpscaleJob({
        dataUrl: item.dataUrl,
        face,
        fileName: item.file.name,
        model,
        outputFormat,
        scale,
        tile,
      });
      updateItem(item.id, (current) => ({
        ...current,
        result,
        status: "done",
      }));
      return result;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Upscale failed.";
      updateItem(item.id, (current) => ({
        ...current,
        error: message,
        status: "error",
      }));
      setError(message);
      return null;
    }
  };

  const processSelected = async () => {
    if (!activeItem || isProcessing) {
      return;
    }
    setIsProcessing(true);
    try {
      await runUpscale(activeItem);
    } finally {
      setIsProcessing(false);
    }
  };

  const processAll = async () => {
    if (queue.length === 0 || isProcessing) {
      return;
    }
    setIsProcessing(true);
    try {
      await Promise.all(queue.map((item) => runUpscale(item)));
    } finally {
      setIsProcessing(false);
    }
  };

  const sourceUrl = activeItem?.previewUrl;
  const resultUrl = activeItem?.result?.image.url;
  const hasComparison = Boolean(sourceUrl && resultUrl);
  const canDownload = Boolean(activeItem?.result?.image.url);

  return (
    <SitePageChrome>
      <div className="fal-upscaler-shell">
        <header className="fal-upscaler-header">
          <div>
            <p className="fal-upscaler-eyebrow">Fal-backed desktop tool</p>
            <h1>Image Upscaler</h1>
          </div>

          <div className="fal-upscaler-header-meta">
            <span>
              {queue.length} image{queue.length === 1 ? "" : "s"} queued
            </span>
            <span>{isProcessing ? "Processing" : "Ready"}</span>
          </div>
        </header>

        {error ? <p className="fal-upscaler-error">{error}</p> : null}

        <div className="fal-upscaler-grid">
          <FalUpscalerQueuePanel
            activeId={activeId}
            fileInputRef={fileInputRef}
            onDrop={onDrop}
            onFileChange={onFileChange}
            onSelectItem={setActiveId}
            queue={queue}
          />

          <FalUpscalerPreviewPanel
            activeDimensions={activeDimensions}
            canDownload={canDownload}
            hasComparison={hasComparison}
            isProcessing={isProcessing}
            onDownload={() => {
              if (activeItem) {
                downloadResult(activeItem);
              }
            }}
            onProcessAll={processAll}
            onProcessSelected={processSelected}
            onSplitChange={setSplit}
            outputDimensions={outputDimensions}
            queueLength={queue.length}
            resultDimensions={resultDimensions}
            resultUrl={resultUrl}
            scale={scale}
            sourceUrl={sourceUrl}
            split={split}
            title={activeItem?.file.name ?? "Waiting for an image"}
          />

          <FalUpscalerControlsPanel
            face={face}
            isMobile={isMobile}
            model={model}
            onFaceChange={setFace}
            onModelChange={setModel}
            onOutputFormatChange={setOutputFormat}
            onScaleChange={setScale}
            onTileChange={setTile}
            outputFormat={outputFormat}
            scale={scale}
            tile={tile}
          />
        </div>
      </div>
    </SitePageChrome>
  );
};
