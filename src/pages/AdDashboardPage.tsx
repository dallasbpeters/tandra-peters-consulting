import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { toBlob } from "html-to-image";
import { usePostHog } from "@posthog/react";
import {
  ColorWheel,
  Download,
  Instagram,
  MediaImage,
  Palette,
  Page,
  Upload,
} from "iconoir-react";
import { AdImagePicker } from "../components/AdImagePicker";
import { SitePageChrome } from "../components/SitePageChrome";
import "@awesome.me/webawesome/dist/styles/webawesome.css";
import WaColorPicker from "@awesome.me/webawesome/dist/react/color-picker/index.js";
import type WaColorPickerElement from "@awesome.me/webawesome/dist/components/color-picker/color-picker.js";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaNumberInput from "@awesome.me/webawesome/dist/react/number-input/index.js";
import type WaNumberInputElement from "@awesome.me/webawesome/dist/components/number-input/number-input.js";
import WaSelect from "@awesome.me/webawesome/dist/react/select/index.js";
import WaSlider from "@awesome.me/webawesome/dist/react/slider/index.js";
import type WaSliderElement from "@awesome.me/webawesome/dist/components/slider/slider.js";
import WaTextarea from "@awesome.me/webawesome/dist/react/textarea/index.js";
import WaOption from "@awesome.me/webawesome/dist/react/option/index.js";
import { useGoogleDashboardAuth } from "../hooks/useGoogleDashboardAuth";
import {
  useSanityImageAssets,
  type SanityImageAsset,
} from "../hooks/useSanityImageAssets";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { layoutClass } from "../styles/layoutClasses";
import "../styles/ad-dashboard.css";

type PlatformPreset = {
  id: string;
  label: string;
  helper: string;
  width: number;
  height: number;
};

type CreativeLayout =
  | "photo-right"
  | "photo-fill"
  | "headline-card"
  | "image-top"
  | "poster-cover";
type FontPresetId = "brand-serif" | "clean-sans" | "condensed";

type CreativeState = {
  platformId: string;
  layout: CreativeLayout;
  contentPadding: number;
  fontPresetId: FontPresetId;
  headlineSize: number;
  eyebrowSize: number;
  ctaSize: number;
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
  footnote: string;
  footnote2?: string;
  backgroundColor: string;
  textColor: string;
  headlineColor: string;
  accentColor: string;
  imageFile: File | null;
  imageUrl: string | null;
  imageName: string | null;
};

type PlatformShape = "square" | "wide" | "tall";

type FontPreset = {
  id: FontPresetId;
  label: string;
  headlineFamily: string;
  bodyFamily: string;
  headlineWeight: number;
};

const getSelectValue = (event: unknown): string =>
  (event as { target: { value: string } }).target.value;

const getInputValue = (event: unknown): string =>
  (event as { target: { value: string } }).target.value;

const PADDING_MIN = 24;
const PADDING_MAX = 120;
const PADDING_STEP = 5;
const DEFAULT_TYPE_SIZE = 100;
const TYPE_SIZE_MIN = 50;
const TYPE_SIZE_MAX = 160;
const TYPE_SIZE_STEP = 5;

const PLATFORM_PRESETS: readonly PlatformPreset[] = [
  {
    id: "instagram-square",
    label: "Instagram Square",
    helper: "Feed, 1:1",
    width: 1080,
    height: 1080,
  },
  {
    id: "instagram-story",
    label: "Instagram Story",
    helper: "Story/Reel, 9:16",
    width: 1080,
    height: 1920,
  },
  {
    id: "facebook-feed",
    label: "Facebook Feed",
    helper: "Shared image, 1.91:1",
    width: 1200,
    height: 628,
  },
  {
    id: "linkedin-feed",
    label: "LinkedIn Feed",
    helper: "Single image",
    width: 1200,
    height: 627,
  },
  {
    id: "google-display",
    label: "Google Display",
    helper: "Square responsive",
    width: 1200,
    height: 1200,
  },
] as const;

