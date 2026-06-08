import type WaColorPickerElement from "@awesome.me/webawesome/dist/components/color-picker/color-picker.js";

import "@fontsource/bebas-neue/latin-400.css";
import "@fontsource/ibm-plex-serif/400.css";
import "@fontsource/ibm-plex-serif/400-italic.css";
import type WaNumberInputElement from "@awesome.me/webawesome/dist/components/number-input/number-input.js";
import type WaSliderElement from "@awesome.me/webawesome/dist/components/slider/slider.js";

import WaColorPicker from "@awesome.me/webawesome/dist/react/color-picker/index.js";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaNumberInput from "@awesome.me/webawesome/dist/react/number-input/index.js";
import "@awesome.me/webawesome/dist/styles/webawesome.css";
import WaOption from "@awesome.me/webawesome/dist/react/option/index.js";
import WaSelect from "@awesome.me/webawesome/dist/react/select/index.js";
import WaSlider from "@awesome.me/webawesome/dist/react/slider/index.js";
import WaSwitch from "@awesome.me/webawesome/dist/react/switch/index.js";
import WaTextarea from "@awesome.me/webawesome/dist/react/textarea/index.js";
import { usePostHog } from "@posthog/react";
import { toBlob } from "html-to-image";
import {
  ColorWheel,
  Download,
  Instagram,
  MediaImage,
  Palette,
  Page,
  TextSize,
  Trash,
  Upload,
} from "iconoir-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { AdImagePicker } from "../components/AdImagePicker";
import { SitePageChrome } from "../components/SitePageChrome";
import { useGoogleDashboardAuth } from "../hooks/useGoogleDashboardAuth";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { useSanityImageAssets, type SanityImageAsset } from "../hooks/useSanityImageAssets";
import {
  AD_TEMPLATES,
  LAYOUT_OPTIONS,
  applyAdTemplatePreset,
  type CreativeLayout,
  type FontPresetId,
} from "../lib/adCreativeTemplates";
import { layoutClass } from "../styles/layoutClasses";
import "../styles/ad-dashboard.css";

type AdUnit = "px" | "in";

type PlatformPreset = {
  id: string;
  label: string;
  helper: string;
  width: number;
  height: number;
};

type LogoVariant = "horizontal-white" | "vertical-white";

const LOGO_VARIANTS: ReadonlyArray<{
  id: LogoVariant;
  label: string;
  src: string;
}> = [
  {
    id: "horizontal-white",
    label: "Horizontal (white)",
    src: "/BC_Horizontal_White.svg",
  },
  {
    id: "vertical-white",
    label: "Vertical (white)",
    src: "/BC_Vertical_White.svg",
  },
] as const;

const getLogoSrc = (variant: LogoVariant) =>
  LOGO_VARIANTS.find((logo) => logo.id === variant)?.src ?? LOGO_VARIANTS[0].src;

