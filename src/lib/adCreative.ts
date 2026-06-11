import type { CreativeLayout, FontPresetId } from "./adCreativeTemplates";

export type AdUnit = "px" | "in";

export type LogoVariant = "horizontal-white" | "vertical-white";

export type PlatformShape = "square" | "wide" | "tall";

export type PlatformPreset = {
  id: string;
  label: string;
  helper: string;
  width: number;
  height: number;
};

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
