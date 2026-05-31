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
import { useCallback, useEffect, useMemo, useState } from "react";
import { useColorSchemeValue } from "sanity";

import { falStudioApiEndpoint } from "../falStudioConfig";
import { useStudioClient } from "../hooks/useStudioClient";
import "./falImageStudioTool.css";

type GenerateMode = "text" | "image" | "series";
type FalModelId =
  | "fal-ai/flux/schnell"
  | "fal-ai/flux/dev"
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
        endpoint: string;
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
}[] = [
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

const SIZE_OPTIONS: { id: FalImageSize; label: string }[] = [
  { id: "square_hd", label: "Square HD" },
  { id: "square", label: "Square" },
  { id: "landscape_4_3", label: "Landscape 4:3" },
  { id: "landscape_16_9", label: "Landscape 16:9" },
  { id: "portrait_4_3", label: "Portrait 4:3" },
  { id: "portrait_16_9", label: "Portrait 16:9" },
];

const DEFAULT_PROMPT = `Create a realistic, brand-safe roofing marketing image for an Austin homeowner.
Subject: storm clouds over a Central Texas neighborhood with visible roof detail.
Mood: clear, trustworthy, practical.
Style: polished editorial advertising photo, natural light, no text, no logos, no watermarks.`;

const DEFAULT_SERIES = `Storm damage concern
Free inspection offer
Insurance claim support
Roof repair before replacement`;

const getSelectValue = (event: unknown): string =>
  (event as { target: { value: string } }).target.value;

const getInputValue = (event: unknown): string =>
  (event as { target: { value: string } }).target.value;

const getNumberInputValue = (event: unknown): number => {
  const value = (event as { target: WaNumberInputElement }).target.value;
  return Number(value);
};

const getSliderValue = (event: unknown): number => {
  const value = (event as { target: WaSliderElement }).target.value;
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

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
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
  const [strength, setStrength] = useState(0.72);
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
  const usesReferenceImage = Boolean(selectedAsset && (mode === "image" || mode === "series"));

  const clearNotice = () => {
    window.setTimeout(() => setNotice(null), 2800);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === "image" && !selectedAsset) {
        throw new Error("Select a Sanity image to use as the reference.");
      }

      const response = await fetch(falStudioApiEndpoint, {
        body: JSON.stringify({
          enhancePrompt,
          imageSize,
          mode,
          model,
          numImages,
          outputFormat,
          prompt,
          referenceImageUrl: usesReferenceImage ? selectedAsset?.url : undefined,
          seed: seed.trim(),
          seriesVariations,
          strength,
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
        <WaButton
          appearance="filled"
          disabled={generating || !prompt.trim()}
          onClick={() => void handleGenerate()}
          size="xs"
          variant="brand"
        >
          {generating ? "Generating..." : "Generate images"}
        </WaButton>
      </header>

      {error ? <div className="fis__alert">{error}</div> : null}
      {notice ? <div className="fis__notice">{notice}</div> : null}

      <section className="fis__workspace">
        <aside className="fis__controls">
          <div className="fis__control-group">
            <label>Mode</label>
            <WaSelect
              size="xs"
              value={mode}
              withClear={false}
              onInput={(event) => setMode(getSelectValue(event) as GenerateMode)}
            >
              <WaOption value="text">Text to image</WaOption>
              <WaOption value="image">Image to image</WaOption>
              <WaOption value="series">Prompt series</WaOption>
            </WaSelect>
          </div>

          <div className="fis__control-group">
            <label>Prompt</label>
            <WaTextarea
              className="fis__prompt"
              onInput={(event) => setPrompt(getInputValue(event))}
              rows={10}
              size="xs"
              value={prompt}
            />
          </div>

          {mode === "series" ? (
            <div className="fis__control-group">
              <label>Series directions</label>
              <WaTextarea
                onInput={(event) => setSeriesVariations(getInputValue(event))}
                rows={6}
                size="xs"
                value={seriesVariations}
              />
              <span>
                One line per variation. If a reference image is selected, every variation uses it.
              </span>
            </div>
          ) : null}

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
              <span>
                {usesReferenceImage
                  ? selectedModel.imageReference
                    ? `${selectedModel.family} supports the selected reference image.`
                    : `${selectedModel.family} text models use Flux Dev for the reference image step.`
                  : selectedModel.description}
              </span>
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

          {usesReferenceImage ? (
            <div className="fis__control-group">
              <label>Reference strength</label>
              <WaSlider
                max={1}
                min={0.05}
                onInput={(event) => setStrength(getSliderValue(event))}
                size="xs"
                step={0.01}
                value={strength}
              />
              <span>{strength.toFixed(2)}</span>
            </div>
          ) : null}

          <WaCheckbox
            checked={enhancePrompt}
            disabled={usesReferenceImage}
            onInput={(event) => setEnhancePrompt(getCheckboxValue(event))}
            size="xs"
          >
            Enhance prompt
          </WaCheckbox>
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