type CreativeState = {
  templateId: string;
  platformId: string;
  unit: AdUnit;
  adWidth: number;
  adHeight: number;
  layout: CreativeLayout;
  contentPadding: number;
  fontPresetId: FontPresetId;
  headlineSize: number;
  eyebrowSize: number;
  bodySize: number;
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
  headlineAccentColor: string;
  accentColor: string;
  showLogo: boolean;
  logoVariant: LogoVariant;
  showBottomBorder: boolean;
  eyebrowLineHeight: number;
  headlineLineHeight: number;
  bodyLineHeight: number;
  ctaLineHeight: number;
  footnoteLineHeight: number;
  eyebrowOffset: number;
  headlineOffset: number;
  bodyOffset: number;
  ctaOffset: number;
  footnoteOffset: number;
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

const getSwitchChecked = (event: unknown): boolean =>
  Boolean((event as { target: { checked: boolean } }).target.checked);

const PADDING_MIN = 24;
const PADDING_MAX = 120;
const PADDING_STEP = 5;
const DEFAULT_TYPE_SIZE = 100;
const TYPE_SIZE_MIN = 50;
const TYPE_SIZE_MAX = 160;
const TYPE_SIZE_STEP = 5;
const LINE_HEIGHT_DEFAULT = 100;
const LINE_HEIGHT_MIN = 60;
const LINE_HEIGHT_MAX = 180;
const LINE_HEIGHT_STEP = 5;
const TEXT_OFFSET_DEFAULT = 0;
const TEXT_OFFSET_MIN = -50;
const TEXT_OFFSET_MAX = 100;
const TEXT_OFFSET_STEP = 2;
const PRINT_DPI = 300;

const DEFAULT_TEXT_RHYTHM = {
  eyebrowLineHeight: LINE_HEIGHT_DEFAULT,
  headlineLineHeight: LINE_HEIGHT_DEFAULT,
  bodyLineHeight: LINE_HEIGHT_DEFAULT,
  ctaLineHeight: LINE_HEIGHT_DEFAULT,
  footnoteLineHeight: LINE_HEIGHT_DEFAULT,
  eyebrowOffset: TEXT_OFFSET_DEFAULT,
  headlineOffset: TEXT_OFFSET_DEFAULT,
  bodyOffset: TEXT_OFFSET_DEFAULT,
  ctaOffset: TEXT_OFFSET_DEFAULT,
  footnoteOffset: TEXT_OFFSET_DEFAULT,
} as const;

const TEXT_RHYTHM_ROLES = [
  {
    id: "eyebrow",
    label: "Eyebrow",
    lineHeightKey: "eyebrowLineHeight",
    offsetKey: "eyebrowOffset",
  },
  {
    id: "headline",
    label: "Headline",
    lineHeightKey: "headlineLineHeight",
    offsetKey: "headlineOffset",
  },
  {
    id: "body",
    label: "Supporting copy",
    lineHeightKey: "bodyLineHeight",
    offsetKey: "bodyOffset",
  },
  {
    id: "cta",
    label: "CTA",
    lineHeightKey: "ctaLineHeight",
    offsetKey: "ctaOffset",
  },
  {
    id: "footnote",
    label: "Footer",
    lineHeightKey: "footnoteLineHeight",
    offsetKey: "footnoteOffset",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  lineHeightKey: keyof typeof DEFAULT_TEXT_RHYTHM;
  offsetKey: keyof typeof DEFAULT_TEXT_RHYTHM;
}>;
const DIMENSION_MIN_PX = 100;
const DIMENSION_MAX_PX = 4000;
const DIMENSION_MIN_IN = 1;
const DIMENSION_MAX_IN = 48;

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
  { label: "Green", value: "#12533A" },
  { label: "Moss", value: "#217D57" },
] as const;

const COLOR_PICKER_SWATCHES = BRAND_SWATCHES.map((swatch) => swatch.value).join(";");

const FONT_PRESETS: readonly FontPreset[] = [
  {
    id: "brand-serif",
    label: "IBM Plex Serif",
    headlineFamily: '"IBM Plex Serif", serif',
    bodyFamily: "Hanken Grotesk Variable, sans-serif",
    headlineWeight: 400,
  },
  {
    id: "clean-sans",
    label: "Hanken Grotesk Variable",
    headlineFamily: "Hanken Grotesk Variable, sans-serif",
    bodyFamily: "Hanken Grotesk Variable, sans-serif",
    headlineWeight: 750,
  },
  {
    id: "condensed",
    label: "Bebas Neue",
    headlineFamily: '"Bebas Neue", sans-serif',
    bodyFamily: "Hanken Grotesk Variable, sans-serif",
    headlineWeight: 400,
  },
] as const;

const getSelectedFontPreset = (fontPresetId: FontPresetId) =>
  FONT_PRESETS.find((fontPreset) => fontPreset.id === fontPresetId) ?? FONT_PRESETS[0];

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const clampPadding = (value: number) =>
  Math.round(clampNumber(value, PADDING_MIN, PADDING_MAX) / PADDING_STEP) * PADDING_STEP;

const clampTypeSize = (value: number) =>
  Math.round(clampNumber(value, TYPE_SIZE_MIN, TYPE_SIZE_MAX) / TYPE_SIZE_STEP) * TYPE_SIZE_STEP;

const getSafeTypeSize = (value: number) =>
  Number.isFinite(value) ? clampTypeSize(value) : DEFAULT_TYPE_SIZE;

const clampLineHeight = (value: number) =>
  Math.round(clampNumber(value, LINE_HEIGHT_MIN, LINE_HEIGHT_MAX) / LINE_HEIGHT_STEP) *
  LINE_HEIGHT_STEP;

const clampTextOffset = (value: number) =>
  Math.round(clampNumber(value, TEXT_OFFSET_MIN, TEXT_OFFSET_MAX) / TEXT_OFFSET_STEP) *
  TEXT_OFFSET_STEP;

const getSafeLineHeight = (value: number) =>
  Number.isFinite(value) ? clampLineHeight(value) : LINE_HEIGHT_DEFAULT;

const getSafeTextOffset = (value: number) =>
  Number.isFinite(value) ? clampTextOffset(value) : TEXT_OFFSET_DEFAULT;

const getLineHeightScale = (value: number) => formatCssNumber(getSafeLineHeight(value) / 100);

const getTextOffset = (value: number) => `${getSafeTextOffset(value)}cqw`;

const clampDimension = (value: number, unit: AdUnit) => {
  const min = unit === "px" ? DIMENSION_MIN_PX : DIMENSION_MIN_IN;
  const max = unit === "px" ? DIMENSION_MAX_PX : DIMENSION_MAX_IN;
  const step = unit === "px" ? 1 : 0.125;
  const clamped = clampNumber(value, min, max);
  return unit === "px" ? Math.round(clamped) : Math.round(clamped / step) * step;
};

const convertDimensionsForUnit = (
  width: number,
  height: number,
  fromUnit: AdUnit,
  toUnit: AdUnit,
) => {
  if (fromUnit === toUnit) {
    return { width, height };
  }

  if (toUnit === "in") {
    return {
      width: clampDimension(width / PRINT_DPI, "in"),
      height: clampDimension(height / PRINT_DPI, "in"),
    };
  }

  return {
    width: clampDimension(width * PRINT_DPI, "px"),
    height: clampDimension(height * PRINT_DPI, "px"),
  };
};

const getExportPixelSize = (width: number, height: number, unit: AdUnit) =>
  unit === "px"
    ? { width: Math.round(width), height: Math.round(height) }
    : {
        width: Math.round(width * PRINT_DPI),
        height: Math.round(height * PRINT_DPI),
      };

const formatAdDimensions = (width: number, height: number, unit: AdUnit) => {
  const suffix = unit === "px" ? "px" : "in";
  const formattedWidth = unit === "px" ? String(Math.round(width)) : width.toFixed(2);
  const formattedHeight = unit === "px" ? String(Math.round(height)) : height.toFixed(2);
  return `${formattedWidth} x ${formattedHeight}${suffix}`;
};

const getSafeColor = (value: string | undefined, fallback: string) => value || fallback;

const getPaddingScale = (creative: Pick<CreativeState, "contentPadding">) =>
  creative.contentPadding / 100;

const formatCssNumber = (value: number) => Number.parseFloat(value.toFixed(3)).toString();

const getPreviewPadding = (
  creative: Pick<CreativeState, "contentPadding" | "layout">,
  shape: PlatformShape,
) => {
  const scale = getPaddingScale(creative);

  if (
    creative.layout === "headline-card" ||
    creative.layout === "image-top" ||
    creative.layout === "poster-cover" ||
    creative.layout === "canva-hero-footer" ||
    creative.layout === "canva-storm-overlay" ||
    creative.layout === "canva-gradient-panel"
  ) {
    if (shape === "wide") {
      return `clamp(2.5rem, ${formatCssNumber(5.8 * scale)}cqw, 5rem)`;
    }

    if (shape === "tall") {
      return `clamp(2.25rem, ${formatCssNumber(7.2 * scale)}cqw, 5rem)`;
    }

    return `clamp(2.25rem, ${formatCssNumber(6.2 * scale)}cqw, 5rem)`;
  }

  if (creative.layout === "storm-split") {
    return `clamp(1.5rem, ${formatCssNumber(5.5 * scale)}cqw, 3.5rem)`;
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

const getPreviewBaseWidth = (shape: PlatformShape) => {
  if (shape === "wide") return "56rem";
  if (shape === "tall") return "28rem";
  return "44rem";
};

type AdColorPickerFieldProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
};

const AdColorPickerField = ({ label, value, onValueChange }: AdColorPickerFieldProps) => {
  const pickerRef = useRef<WaColorPickerElement | null>(null);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker || picker.value === value) return;

    picker.value = value;
  }, [value]);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return undefined;

    const handleValueChange = (event: Event) => {
      const nextValue = (event.target as WaColorPickerElement | null)?.value ?? picker.value ?? "";
      if (nextValue) {
        onValueChange(nextValue);
      }
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

const formatIntegerDisplay = (value: number) => String(Math.round(value));

const formatDimensionDisplay = (value: number, unit: AdUnit) =>
  unit === "px" ? formatIntegerDisplay(value) : formatCssNumber(value);

const useDraftNumberInput = (
  safeValue: number,
  formatDisplay: (value: number) => string,
  clampValue: (value: number) => number,
  onValueChange: (value: number) => void,
) => {
  const inputRef = useRef<WaNumberInputElement | null>(null);
  const isFocusedRef = useRef(false);
  const [draftValue, setDraftValue] = useState(() => formatDisplay(safeValue));

  useEffect(() => {
    if (!isFocusedRef.current) {
      setDraftValue(formatDisplay(safeValue));
    }
  }, [formatDisplay, safeValue]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleFocus = () => {
      isFocusedRef.current = true;
    };

    const handleInput = () => {
      const raw = input.value ?? "";
      setDraftValue(raw);
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        onValueChange(clampValue(parsed));
      }
    };

    const handleBlur = () => {
      isFocusedRef.current = false;
      const parsed = Number(input.value ?? "");
      if (Number.isFinite(parsed)) {
        const nextValue = clampValue(parsed);
        onValueChange(nextValue);
        setDraftValue(formatDisplay(nextValue));
        return;
      }

      setDraftValue(formatDisplay(safeValue));
    };

    input.addEventListener("focus", handleFocus);
    input.addEventListener("input", handleInput);
    input.addEventListener("change", handleInput);
    input.addEventListener("blur", handleBlur);

    return () => {
      input.removeEventListener("focus", handleFocus);
      input.removeEventListener("input", handleInput);
      input.removeEventListener("change", handleInput);
      input.removeEventListener("blur", handleBlur);
    };
  }, [clampValue, formatDisplay, onValueChange, safeValue]);

  return { inputRef, draftValue };
};