const BRAND_SWATCHES = [
  { label: "Everglade", value: "#092A1D" },
  { label: "Paper", value: "#F6F2EA" },
  { label: "Mint", value: "#D5F6E9" },
  { label: "Purple", value: "#9C99FF" },
  { label: "Laurel", value: "#A5CA9B" },
  { label: "Coral", value: "#FB6237" },
  { label: "Storm", value: "#46656B" },
  { label: "Granite", value: "#667A71" },
  { label: "Blue", value: "#335CFF" },
] as const;

const COLOR_PICKER_SWATCHES = BRAND_SWATCHES.map((swatch) => swatch.value).join(
  ";",
);

const FONT_PRESETS: readonly FontPreset[] = [
  {
    id: "brand-serif",
    label: "Instrument Serif",
    headlineFamily: '"Instrument Serif", serif',
    bodyFamily: "Manrope, sans-serif",
    headlineWeight: 400,
  },
  {
    id: "clean-sans",
    label: "Manrope",
    headlineFamily: "Manrope, sans-serif",
    bodyFamily: "Manrope, sans-serif",
    headlineWeight: 750,
  },
  {
    id: "condensed",
    label: "Bebas Neue",
    headlineFamily: '"Bebas Neue", sans-serif',
    bodyFamily: "Manrope, sans-serif",
    headlineWeight: 400,
  },
] as const;

const getSelectedFontPreset = (fontPresetId: FontPresetId) =>
  FONT_PRESETS.find((fontPreset) => fontPreset.id === fontPresetId) ??
  FONT_PRESETS[0];

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const clampPadding = (value: number) =>
  Math.round(clampNumber(value, PADDING_MIN, PADDING_MAX) / PADDING_STEP) *
  PADDING_STEP;

const clampTypeSize = (value: number) =>
  Math.round(
    clampNumber(value, TYPE_SIZE_MIN, TYPE_SIZE_MAX) / TYPE_SIZE_STEP,
  ) * TYPE_SIZE_STEP;

const getSafeTypeSize = (value: number) =>
  Number.isFinite(value) ? clampTypeSize(value) : DEFAULT_TYPE_SIZE;

const getSafeColor = (value: string | undefined, fallback: string) =>
  value || fallback;

const getPaddingScale = (creative: Pick<CreativeState, "contentPadding">) =>
  creative.contentPadding / 100;

const formatCssNumber = (value: number) =>
  Number.parseFloat(value.toFixed(3)).toString();

const getPreviewPadding = (
  creative: Pick<CreativeState, "contentPadding" | "layout">,
  shape: PlatformShape,
) => {
  const scale = getPaddingScale(creative);

  if (
    creative.layout === "headline-card" ||
    creative.layout === "image-top" ||
    creative.layout === "poster-cover"
  ) {
    if (shape === "wide") {
      return `clamp(2.5rem, ${formatCssNumber(5.8 * scale)}cqw, 5rem)`;
    }

    if (shape === "tall") {
      return `clamp(2.25rem, ${formatCssNumber(7.2 * scale)}cqw, 5rem)`;
    }

    return `clamp(2.25rem, ${formatCssNumber(6.2 * scale)}cqw, 5rem)`;
  }

  if (creative.layout === "photo-right") {
    if (shape === "wide") {
      return `clamp(${formatCssNumber(1 * scale)}rem, ${formatCssNumber(
        5 * scale,
      )}cqw, ${formatCssNumber(3 * scale)}rem)`;
    }

    if (shape === "tall") {
      return `clamp(${formatCssNumber(1.2 * scale)}rem, ${formatCssNumber(
        7 * scale,
      )}cqw, ${formatCssNumber(4 * scale)}rem)`;
    }

    return `clamp(${formatCssNumber(1.2 * scale)}rem, ${formatCssNumber(
      6 * scale,
    )}cqw, ${formatCssNumber(4.5 * scale)}rem)`;
  }

  return `${formatCssNumber(7 * scale)}%`;
};

