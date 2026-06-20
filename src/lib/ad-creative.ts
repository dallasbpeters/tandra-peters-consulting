import type { CreativeLayout, FontPresetId } from "./ad-creative-templates";

export type AdUnit = "px" | "in";

export type LogoVariant = "horizontal-white" | "vertical-white";

export type PlatformShape = "square" | "wide" | "tall";

/**
 * Die-cut silhouette for door hangers. All measurements are in inches and are
 * interpreted against the format's own width/height so the same shape scales to
 * any export size. Drives both the canvas clip mask and the on-door mockup.
 */
export interface DoorHangerCutout {
  /** Distance from the top edge to the center of the hole. */
  holeCenterFromTop: number;
  /** Doorknob hole diameter. */
  holeDiameter: number;
  /** Width of the slit/throat that connects the hole to the top edge. */
  slotWidth: number;
  /** Top corner radius (rounded "tombstone" top). */
  topRadius: number;
}

export interface PlatformPreset {
  /** Present on die-cut door-hanger formats; enables the clip mask + mockup. */
  cutout?: DoorHangerCutout;
  height: number;
  helper: string;
  id: string;
  label: string;
  /** Natural unit of `width`/`height`. Defaults to "px" when omitted. */
  unit?: AdUnit;
  width: number;
}

/** Brand palette shared by the swatch grid and every ad color picker. */
export const BRAND_SWATCHES = [
  { label: "Everglade", value: "#092A1D" },
  { label: "Paper", value: "#F6F2EA" },
  { label: "Mint", value: "#D5F6E9" },
  { label: "Purple", value: "#9C99FF" },
  { label: "Laurel", value: "#A5CA9B" },
  { label: "Coral", value: "#FB6237" },
  { label: "Storm", value: "#46656B" },
  { label: "Blue", value: "#335CFF" },
  { label: "Granite", value: "#667A71" },
  { label: "Gold", value: "#F0D15C" },
  { label: "Green", value: "#12533A" },
  { label: "Moss", value: "#217D57" },
] as const;

/** Just the hex values — the preset list react-color's BlockPicker expects. */
export const BRAND_SWATCH_VALUES: string[] = BRAND_SWATCHES.map(
  (swatch) => swatch.value
);

export interface CreativeState {
  accentColor: string;
  adHeight: number;
  adWidth: number;
  backgroundColor: string;
  body: string;
  bodyLineHeight: number;
  bodyOffset: number;
  bodySize: number;
  contentPadding: number;
  cta: string;
  ctaLineHeight: number;
  ctaOffset: number;
  ctaSize: number;
  eyebrow: string;
  eyebrowLineHeight: number;
  eyebrowOffset: number;
  eyebrowSize: number;
  fontPresetId: FontPresetId;
  footnote: string;
  footnote2?: string;
  footnoteLineHeight: number;
  footnoteOffset: number;
  headline: string;
  headlineAccentColor: string;
  headlineColor: string;
  headlineLineHeight: number;
  headlineOffset: number;
  headlineSize: number;
  imageFile: File | null;
  imageName: string | null;
  imageUrl: string | null;
  layout: CreativeLayout;
  logoVariant: LogoVariant;
  platformId: string;
  showBottomBorder: boolean;
  showLogo: boolean;
  templateId: string;
  textColor: string;
  unit: AdUnit;
}

const PRINT_DPI = 300;

export const formatAdDimensions = (
  width: number,
  height: number,
  unit: AdUnit
) => {
  const suffix = unit === "px" ? "px" : "in";
  const formattedWidth =
    unit === "px" ? String(Math.round(width)) : width.toFixed(2);
  const formattedHeight =
    unit === "px" ? String(Math.round(height)) : height.toFixed(2);
  return `${formattedWidth} x ${formattedHeight}${suffix}`;
};

export const getExportPixelSize = (
  width: number,
  height: number,
  unit: AdUnit
) =>
  unit === "px"
    ? { height: Math.round(height), width: Math.round(width) }
    : {
        height: Math.round(height * PRINT_DPI),
        width: Math.round(width * PRINT_DPI),
      };