type AdSliderNumberFieldProps = {
  className: string;
  sliderLabel: string;
  numberAriaLabel: string;
  value: number;
  min: number;
  max: number;
  step: number | "any";
  inputMode?: "numeric" | "decimal";
  clampValue: (value: number) => number;
  formatDisplay?: (value: number) => string;
  onValueChange: (value: number) => void;
};

const AdSliderNumberField = ({
  className,
  sliderLabel,
  numberAriaLabel,
  value,
  min,
  max,
  step,
  inputMode = "numeric",
  clampValue,
  formatDisplay = formatIntegerDisplay,
  onValueChange,
}: AdSliderNumberFieldProps) => {
  const sliderRef = useRef<WaSliderElement | null>(null);
  const safeValue = clampValue(value);
  const { inputRef: numberInputRef, draftValue } = useDraftNumberInput(
    safeValue,
    formatDisplay,
    clampValue,
    onValueChange,
  );

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const updateFromSlider = () => {
      onValueChange(clampValue(slider.value));
    };

    slider.addEventListener("input", updateFromSlider);
    slider.addEventListener("change", updateFromSlider);

    return () => {
      slider.removeEventListener("input", updateFromSlider);
      slider.removeEventListener("change", updateFromSlider);
    };
  }, [clampValue, onValueChange]);

  return (
    <div className={className}>
      <WaSlider
        ref={sliderRef}
        label={sliderLabel}
        value={safeValue}
        min={min}
        max={max}
        step={step === "any" ? 1 : step}
        size="xs"
        withTooltip
      />
      <WaNumberInput
        ref={numberInputRef}
        className="ad-dashboard-number-compact"
        label={numberAriaLabel}
        value={draftValue}
        min={min}
        max={max}
        step={step}
        inputmode={inputMode}
        appearance="outlined"
        size="xs"
      />
    </div>
  );
};

type AdPaddingFieldProps = {
  value: number;
  onValueChange: (value: number) => void;
};

const AdPaddingField = ({ value, onValueChange }: AdPaddingFieldProps) => (
  <AdSliderNumberField
    className="ad-dashboard-padding-field"
    sliderLabel="Padding"
    numberAriaLabel="Padding percent"
    value={value}
    min={PADDING_MIN}
    max={PADDING_MAX}
    step={PADDING_STEP}
    clampValue={clampPadding}
    onValueChange={onValueChange}
  />
);

type AdTypeSizeFieldProps = {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
};

type AdRangeFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  clampValue: (value: number) => number;
  onValueChange: (value: number) => void;
};

const AdRangeField = ({
  label,
  value,
  min,
  max,
  step,
  suffix,
  clampValue,
  onValueChange,
}: AdRangeFieldProps) => (
  <AdSliderNumberField
    className="ad-dashboard-range-field"
    sliderLabel={label}
    numberAriaLabel={suffix}
    value={value}
    min={min}
    max={max}
    step={step}
    clampValue={clampValue}
    onValueChange={onValueChange}
  />
);