const getFrameInset = (creative: Pick<CreativeState, "contentPadding">) =>
  `${formatCssNumber(5 * getPaddingScale(creative))}%`;

type AdColorPickerFieldProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
};

const AdColorPickerField = ({
  label,
  value,
  onValueChange,
}: AdColorPickerFieldProps) => {
  const pickerRef = useRef<WaColorPickerElement | null>(null);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return undefined;

    const handleValueChange = () => {
      onValueChange(picker.value ?? "");
    };

    picker.addEventListener("input", handleValueChange);
    picker.addEventListener("change", handleValueChange);

    return () => {
      picker.removeEventListener("input", handleValueChange);
      picker.removeEventListener("change", handleValueChange);
    };
  }, [onValueChange]);

  return (
    <div className="ad-dashboard-color-field">
      <WaColorPicker
        ref={pickerRef}
        label={label}
        value={value}
        format="hex"
        uppercase
        size="m"
        placement="left-start"
        swatches={COLOR_PICKER_SWATCHES}
      />
    </div>
  );
};

type AdPaddingFieldProps = {
  value: number;
  onValueChange: (value: number) => void;
};

const AdPaddingField = ({ value, onValueChange }: AdPaddingFieldProps) => {
  const sliderRef = useRef<WaSliderElement | null>(null);
  const numberInputRef = useRef<WaNumberInputElement | null>(null);

  useEffect(() => {
    const slider = sliderRef.current;
    const numberInput = numberInputRef.current;

    const updateFromSlider = () => {
      if (!slider) return;
      onValueChange(clampPadding(slider.value));
    };

    const updateFromNumberInput = () => {
      if (!numberInput) return;
      const nextValue = Number(numberInput.value ?? value);
      if (Number.isFinite(nextValue)) {
        onValueChange(clampPadding(nextValue));
      }
    };

    slider?.addEventListener("input", updateFromSlider);
    slider?.addEventListener("change", updateFromSlider);
    numberInput?.addEventListener("input", updateFromNumberInput);
    numberInput?.addEventListener("change", updateFromNumberInput);

    return () => {
      slider?.removeEventListener("input", updateFromSlider);
      slider?.removeEventListener("change", updateFromSlider);
      numberInput?.removeEventListener("input", updateFromNumberInput);
      numberInput?.removeEventListener("change", updateFromNumberInput);
    };
  }, [onValueChange, value]);

  return (
    <div className="ad-dashboard-padding-field">
      <WaSlider
        ref={sliderRef}
        label="Padding"
        value={value}
        min={PADDING_MIN}
        max={PADDING_MAX}
        step={PADDING_STEP}
        size="s"
        withTooltip
      />
      <WaNumberInput
        ref={numberInputRef}
        label="Padding %"
        value={String(value)}
        min={PADDING_MIN}
        max={PADDING_MAX}
        step={PADDING_STEP}
        inputmode="numeric"
        appearance="outlined"
        size="s"
      />
    </div>
  );
};

type AdTypeSizeFieldProps = {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
};

