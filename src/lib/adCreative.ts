import type { CreativeLayout, FontPresetId } from "./adCreativeTemplates";

export type AdUnit = "px" | "in";

export type LogoVariant = "horizontal-white" | "vertical-white";

export type PlatformShape = "square" | "wide" | "tall";

/**
 * Die-cut silhouette for door hangers. All measurements are in inches and are
 * interpreted against the format's own width/height so the same shape scales to
 * any export size. Drives both the canvas clip mask and the on-door mockup.
 */
export type DoorHangerCutout = {
  /** Top corner radius (rounded "tombstone" top). */
  topRadius: number;
  /** Doorknob hole diameter. */
  holeDiameter: number;
  /** Distance from the top edge to the center of the hole. */
  holeCenterFromTop: number;
  /** Width of the slit/throat that connects the hole to the top edge. */
  slotWidth: number;
};

export type PlatformPreset = {
  id: string;
  label: string;
  helper: string;
  width: number;
  height: number;
  /** Natural unit of `width`/`height`. Defaults to "px" when omitted. */
  unit?: AdUnit;
  /** Present on die-cut door-hanger formats; enables the clip mask + mockup. */
  cutout?: DoorHangerCutout;
};

/** Brand palette shared by the swatch grid and every ad color picker. */
export const BRAND_SWATCHES = [
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

/** Just the hex values — the preset list react-color's BlockPicker expects. */
export const BRAND_SWATCH_VALUES: string[] = BRAND_SWATCHES.map((swatch) => swatch.value);

export type CreativeState = {
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

const PRINT_DPI = 300;

export const formatAdDimensions = (width: number, height: number, unit: AdUnit) => {
  const suffix = unit === "px" ? "px" : "in";
  const formattedWidth = unit === "px" ? String(Math.round(width)) : width.toFixed(2);
  const formattedHeight = unit === "px" ? String(Math.round(height)) : height.toFixed(2);
  return `${formattedWidth} x ${formattedHeight}${suffix}`;
};

export const getExportPixelSize = (width: number, height: number, unit: AdUnit) =>
  unit === "px"
    ? { width: Math.round(width), height: Math.round(height) }
    : {
        width: Math.round(width * PRINT_DPI),
        height: Math.round(height * PRINT_DPI),
      };