const AdTypeSizeField = ({ label, value, onValueChange }: AdTypeSizeFieldProps) => (
  <AdSliderNumberField
    className="ad-dashboard-size-field"
    sliderLabel={label}
    numberAriaLabel={`${label} percent`}
    value={getSafeTypeSize(value)}
    min={TYPE_SIZE_MIN}
    max={TYPE_SIZE_MAX}
    step={TYPE_SIZE_STEP}
    clampValue={clampTypeSize}
    onValueChange={onValueChange}
  />
);

type AdUnitFieldProps = {
  unit: AdUnit;
  width: number;
  height: number;
  onUnitChange: (unit: AdUnit) => void;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
};

type AdDimensionNumberFieldProps = {
  label: string;
  value: number;
  unit: AdUnit;
  onValueChange: (value: number) => void;
};

const AdDimensionNumberField = ({
  label,
  value,
  unit,
  onValueChange,
}: AdDimensionNumberFieldProps) => {
  const safeValue = clampDimension(value, unit);
  const min = unit === "px" ? DIMENSION_MIN_PX : DIMENSION_MIN_IN;
  const max = unit === "px" ? DIMENSION_MAX_PX : DIMENSION_MAX_IN;
  const step = unit === "px" ? 1 : 0.125;
  const formatDisplay = useCallback(
    (nextValue: number) => formatDimensionDisplay(nextValue, unit),
    [unit],
  );
  const clampValue = useCallback((nextValue: number) => clampDimension(nextValue, unit), [unit]);
  const { inputRef, draftValue } = useDraftNumberInput(
    safeValue,
    formatDisplay,
    clampValue,
    onValueChange,
  );

  return (
    <WaNumberInput
      ref={inputRef}
      label={label}
      value={draftValue}
      min={min}
      max={max}
      step={step}
      inputmode={unit === "px" ? "numeric" : "decimal"}
      appearance="outlined"
      size="xs"
    />
  );
};

const AdUnitField = ({
  unit,
  width,
  height,
  onUnitChange,
  onWidthChange,
  onHeightChange,
}: AdUnitFieldProps) => (
  <div className="ad-dashboard-unit-field">
    <div className="ad-dashboard-unit-toggle">
      <span className={unit === "in" ? "is-active" : undefined}>in</span>
      <WaSwitch
        className="ad-dashboard-unit-switch"
        checked={unit === "px"}
        size="xs"
        onChange={(event) => onUnitChange(getSwitchChecked(event) ? "px" : "in")}
      >
        px
      </WaSwitch>
    </div>
    <div className="ad-dashboard-unit-dimensions">
      <AdDimensionNumberField
        label={`Width (${unit})`}
        value={width}
        unit={unit}
        onValueChange={onWidthChange}
      />
      <AdDimensionNumberField
        label={`Height (${unit})`}
        value={height}
        unit={unit}
        onValueChange={onHeightChange}
      />
    </div>
  </div>
);

const DEFAULT_CREATIVE: CreativeState = {
  templateId: AD_TEMPLATES[0].id,
  platformId: "instagram-square",
  unit: "px",
  adWidth: PLATFORM_PRESETS[0].width,
  adHeight: PLATFORM_PRESETS[0].height,
  layout: AD_TEMPLATES[0].preset.layout,
  contentPadding: AD_TEMPLATES[0].preset.contentPadding,
  fontPresetId: AD_TEMPLATES[0].preset.fontPresetId,
  headlineSize: AD_TEMPLATES[0].preset.headlineSize,
  eyebrowSize: AD_TEMPLATES[0].preset.eyebrowSize,
  bodySize: AD_TEMPLATES[0].preset.bodySize,
  ctaSize: AD_TEMPLATES[0].preset.ctaSize,
  eyebrow: AD_TEMPLATES[0].preset.eyebrow,
  headline: AD_TEMPLATES[0].preset.headline,
  body: AD_TEMPLATES[0].preset.body,
  cta: AD_TEMPLATES[0].preset.cta,
  footnote: AD_TEMPLATES[0].preset.footnote,
  footnote2: AD_TEMPLATES[0].preset.footnote2,
  backgroundColor: AD_TEMPLATES[0].preset.backgroundColor,
  textColor: AD_TEMPLATES[0].preset.textColor,
  headlineColor: AD_TEMPLATES[0].preset.headlineColor,
  headlineAccentColor: AD_TEMPLATES[0].preset.headlineAccentColor,
  accentColor: AD_TEMPLATES[0].preset.accentColor,
  showLogo: AD_TEMPLATES[0].preset.showLogo,
  logoVariant: "horizontal-white",
  showBottomBorder: true,
  ...DEFAULT_TEXT_RHYTHM,
  imageFile: null,
  imageUrl: AD_TEMPLATES[0].preset.defaultImageUrl ?? null,
  imageName: AD_TEMPLATES[0].preset.defaultImageName ?? null,
};

const ACCENT_HEADLINE_LAYOUTS = new Set<CreativeLayout>(["storm-split", "canva-gradient-panel"]);

type AdCreativeHeadlineProps = {
  headline: string;
  layout: CreativeLayout;
  accentColor: string;
};

const AdCreativeHeadline = ({ headline, layout, accentColor }: AdCreativeHeadlineProps) => {
  const lines = headline.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return <h2 className="ad-creative-headline">{headline}</h2>;
  }

  const usesAccentLines = ACCENT_HEADLINE_LAYOUTS.has(layout);

  return (
    <h2 className="ad-creative-headline ad-creative-headline-stacked">
      {lines.map((line, index) => (
        <span
          key={`${line}-${index}`}
          className={usesAccentLines && index > 0 ? "is-accent" : undefined}
          style={usesAccentLines && index > 0 ? { color: accentColor } : undefined}
        >
          {line}
        </span>
      ))}
    </h2>
  );
};