const AdTypeSizeField = ({
  label,
  value,
  onValueChange,
}: AdTypeSizeFieldProps) => {
  const sliderRef = useRef<WaSliderElement | null>(null);
  const numberInputRef = useRef<WaNumberInputElement | null>(null);
  const safeValue = getSafeTypeSize(value);

  useEffect(() => {
    const slider = sliderRef.current;
    const numberInput = numberInputRef.current;

    const updateFromSlider = () => {
      if (!slider) return;
      onValueChange(clampTypeSize(slider.value));
    };

    const updateFromNumberInput = () => {
      if (!numberInput) return;
      const nextValue = Number(numberInput.value ?? safeValue);
      if (Number.isFinite(nextValue)) {
        onValueChange(clampTypeSize(nextValue));
      }
    };

    slider?.addEventListener("input", updateFromSlider);
    slider?.addEventListener("change", updateFromSlider);
    numberInput?.addEventListener("input", updateFromNumberInput);
    numberInput?.addEventListener("change", updateFromNumberInput);

    return () => {
      slider?.removeEventListener("input", updateFromSlider);
      slider?.removeEventListener("change", updateFromSlider);
      numberInput?.removeEventListener("input", updateFromNumberInput);
      numberInput?.removeEventListener("change", updateFromNumberInput);
    };
  }, [label, onValueChange, safeValue]);

  return (
    <div className="ad-dashboard-size-field">
      <WaSlider
        ref={sliderRef}
        label={label}
        value={safeValue}
        min={TYPE_SIZE_MIN}
        max={TYPE_SIZE_MAX}
        step={TYPE_SIZE_STEP}
        size="s"
        withTooltip
      />
      <WaNumberInput
        ref={numberInputRef}
        label={`${label} %`}
        value={String(safeValue)}
        min={TYPE_SIZE_MIN}
        max={TYPE_SIZE_MAX}
        step={TYPE_SIZE_STEP}
        inputmode="numeric"
        appearance="outlined"
        size="s"
      />
    </div>
  );
};

const LAYOUTS: ReadonlyArray<{
  id: CreativeLayout;
  label: string;
  helper: string;
}> = [
  {
    id: "photo-right",
    label: "Photo side",
    helper: "Copy block with a strong image panel.",
  },
  {
    id: "photo-fill",
    label: "Full bleed",
    helper: "Photo-led creative with a grounded copy overlay.",
  },
  {
    id: "headline-card",
    label: "Text first",
    helper: "Bold message, small image badge.",
  },
  {
    id: "image-top",
    label: "Image top",
    helper: "Top photo with headline crossing the split.",
  },
  {
    id: "poster-cover",
    label: "Cover headline",
    helper: "Photo poster with a brand band.",
  },
];

const DEFAULT_CREATIVE: CreativeState = {
  platformId: "instagram-square",
  layout: "photo-right",
  contentPadding: 100,
  fontPresetId: "brand-serif",
  headlineSize: 100,
  eyebrowSize: 100,
  ctaSize: 100,
  eyebrow: "Austin roof help",
  headline: "Summer storms are coming, is your roof ready?",
  body: "I will inspect it, explain what I see, and help you understand the next right step.",
  cta: "Call or Text 512-968-3982",
  footnote: "Tandra Peters",
  footnote2: "Birdcreek Roofing",
  backgroundColor: "#092A1D",
  textColor: "#F6F2EA",
  headlineColor: "#F6F2EA",
  accentColor: "#D5F6E9",
  imageFile: null,
  imageUrl: null,
  imageName: null,
};

const getSelectedPlatform = (platformId: string) =>
  PLATFORM_PRESETS.find((platform) => platform.id === platformId) ??
  PLATFORM_PRESETS[0];

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

const revokeObjectUrl = (url: string | null) => {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};

