export type CreativeLayout =
  | "photo-right"
  | "photo-fill"
  | "headline-card"
  | "image-top"
  | "poster-cover"
  | "storm-split"
  | "canva-hero-footer"
  | "canva-storm-overlay"
  | "canva-gradient-panel";

export type FontPresetId = "brand-serif" | "clean-sans" | "condensed";

export type AdTemplatePreset = {
  layout: CreativeLayout;
  fontPresetId: FontPresetId;
  contentPadding: number;
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
  defaultImageUrl?: string;
  defaultImageName?: string;
};

export type AdTemplate = {
  id: string;
  label: string;
  helper: string;
  thumbnail: string;
  preset: AdTemplatePreset;
};

/** Presets sourced from https://sitepres.my.canva.site/laptop-lid */
export const AD_TEMPLATES: readonly AdTemplate[] = [
  {
    id: "roof-damage-hero",
    label: "Roof damage?",
    helper: "Storm sky hero · footer contact band",
    thumbnail: "/ad-templates/thumb-roof-damage.webp",
    preset: {
      layout: "canva-hero-footer",
      fontPresetId: "condensed",
      contentPadding: 100,
      headlineSize: 108,
      eyebrowSize: 100,
      bodySize: 110,
      ctaSize: 105,
      eyebrow: "",
      headline: "Roof\nDamage?",
      body: "I Can Help.",
      cta: "512-968-3965",
      footnote: "tandra@birdcreekroofing.com",
      footnote2: "",
      backgroundColor: "#0D3B3F",
      textColor: "#FFFFFF",
      headlineColor: "#FFFFFF",
      headlineAccentColor: "#D5F6E9",
      accentColor: "#D5F6E9",
      showLogo: true,
      defaultImageUrl: "/ad-templates/canva-bg-neighborhood.png",
      defaultImageName: "Canva · neighborhood storm sky",
    },
  },
  {
    id: "after-the-storm",
    label: "After the storm?",
    helper: "Dark panel left · rain photo right",
    thumbnail: "/ad-templates/thumb-after-storm.webp",
    preset: {
      layout: "storm-split",
      fontPresetId: "condensed",
      contentPadding: 100,
      headlineSize: 105,
      eyebrowSize: 100,
      bodySize: 115,
      ctaSize: 100,
      eyebrow: "",
      headline: "After the\nStorm?",
      body: "I can help!",
      cta: "512-968-3965",
      footnote: "tandra@birdcreekroofing.com",
      backgroundColor: "#133C3E",
      textColor: "#FFFFFF",
      headlineColor: "#FFFFFF",
      headlineAccentColor: "#F9A825",
      accentColor: "#F9A825",
      showLogo: true,
      defaultImageUrl: "/ad-templates/canva-bg-after-storm-rain.jpg",
      defaultImageName: "Rain on wet surface",
    },
  },
  {
    id: "storm-damage-debris",
    label: "Storm damage",
    helper: "Full-bleed debris · bold stacked headline",
    thumbnail: "/ad-templates/thumb-storm-damage.webp",
    preset: {
      layout: "canva-storm-overlay",
      fontPresetId: "condensed",
      contentPadding: 95,
      headlineSize: 112,
      eyebrowSize: 100,
      bodySize: 115,
      ctaSize: 102,
      eyebrow: "",
      headline: "Storm\nDamage",
      body: "I can help!",
      cta: "512-968-3965",
      footnote: "tandra@birdcreekroofing.com",
      backgroundColor: "#092A1D",
      textColor: "#FFFFFF",
      headlineColor: "#FFFFFF",
      headlineAccentColor: "#F9A825",
      accentColor: "#F9A825",
      showLogo: true,
    },
  },
  {
    id: "ask-about-storm",
    label: "Ask me about storm damage",
    helper: "Gradient panel · orange accent line",
    thumbnail: "/ad-templates/thumb-ask-storm.webp",
    preset: {
      layout: "canva-gradient-panel",
      fontPresetId: "condensed",
      contentPadding: 100,
      headlineSize: 100,
      eyebrowSize: 100,
      bodySize: 100,
      ctaSize: 105,
      eyebrow: "",
      headline: "Ask me about\nStorm damage.",
      body: "",
      cta: "512-968-3965",
      footnote: "tandra@birdcreekroofing.com",
      backgroundColor: "#092A1D",
      textColor: "#FFFFFF",
      headlineColor: "#FFFFFF",
      headlineAccentColor: "#FB6237",
      accentColor: "#FB6237",
      showLogo: true,
      defaultImageUrl: "/ad-templates/canva-bg-neighborhood.png",
      defaultImageName: "Canva · neighborhood aerial",
    },
  },
  {
    id: "texas-roofs-split",
    label: "Texas roofs",
    helper: "Intro-video storm split · purple accent",
    thumbnail: "/ad-templates/thumb-texas-roofs.webp",
    preset: {
      layout: "storm-split",
      fontPresetId: "condensed",
      contentPadding: 100,
      headlineSize: 100,
      eyebrowSize: 100,
      bodySize: 100,
      ctaSize: 100,
      eyebrow: "Austin homeowners",
      headline: "Texas roofs\nTake a\nbeating.",
      body: "Hail, heat, wind, and insurance paperwork can turn one bad storm into weeks of second-guessing.",
      cta: "",
      footnote: "Tandra Peters",
      footnote2: "Birdcreek Roofing",
      backgroundColor: "#000000",
      textColor: "#FFFFFF",
      headlineColor: "#FFFFFF",
      headlineAccentColor: "#9C99FF",
      accentColor: "#12533A",
      showLogo: false,
    },
  },
] as const;