const usesScriptBody = (layout: CreativeLayout, body: string) =>
  body.length > 0 &&
  body.length < 48 &&
  (layout === "canva-hero-footer" || layout === "canva-storm-overlay" || layout === "storm-split");

type AdCreativeLogoProps = {
  variant: LogoVariant;
  className: string;
};

const AdCreativeLogo = ({ variant, className }: AdCreativeLogoProps) => (
  <img
    className={`${className}${variant === "vertical-white" ? " is-vertical" : ""}`}
    src={getLogoSrc(variant)}
    alt="Birdcreek Roofing"
  />
);

const getSelectedPlatform = (platformId: string) =>
  PLATFORM_PRESETS.find((platform) => platform.id === platformId) ?? PLATFORM_PRESETS[0];

const getPlatformDimensions = (platform: PlatformPreset, unit: AdUnit) =>
  unit === "px"
    ? { width: platform.width, height: platform.height }
    : {
        width: Math.round((platform.width / PRINT_DPI) * 1000) / 1000,
        height: Math.round((platform.height / PRINT_DPI) * 1000) / 1000,
      };

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
  exportWidth: number,
  exportHeight: number,
  backgroundColor: string,
): Promise<Blob> => {
  if (document.fonts) {
    await document.fonts.ready;
  }

  const previousStyle = {
    boxShadow: node.style.boxShadow,
    transform: node.style.transform,
  };

  node.style.boxShadow = "none";
  node.style.transform = "none";

  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const previewWidth = node.offsetWidth;
    const previewHeight = node.offsetHeight;

    if (previewWidth <= 0 || previewHeight <= 0) {
      throw new Error("The ad preview is not ready yet.");
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

    if (!blob) {
      throw new Error("Could not export PNG.");
    }

    return blob;
  } finally {
    node.style.boxShadow = previousStyle.boxShadow;
    node.style.transform = previousStyle.transform;
  }
};

const AuthPanel = ({ auth }: { auth: ReturnType<typeof useGoogleDashboardAuth> }) => (
  <section className="ad-dashboard-auth">
    <div>
      <p className="ad-dashboard-eyebrow">Google gated</p>
      <h1>Sign in to build ad creative.</h1>
      <p>
        This dashboard is restricted to allowed Google accounts and does not expose the creative
        tools on the public site.
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
        {auth.authError ? <p className="ad-dashboard-error">{auth.authError}</p> : null}
      </>
    )}
  </section>
);