const getPlatformShape = (platform: PlatformPreset): PlatformShape => {
  const ratio = platform.width / platform.height;
  if (ratio < 0.78) return "tall";
  if (ratio > 1.35) return "wide";
  return "square";
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

const exportPreviewNode = async (
  node: HTMLElement,
  platform: PlatformPreset,
  backgroundColor: string,
): Promise<Blob> => {
  if (document.fonts) {
    await document.fonts.ready;
  }

  const previewBounds = node.getBoundingClientRect();
  if (previewBounds.width <= 0 || previewBounds.height <= 0) {
    throw new Error("The ad preview is not ready yet.");
  }

  const pixelRatio = Math.min(
    platform.width / previewBounds.width,
    platform.height / previewBounds.height,
  );
  const previousStyle = {
    boxShadow: node.style.boxShadow,
  };

  node.style.boxShadow = "none";

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  try {
    const blob = await toBlob(node, {
      backgroundColor,
      cacheBust: true,
      canvasWidth: platform.width,
      canvasHeight: platform.height,
      height: previewBounds.height,
      includeQueryParams: true,
      pixelRatio,
      skipAutoScale: true,
      type: "image/png",
      width: previewBounds.width,
    });

    if (!blob) {
      throw new Error("Could not export PNG.");
    }

    return blob;
  } finally {
    node.style.boxShadow = previousStyle.boxShadow;
  }
};

const AuthPanel = ({
  auth,
}: {
  auth: ReturnType<typeof useGoogleDashboardAuth>;
}) => (
  <section className="ad-dashboard-auth">
    <div>
      <p className="ad-dashboard-eyebrow">Google gated</p>
      <h1>Sign in to build ad creative.</h1>
      <p>
        This dashboard is restricted to allowed Google accounts and does not
        expose the creative tools on the public site.
      </p>
    </div>
    {!auth.clientId ? (
      <p className="ad-dashboard-error">
        Add <code>VITE_GOOGLE_CLIENT_ID</code> to enable Google sign-in.
      </p>
    ) : (
      <>
        <div ref={auth.buttonRef} />
        {!auth.ready ? <p>Loading Google sign-in...</p> : null}
        {auth.authError ? (
          <p className="ad-dashboard-error">{auth.authError}</p>
        ) : null}
      </>
    )}
  </section>
);

export const AdDashboardPage = () => {
  const auth = useGoogleDashboardAuth();
  const posthog = usePostHog();
  const imageLibrary = useSanityImageAssets();
  const previewRef = useRef<HTMLElement | null>(null);
  const [creative, setCreative] = useState<CreativeState>(DEFAULT_CREATIVE);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const selectedPlatform = useMemo(
    () => getSelectedPlatform(creative.platformId),
    [creative.platformId],
  );
  const selectedPlatformShape = getPlatformShape(selectedPlatform);

  usePageMetadata({
    title: "Ad Builder | Tandra Peters",
    description:
      "Internal advertising dashboard for creating brand-aligned platform ad images.",
    robots: "noindex, nofollow",
  });

  useEffect(() => {
    posthog?.capture("ad_dashboard_viewed");
  }, [posthog]);

  useEffect(
    () => () => {
      revokeObjectUrl(creative.imageUrl);
    },
    [creative.imageUrl],
  );

  const updateCreative = useCallback(
    <K extends keyof CreativeState>(key: K, value: CreativeState[K]) => {
      setCreative((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const handleImageChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const url = URL.createObjectURL(file);
      setCreative((current) => {
        revokeObjectUrl(current.imageUrl);

        return {
          ...current,
          imageFile: file,
          imageUrl: url,
          imageName: file.name,
        };
      });
      setExportError(null);
    },
    [],
  );

  const handleSanityImageSelect = useCallback((image: SanityImageAsset) => {
    setCreative((current) => {
      revokeObjectUrl(current.imageUrl);

      return {
        ...current,
        imageFile: null,
        imageUrl: image.url,
        imageName: image.label,
      };
    });
    setExportError(null);
  }, []);

  const handleExport = useCallback(async () => {
    const previewNode = previewRef.current;
    if (!previewNode) {
      setExportError("The ad preview is not ready yet.");
      return;
    }

    setExporting(true);
    setExportError(null);
    try {
      const blob = await exportPreviewNode(
        previewNode,
        selectedPlatform,
        creative.backgroundColor,
      );
      downloadBlob(blob, `tandra-ad-${selectedPlatform.id}-${Date.now()}.png`);
      posthog?.capture("ad_creative_exported", {
        platform: selectedPlatform.id,
        layout: creative.layout,
        contentPadding: creative.contentPadding,
        fontPreset: creative.fontPresetId,
        headlineSize: getSafeTypeSize(creative.headlineSize),
        eyebrowSize: getSafeTypeSize(creative.eyebrowSize),
        ctaSize: getSafeTypeSize(creative.ctaSize),
        headlineColor: getSafeColor(creative.headlineColor, creative.textColor),
      });
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Could not export PNG.",
      );
    } finally {
      setExporting(false);
    }
  }, [creative, posthog, selectedPlatform]);

  const previewStyle = {
    "--ad-bg": creative.backgroundColor,
    "--ad-ink": creative.textColor,
    "--ad-headline-ink": getSafeColor(
      creative.headlineColor,
      creative.textColor,
    ),
    "--ad-accent": creative.accentColor,
    "--ad-preview-padding": getPreviewPadding(creative, selectedPlatformShape),
    "--ad-frame-inset": getFrameInset(creative),
    "--ad-headline-font": getSelectedFontPreset(creative.fontPresetId)
      .headlineFamily,
    "--ad-headline-weight": String(
      getSelectedFontPreset(creative.fontPresetId).headlineWeight,
    ),
    "--ad-headline-size-scale": formatCssNumber(
      getSafeTypeSize(creative.headlineSize) / 100,
    ),
    "--ad-eyebrow-size-scale": formatCssNumber(
      getSafeTypeSize(creative.eyebrowSize) / 100,
    ),
    "--ad-cta-size-scale": formatCssNumber(
      getSafeTypeSize(creative.ctaSize) / 100,
    ),
    "--ad-body-font": getSelectedFontPreset(creative.fontPresetId).bodyFamily,
    aspectRatio: `${selectedPlatform.width} / ${selectedPlatform.height}`,
    borderBlockEnd: `10px solid color-mix(in oklch, ${creative.accentColor} 82%, transparent)`,
  } as CSSProperties & Record<string, string>;
  const previewImageUrl = creative.imageUrl
    ? toCanvasImageUrl(creative.imageUrl)
    : null;

  return (
    <SitePageChrome>
      <main className={layoutClass.pageMain}>
        <div className="ad-dashboard-shell">
          {!auth.token ? <AuthPanel auth={auth} /> : null}

          {auth.token ? (
            <>
              <section className="ad-dashboard-grid">
                <aside className="ad-dashboard-panel ad-dashboard-controls">
                  <div className="ad-dashboard-inner">
                    <div className="ad-dashboard-panel-header">
                      <Page width={20} height={20} />
                      <h2>Format</h2>
                    </div>
                    <div className="ad-dashboard-preset-grid">
                      <WaSelect
                        name="platform"
                        label="Platform"
                        value={creative.platformId}
                        appearance="outlined"
                        size="s"
                        onChange={(event) =>
                          updateCreative("platformId", getSelectValue(event))
                        }
                      >
                        {PLATFORM_PRESETS.map((platform) => (
                          <WaOption key={platform.id} value={platform.id}>
                            {platform.label} · {platform.width} x{" "}
                            {platform.height} · {platform.helper}
                          </WaOption>
                        ))}
                      </WaSelect>
                    </div>

                    <div className="ad-dashboard-panel-header">
                      <Instagram width={20} height={20} />
                      <h2>Layout</h2>
                    </div>
                    <div className="ad-dashboard-layout-grid">
                      <WaSelect
                        name="layout"
                        label="Layout"
                        value={creative.layout}
                        appearance="outlined"
                        size="s"
                        onChange={(event) =>
                          updateCreative(
                            "layout",
                            getSelectValue(event) as CreativeLayout,
                          )
                        }
                      >
                        {LAYOUTS.map((layout) => (
                          <WaOption key={layout.id} value={layout.id}>
                            {layout.label} · {layout.helper}
                          </WaOption>
                        ))}
                      </WaSelect>
                    </div>
                    <AdPaddingField
                      value={creative.contentPadding}
                      onValueChange={(value) =>
                        updateCreative("contentPadding", value)
                      }
                    />
                    <WaSelect
                      className="ad-dashboard-field"
                      name="fontPreset"
                      label="Font"
                      value={creative.fontPresetId}
                      appearance="outlined"
                      size="s"
                      onChange={(event) =>
                        updateCreative(
                          "fontPresetId",
                          getSelectValue(event) as FontPresetId,
                        )
                      }
                    >
                      {FONT_PRESETS.map((fontPreset) => (
                        <WaOption key={fontPreset.id} value={fontPreset.id}>
                          {fontPreset.label}
                        </WaOption>
                      ))}
                    </WaSelect>

                    <div className="ad-dashboard-panel-header">
                      <ColorWheel width={20} height={20} />
                      <h2>Type sizes</h2>
                    </div>
                    <AdTypeSizeField
                      label="Headline"
                      value={creative.headlineSize}
                      onValueChange={(value) =>
                        updateCreative("headlineSize", value)
                      }
                    />
                    <AdTypeSizeField
                      label="Eyebrow"
                      value={creative.eyebrowSize}
                      onValueChange={(value) =>
                        updateCreative("eyebrowSize", value)
                      }
                    />
                    <AdTypeSizeField
                      label="CTA"
                      value={creative.ctaSize}
                      onValueChange={(value) =>
                        updateCreative("ctaSize", value)
                      }
                    />

                    <WaInput
                      className="ad-dashboard-field"
                      label="Eyebrow"
                      value={creative.eyebrow}
                      appearance="outlined"
                      size="s"
                      withClear
                      onInput={(event) =>
                        updateCreative("eyebrow", getInputValue(event))
                      }
                    />
                    <WaTextarea
                      className="ad-dashboard-field"
                      label="Headline"
                      value={creative.headline}
                      rows={3}
                      resize="vertical"
                      appearance="outlined"
                      size="s"
                      onInput={(event) =>
                        updateCreative("headline", getInputValue(event))
                      }
                    />
                    <WaTextarea
                      className="ad-dashboard-field"
                      label="Supporting copy"
                      value={creative.body}
                      rows={4}
                      resize="vertical"
                      appearance="outlined"
                      size="s"
                      onInput={(event) =>
                        updateCreative("body", getInputValue(event))
                      }
                    />
                    <WaInput
                      className="ad-dashboard-field"
                      label="CTA"
                      value={creative.cta}
                      appearance="outlined"
                      size="s"
                      withClear
                      onInput={(event) =>
                        updateCreative("cta", getInputValue(event))
                      }
                    />
                    <WaInput
                      className="ad-dashboard-field"
                      label="Byline"
                      value={creative.footnote}
                      appearance="outlined"
                      size="s"
                      withClear
                      onInput={(event) =>
                        updateCreative("footnote", getInputValue(event))
                      }
                    />
                    <WaInput
                      className="ad-dashboard-field"
                      label="Brand"
                      value={creative.footnote2}
                      appearance="outlined"
                      size="s"
                      withClear
                      onInput={(event) =>
                        updateCreative("footnote2", getInputValue(event))
                      }
                    />
                  </div>
                  <div className="ad-dashboard-user">
                    {auth.user?.picture ? (
                      <img src={auth.user.picture} alt="" />
                    ) : null}
                    <div>
                      <strong>{auth.user?.name ?? auth.user?.email}</strong>
                      <span>{auth.user?.email}</span>
                    </div>
                    <button type="button" onClick={() => auth.signOut()}>
                      Sign out
                    </button>
                  </div>
                </aside>

                <section className="ad-dashboard-stage">
                  <div className="ad-dashboard-toolbar">
                    <div>
                      <strong>{selectedPlatform.label}</strong>
                      <span>
                        {selectedPlatform.width} x {selectedPlatform.height}px
                      </span>
                    </div>
                    <button
                      type="button"
                      className="ad-dashboard-export"
                      onClick={() => void handleExport()}
                      disabled={exporting}
                    >
                      <Download width={18} height={18} />
                      {exporting ? "Exporting..." : "Export PNG"}
                    </button>
                  </div>
                  {exportError ? (
                    <p className="ad-dashboard-error ad-dashboard-export-error">
                      {exportError}
                    </p>
                  ) : null}

                  <div className="ad-dashboard-preview-wrap">
                    <article
                      ref={previewRef}
                      className={`ad-creative-preview ad-creative-preview--${creative.layout} is-${selectedPlatformShape} ${
                        previewImageUrl ? "has-image" : "has-no-image"
                      }`}
                      style={previewStyle}
                    >
                      {previewImageUrl ? (
                        <div
                          className="ad-creative-photo"
                          style={{ backgroundImage: `url(${previewImageUrl})` }}
                        />
                      ) : null}
                      <div className="ad-creative-copy">
                        <p>{creative.eyebrow}</p>
                        <h2>{creative.headline}</h2>
                        <span>{creative.body}</span>
                        <strong>{creative.cta}</strong>
                      </div>
                      {creative.footnote2 ? (
                        <footer>
                          <span className="ad-creative-footer-copy">
                            {creative.footnote} |{" "}
                            <span className="ad-creative-footnote-2">
                              {creative.footnote2}
                            </span>
                          </span>
                          <img
                            className="ad-creative-logo"
                            src="/BC_Horizontal_Color.svg"
                            alt="Birdcreek Roofing"
                          />
                        </footer>
                      ) : (
                        <footer>
                          <span className="ad-creative-footer-copy">
                            {creative.footnote}
                          </span>
                          <img
                            className="ad-creative-logo"
                            src="/BC_Horizontal_Color.svg"
                            alt="Birdcreek Roofing"
                          />
                        </footer>
                      )}
                    </article>
                  </div>
                </section>

                <aside className="ad-dashboard-panel ad-dashboard-brand">
                  <div className="ad-dashboard-panel-header">
                    <Upload width={20} height={20} />
                    <h2>Image</h2>
                  </div>
                  <label className="ad-dashboard-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    <MediaImage width={22} height={22} />
                    <span>
                      {creative.imageName ??
                        "Choose roof, project, or portrait photo"}
                    </span>
                  </label>
                  <AdImagePicker
                    images={imageLibrary.images}
                    loading={imageLibrary.loading}
                    error={imageLibrary.error}
                    selectedImageUrl={creative.imageUrl}
                    onRefresh={imageLibrary.refresh}
                    onSelect={handleSanityImageSelect}
                  />

                  <div className="ad-dashboard-panel-header">
                    <Palette width={20} height={20} />
                    <h2>Brand colors</h2>
                  </div>
                  <div className="ad-dashboard-color-grid">
                    {BRAND_SWATCHES.map((swatch) => (
                      <button
                        key={swatch.value}
                        type="button"
                        style={{ backgroundColor: swatch.value }}
                        onClick={() =>
                          setCreative((current) => ({
                            ...current,
                            backgroundColor: swatch.value,
                            textColor:
                              swatch.value === "#F6F2EA"
                                ? "#092A1D"
                                : current.textColor,
                          }))
                        }
                      >
                        <span>{swatch.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="ad-dashboard-panel-header">
                    <ColorWheel width={20} height={20} />
                    <h2>Fine tune</h2>
                  </div>
                  <div className="ad-dashboard-color-grid">
                    <AdColorPickerField
                      label="Bg"
                      value={creative.backgroundColor}
                      onValueChange={(value) =>
                        updateCreative("backgroundColor", value)
                      }
                    />
                    <AdColorPickerField
                      label="Text"
                      value={creative.textColor}
                      onValueChange={(value) =>
                        updateCreative("textColor", value)
                      }
                    />
                    <AdColorPickerField
                      label="Headline"
                      value={getSafeColor(
                        creative.headlineColor,
                        creative.textColor,
                      )}
                      onValueChange={(value) =>
                        updateCreative("headlineColor", value)
                      }
                    />
                    <AdColorPickerField
                      label="Accent"
                      value={creative.accentColor}
                      onValueChange={(value) =>
                        updateCreative("accentColor", value)
                      }
                    />
                  </div>
                </aside>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </SitePageChrome>
  );
};