export const LAYOUT_OPTIONS: ReadonlyArray<{
  id: CreativeLayout;
  label: string;
  helper: string;
}> = [
  {
    id: "canva-hero-footer",
    label: "Hero + footer band",
    helper: "Full photo · contact strip",
  },
  {
    id: "storm-split",
    label: "Storm split",
    helper: "Copy left · image right",
  },
  {
    id: "canva-storm-overlay",
    label: "Storm overlay",
    helper: "Full bleed · heavy tint",
  },
  {
    id: "canva-gradient-panel",
    label: "Gradient panel",
    helper: "Left fade · photo behind",
  },
  {
    id: "photo-right",
    label: "Photo side",
    helper: "Copy block · image panel",
  },
  { id: "photo-fill", label: "Full bleed", helper: "Photo-led · copy overlay" },
  {
    id: "headline-card",
    label: "Text first",
    helper: "Bold message · image badge",
  },
  {
    id: "image-top",
    label: "Image top",
    helper: "Top photo · crossing headline",
  },
  {
    id: "poster-cover",
    label: "Cover headline",
    helper: "Poster · brand band",
  },
];

export const getAdTemplate = (templateId: string) =>
  AD_TEMPLATES.find((template) => template.id === templateId) ?? AD_TEMPLATES[0];

export const applyAdTemplatePreset = <
  T extends AdTemplatePreset & {
    platformId: string;
    unit: "px" | "in";
    adWidth: number;
    adHeight: number;
    imageFile: File | null;
    imageUrl: string | null;
    imageName: string | null;
    templateId: string;
    logoVariant: "horizontal-white" | "vertical-white";
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
  },
>(
  current: T,
  template: AdTemplate,
  options?: { keepImage?: boolean },
) => {
  const keepImage = options?.keepImage ?? false;
  const nextImage =
    keepImage && (current.imageUrl || current.imageFile)
      ? {
          imageFile: current.imageFile,
          imageUrl: current.imageUrl,
          imageName: current.imageName,
        }
      : template.preset.defaultImageUrl
        ? {
            imageFile: null as File | null,
            imageUrl: template.preset.defaultImageUrl,
            imageName: template.preset.defaultImageName ?? template.label,
          }
        : {
            imageFile: null as File | null,
            imageUrl: null as string | null,
            imageName: null as string | null,
          };

  return {
    ...current,
    templateId: template.id,
    ...template.preset,
    ...nextImage,
    logoVariant: current.logoVariant,
    showBottomBorder: current.showBottomBorder,
    eyebrowLineHeight: current.eyebrowLineHeight,
    headlineLineHeight: current.headlineLineHeight,
    bodyLineHeight: current.bodyLineHeight,
    ctaLineHeight: current.ctaLineHeight,
    footnoteLineHeight: current.footnoteLineHeight,
    eyebrowOffset: current.eyebrowOffset,
    headlineOffset: current.headlineOffset,
    bodyOffset: current.bodyOffset,
    ctaOffset: current.ctaOffset,
    footnoteOffset: current.footnoteOffset,
  } as T;
};