export const AdDashboardPage = () => {
  const auth = useGoogleDashboardAuth();
  const posthog = usePostHog();
  const imageLibrary = useSanityImageAssets();
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);
  const [creative, setCreative] = useState<CreativeState>(DEFAULT_CREATIVE);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const selectedPlatform = useMemo(
    () => getSelectedPlatform(creative.platformId),
    [creative.platformId],
  );
  const exportPixelSize = useMemo(
    () => getExportPixelSize(creative.adWidth, creative.adHeight, creative.unit),
    [creative.adHeight, creative.adWidth, creative.unit],
  );
  const selectedPlatformShape = getPlatformShape({
    ...selectedPlatform,
    width: exportPixelSize.width,
    height: exportPixelSize.height,
  });
  const selectedTemplate = useMemo(
    () => AD_TEMPLATES.find((template) => template.id === creative.templateId) ?? AD_TEMPLATES[0],
    [creative.templateId],
  );

  usePageMetadata({
    title: "Ad Builder | Tandra Peters",
    description: "Internal advertising dashboard for creating brand-aligned platform ad images.",
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

  useLayoutEffect(() => {
    const wrapper = previewWrapRef.current;
    const preview = previewRef.current;
    if (!wrapper || !preview) return undefined;

    let frame = 0;

    const updatePreviewScale = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const wrapperStyles = getComputedStyle(wrapper);
        const horizontalPadding =
          Number.parseFloat(wrapperStyles.paddingLeft) +
          Number.parseFloat(wrapperStyles.paddingRight);
        const verticalPadding =
          Number.parseFloat(wrapperStyles.paddingTop) +
          Number.parseFloat(wrapperStyles.paddingBottom);
        const availableWidth = wrapper.clientWidth - horizontalPadding;
        const availableHeight = wrapper.clientHeight - verticalPadding;
        const previewWidth = preview.offsetWidth;
        const previewHeight = preview.offsetHeight;

        if (
          availableWidth <= 0 ||
          availableHeight <= 0 ||
          previewWidth <= 0 ||
          previewHeight <= 0
        ) {
          setPreviewScale(1);
          return;
        }

        const nextScale = Math.min(
          1,
          availableWidth / previewWidth,
          availableHeight / previewHeight,
        );

        setPreviewScale(Number.parseFloat(Math.max(0.1, nextScale).toFixed(3)));
      });
    };

    const resizeObserver = new ResizeObserver(updatePreviewScale);
    resizeObserver.observe(wrapper);
    resizeObserver.observe(preview);
    updatePreviewScale();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [creative.layout, exportPixelSize.height, exportPixelSize.width]);

  const updateCreative = useCallback(
    <K extends keyof CreativeState>(key: K, value: CreativeState[K]) => {
      setCreative((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const handlePlatformChange = useCallback((platformId: string) => {
    const platform = getSelectedPlatform(platformId);
    setCreative((current) => {
      const dimensions = getPlatformDimensions(platform, current.unit);
      return {
        ...current,
        platformId,
        adWidth: dimensions.width,
        adHeight: dimensions.height,
      };
    });
  }, []);

  const handleUnitChange = useCallback((nextUnit: AdUnit) => {
    setCreative((current) => {
      if (current.unit === nextUnit) {
        return current;
      }

      const dimensions = convertDimensionsForUnit(
        current.adWidth,
        current.adHeight,
        current.unit,
        nextUnit,
      );

      return {
        ...current,
        unit: nextUnit,
        adWidth: dimensions.width,
        adHeight: dimensions.height,
      };
    });
  }, []);

  const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
  }, []);

  const handleImageRemove = useCallback(() => {
    setCreative((current) => {
      revokeObjectUrl(current.imageUrl);

      return {
        ...current,
        imageFile: null,
        imageUrl: null,
        imageName: null,
      };
    });
    setExportError(null);
  }, []);

  const handleTemplateChange = useCallback((templateId: string) => {
    const template = AD_TEMPLATES.find((entry) => entry.id === templateId) ?? AD_TEMPLATES[0];
    setCreative((current) => applyAdTemplatePreset(current, template));
    setExportError(null);
  }, []);

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
        exportPixelSize.width,
        exportPixelSize.height,
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
        bodySize: getSafeTypeSize(creative.bodySize),
        ctaSize: getSafeTypeSize(creative.ctaSize),
        headlineColor: getSafeColor(creative.headlineColor, creative.textColor),
      });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Could not export PNG.");
    } finally {
      setExporting(false);
    }
  }, [creative, exportPixelSize.height, exportPixelSize.width, posthog, selectedPlatform.id]);

  const previewStyle = {
    "--ad-bg": creative.backgroundColor,
    "--ad-ink": creative.textColor,
    "--ad-headline-ink": getSafeColor(creative.headlineColor, creative.textColor),
    "--ad-headline-accent-ink": getSafeColor(creative.headlineAccentColor, creative.accentColor),
    "--ad-accent": creative.accentColor,
    "--ad-preview-padding": getPreviewPadding(creative, selectedPlatformShape),
    "--ad-preview-base-width": getPreviewBaseWidth(selectedPlatformShape),
    "--ad-preview-scale": formatCssNumber(previewScale),
    "--ad-frame-inset": getFrameInset(creative),
    "--ad-headline-font": getSelectedFontPreset(creative.fontPresetId).headlineFamily,
    "--ad-headline-weight": String(getSelectedFontPreset(creative.fontPresetId).headlineWeight),
    "--ad-headline-size-scale": formatCssNumber(getSafeTypeSize(creative.headlineSize) / 100),
    "--ad-eyebrow-size-scale": formatCssNumber(getSafeTypeSize(creative.eyebrowSize) / 100),
    "--ad-body-size-scale": formatCssNumber(getSafeTypeSize(creative.bodySize) / 100),
    "--ad-cta-size-scale": formatCssNumber(getSafeTypeSize(creative.ctaSize) / 100),
    "--ad-body-font": getSelectedFontPreset(creative.fontPresetId).bodyFamily,
    "--ad-eyebrow-line-height-scale": getLineHeightScale(creative.eyebrowLineHeight),
    "--ad-headline-line-height-scale": getLineHeightScale(creative.headlineLineHeight),
    "--ad-body-line-height-scale": getLineHeightScale(creative.bodyLineHeight),
    "--ad-cta-line-height-scale": getLineHeightScale(creative.ctaLineHeight),
    "--ad-footnote-line-height-scale": getLineHeightScale(creative.footnoteLineHeight),
    "--ad-eyebrow-margin-offset": getTextOffset(creative.eyebrowOffset),
    "--ad-headline-margin-offset": getTextOffset(creative.headlineOffset),
    "--ad-body-margin-offset": getTextOffset(creative.bodyOffset),
    "--ad-cta-margin-offset": getTextOffset(creative.ctaOffset),
    "--ad-footnote-margin-offset": getTextOffset(creative.footnoteOffset),
    aspectRatio: `${exportPixelSize.width} / ${exportPixelSize.height}`,
  } as CSSProperties & Record<string, string>;
  const previewImageUrl = creative.imageUrl ? toCanvasImageUrl(creative.imageUrl) : null;

  return (
    <SitePageChrome>
      <main className={layoutClass.pageMain}>
        <div className="ad-dashboard-shell">
          {!auth.token ? <AuthPanel auth={auth} /> : null}

          {auth.token ? (
            <>
              <section className="ad-dashboard-grid">
                <div className="ad-dashboard-panel ad-dashboard-controls">
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
                        size="xs"
                        onChange={(event) => handlePlatformChange(getSelectValue(event))}
                      >
                        {PLATFORM_PRESETS.map((platform) => (
                          <WaOption key={platform.id} value={platform.id}>
                            {platform.label} ·{" "}
                            {formatAdDimensions(platform.width, platform.height, "px")} ·{" "}
                            {platform.helper}
                          </WaOption>
                        ))}
                      </WaSelect>
                      <AdUnitField
                        unit={creative.unit}
                        width={creative.adWidth}
                        height={creative.adHeight}
                        onUnitChange={handleUnitChange}
                        onWidthChange={(adWidth) => updateCreative("adWidth", adWidth)}
                        onHeightChange={(adHeight) => updateCreative("adHeight", adHeight)}
                      />
                    </div>

                    <div className="ad-dashboard-panel-header">
                      <MediaImage width={20} height={20} />
                      <h2>Templates</h2>
                    </div>
                    <div className="ad-dashboard-template-picker">
                      <WaSelect
                        name="template"
                        label="Design"
                        value={creative.templateId}
                        appearance="outlined"
                        size="xs"
                        onChange={(event) => handleTemplateChange(getSelectValue(event))}
                      >
                        {AD_TEMPLATES.map((template) => (
                          <WaOption key={template.id} value={template.id}>
                            {template.label} · {template.helper}
                          </WaOption>
                        ))}
                      </WaSelect>
                      {selectedTemplate.thumbnail ? (
                        <img
                          className="ad-dashboard-template-preview"
                          src={selectedTemplate.thumbnail}
                          alt=""
                        />
                      ) : null}
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
                        size="xs"
                        onChange={(event) =>
                          updateCreative("layout", getSelectValue(event) as CreativeLayout)
                        }
                      >
                        {LAYOUT_OPTIONS.map((layout) => (
                          <WaOption key={layout.id} value={layout.id}>
                            {layout.label} · {layout.helper}
                          </WaOption>
                        ))}
                      </WaSelect>
                    </div>
                    <AdPaddingField
                      value={creative.contentPadding}
                      onValueChange={(value) => updateCreative("contentPadding", value)}
                    />
                    <WaSelect
                      className="ad-dashboard-field"
                      name="fontPreset"
                      label="Font"
                      value={creative.fontPresetId}
                      appearance="outlined"
                      size="xs"
                      onChange={(event) =>
                        updateCreative("fontPresetId", getSelectValue(event) as FontPresetId)
                      }
                    >
                      {FONT_PRESETS.map((fontPreset) => (
                        <WaOption key={fontPreset.id} value={fontPreset.id}>
                          {fontPreset.label}
                        </WaOption>
                      ))}
                    </WaSelect>
                    <p className="ad-dashboard-rhythm-hint">
                      Applies to headlines, body copy, and contact lines on every layout.
                      Canva-style layouts keep their preset sizes and all-caps styling — adjust Type
                      sizes if a font feels too large or tight. Picking a new Design resets the font
                      to that that template&apos;s default.
                    </p>

                    <div className="ad-dashboard-panel-header">
                      <ColorWheel width={20} height={20} />
                      <h2>Type sizes</h2>
                    </div>
                    <AdTypeSizeField
                      label="Headline"
                      value={creative.headlineSize}
                      onValueChange={(value) => updateCreative("headlineSize", value)}
                    />
                    <AdTypeSizeField
                      label="Eyebrow"
                      value={creative.eyebrowSize}
                      onValueChange={(value) => updateCreative("eyebrowSize", value)}
                    />
                    <AdTypeSizeField
                      label="Supporting copy"
                      value={creative.bodySize}
                      onValueChange={(value) => updateCreative("bodySize", value)}
                    />
                    <AdTypeSizeField
                      label="CTA"
                      value={creative.ctaSize}
                      onValueChange={(value) => updateCreative("ctaSize", value)}
                    />

                    <div className="ad-dashboard-panel-header">
                      <TextSize width={20} height={20} />
                      <h2>Type rhythm</h2>
                    </div>
                    <p className="ad-dashboard-rhythm-hint">
                      Line height is a % of each layout&apos;s default leading. Spacing nudges
                      vertical position in container-width units.
                    </p>
                    {TEXT_RHYTHM_ROLES.map((role) => (
                      <div key={role.id} className="ad-dashboard-rhythm-row">
                        <h3>{role.label}</h3>
                        <AdRangeField
                          label="Line height"
                          value={creative[role.lineHeightKey]}
                          min={LINE_HEIGHT_MIN}
                          max={LINE_HEIGHT_MAX}
                          step={LINE_HEIGHT_STEP}
                          suffix="Line %"
                          clampValue={clampLineHeight}
                          onValueChange={(value) => updateCreative(role.lineHeightKey, value)}
                        />
                        <AdRangeField
                          label="Spacing"
                          value={creative[role.offsetKey]}
                          min={TEXT_OFFSET_MIN}
                          max={TEXT_OFFSET_MAX}
                          step={TEXT_OFFSET_STEP}
                          suffix="Spacing"
                          clampValue={clampTextOffset}
                          onValueChange={(value) => updateCreative(role.offsetKey, value)}
                        />
                      </div>
                    ))}

                    <WaInput
                      className="ad-dashboard-field"
                      label="Eyebrow"
                      value={creative.eyebrow}
                      appearance="outlined"
                      size="xs"
                      withClear
                      onInput={(event) => updateCreative("eyebrow", getInputValue(event))}
                    />
                    <WaTextarea
                      className="ad-dashboard-field"
                      label="Headline"
                      value={creative.headline}
                      rows={3}
                      resize="vertical"
                      appearance="outlined"
                      size="xs"
                      onInput={(event) => updateCreative("headline", getInputValue(event))}
                    />
                    <WaTextarea
                      className="ad-dashboard-field"
                      label="Supporting copy"
                      value={creative.body}
                      rows={4}
                      resize="vertical"
                      appearance="outlined"
                      size="xs"
                      onInput={(event) => updateCreative("body", getInputValue(event))}
                    />
                    <WaInput
                      className="ad-dashboard-field"
                      label="CTA"
                      value={creative.cta}
                      appearance="outlined"
                      size="xs"
                      withClear
                      onInput={(event) => updateCreative("cta", getInputValue(event))}
                    />
                  </div>
                  <div className="ad-dashboard-user">
                    {auth.user?.picture ? <img src={auth.user.picture} alt="" /> : null}
                    <div>
                      <strong>{auth.user?.name ?? auth.user?.email}</strong>
                      <span>{auth.user?.email}</span>
                    </div>
                    <button type="button" onClick={() => auth.signOut()}>
                      Sign out
                    </button>
                  </div>
                </div>

                <section className="ad-dashboard-stage">
                  <div className="ad-dashboard-toolbar">
                    <div>
                      <strong>{selectedPlatform.label}</strong>
                      <span>
                        {formatAdDimensions(creative.adWidth, creative.adHeight, creative.unit)}
                        {creative.unit === "in"
                          ? ` · ${exportPixelSize.width} x ${exportPixelSize.height}px export`
                          : null}
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
                    <p className="ad-dashboard-error ad-dashboard-export-error">{exportError}</p>
                  ) : null}

                  <div className="ad-dashboard-preview-wrap" ref={previewWrapRef}>
                    <article
                      ref={previewRef}
                      className={`ad-creative-preview ad-creative-preview--${creative.layout} is-${selectedPlatformShape} ${
                        previewImageUrl ? "has-image" : "has-no-image"
                      }${creative.showBottomBorder ? " has-bottom-border" : ""}`}
                      style={previewStyle}
                    >
                      {previewImageUrl ? (
                        <div
                          className="ad-creative-photo"
                          style={{ backgroundImage: `url(${previewImageUrl})` }}
                        />
                      ) : null}
                      {creative.showLogo &&
                      (creative.layout === "canva-hero-footer" ||
                        creative.layout === "canva-storm-overlay") ? (
                        <AdCreativeLogo
                          variant={creative.logoVariant}
                          className="ad-creative-logo ad-creative-logo--corner-tr"
                        />
                      ) : null}
                      {creative.showLogo && creative.layout === "canva-gradient-panel" ? (
                        <AdCreativeLogo
                          variant={creative.logoVariant}
                          className="ad-creative-logo ad-creative-logo--corner-tl"
                        />
                      ) : null}
                      <div className="ad-creative-copy">
                        {creative.showLogo && creative.layout === "storm-split" ? (
                          <AdCreativeLogo
                            variant={creative.logoVariant}
                            className="ad-creative-logo ad-creative-logo--inline"
                          />
                        ) : null}
                        {creative.eyebrow ? (
                          <p className="ad-creative-eyebrow">{creative.eyebrow}</p>
                        ) : null}
                        <AdCreativeHeadline
                          headline={creative.headline}
                          layout={creative.layout}
                          accentColor={getSafeColor(
                            creative.headlineAccentColor,
                            creative.accentColor,
                          )}
                        />
                        {creative.body ? (
                          <span
                            className={`ad-creative-body${
                              usesScriptBody(creative.layout, creative.body)
                                ? " ad-creative-script"
                                : ""
                            }`}
                          >
                            {creative.body}
                          </span>
                        ) : null}
                        {creative.cta ? (
                          <strong className="ad-creative-cta">{creative.cta}</strong>
                        ) : null}
                      </div>
                      <footer className="ad-creative-footnote">
                        <div className="ad-creative-footer-copy">
                          {creative.footnote ? <span>{creative.footnote}</span> : null}
                        </div>
                        {creative.showLogo &&
                        creative.layout !== "canva-hero-footer" &&
                        creative.layout !== "canva-storm-overlay" &&
                        creative.layout !== "canva-gradient-panel" &&
                        creative.layout !== "storm-split" ? (
                          <AdCreativeLogo
                            variant={creative.logoVariant}
                            className="ad-creative-logo"
                          />
                        ) : null}
                      </footer>
                    </article>
                  </div>
                </section>

                <div className="ad-dashboard-panel ad-dashboard-brand">
                  <div className="ad-dashboard-panel-header">
                    <Upload width={20} height={20} />
                    <h2>Image</h2>
                  </div>
                  <label className="ad-dashboard-upload">
                    <input type="file" accept="image/*" onChange={handleImageChange} />
                    <MediaImage width={22} height={22} />
                    <span>{creative.imageName ?? "Choose roof, project, or portrait photo"}</span>
                  </label>
                  <AdImagePicker
                    images={imageLibrary.images}
                    loading={imageLibrary.loading}
                    error={imageLibrary.error}
                    selectedImageUrl={creative.imageUrl}
                    onRefresh={imageLibrary.refresh}
                    onSelect={handleSanityImageSelect}
                  />
                  {creative.imageUrl ? (
                    <button
                      type="button"
                      className="ad-dashboard-remove-image"
                      onClick={handleImageRemove}
                    >
                      <Trash width={16} height={16} />
                      Remove current image
                    </button>
                  ) : null}

                  <div className="ad-dashboard-panel-header">
                    <Palette width={20} height={20} />
                    <h2>Brand</h2>
                  </div>
                  <div className="ad-dashboard-brand-toggles">
                    <WaSwitch
                      checked={creative.showLogo}
                      size="xs"
                      onChange={(event) => updateCreative("showLogo", getSwitchChecked(event))}
                    >
                      Show Birdcreek logo
                    </WaSwitch>
                    {creative.showLogo ? (
                      <WaSelect
                        className="ad-dashboard-field"
                        name="logoVariant"
                        label="Logo lockup"
                        value={creative.logoVariant}
                        appearance="outlined"
                        size="xs"
                        onChange={(event) =>
                          updateCreative("logoVariant", getSelectValue(event) as LogoVariant)
                        }
                      >
                        {LOGO_VARIANTS.map((logo) => (
                          <WaOption key={logo.id} value={logo.id}>
                            {logo.label}
                          </WaOption>
                        ))}
                      </WaSelect>
                    ) : null}
                    <WaSwitch
                      checked={creative.showBottomBorder}
                      size="xs"
                      onChange={(event) =>
                        updateCreative("showBottomBorder", getSwitchChecked(event))
                      }
                    >
                      Bottom accent border
                    </WaSwitch>
                  </div>

                  <div className="ad-dashboard-panel-header">
                    <ColorWheel width={20} height={20} />
                    <h2>Brand colors</h2>
                  </div>
                  <div className="ad-dashboard-color-grid">
                    {BRAND_SWATCHES.map((swatch) => (
                      <button
                        key={`${swatch.label}-${swatch.value}`}
                        type="button"
                        style={{ backgroundColor: swatch.value }}
                        onClick={() =>
                          setCreative((current) => ({
                            ...current,
                            backgroundColor: swatch.value,
                            textColor: swatch.value === "#F6F2EA" ? "#092A1D" : current.textColor,
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
                      onValueChange={(value) => updateCreative("backgroundColor", value)}
                    />
                    <AdColorPickerField
                      label="Text"
                      value={creative.textColor}
                      onValueChange={(value) => updateCreative("textColor", value)}
                    />
                    <AdColorPickerField
                      label="Headline"
                      value={getSafeColor(creative.headlineColor, creative.textColor)}
                      onValueChange={(value) => updateCreative("headlineColor", value)}
                    />
                    <AdColorPickerField
                      label="Accent"
                      value={creative.accentColor}
                      onValueChange={(value) => updateCreative("accentColor", value)}
                    />
                    <AdColorPickerField
                      label="Headline accent"
                      value={getSafeColor(creative.headlineAccentColor, creative.accentColor)}
                      onValueChange={(value) => updateCreative("headlineAccentColor", value)}
                    />
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </SitePageChrome>
  );
};
