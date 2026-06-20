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

export type FontPresetId =
  | "brand-serif"
  | "clean-sans"
  | "condensed"
  | "caveat";

export interface AdTemplatePreset {
  accentColor: string;
  backgroundColor: string;
  body: string;
  bodySize: number;
  contentPadding: number;
  cta: string;
  ctaSize: number;
  defaultImageName?: string;
  defaultImageUrl?: string;
  eyebrow: string;
  eyebrowSize: number;
  fontPresetId: FontPresetId;
  footnote: string;
  footnote2?: string;
  headline: string;
  headlineAccentColor: string;
  headlineColor: string;
  headlineSize: number;
  layout: CreativeLayout;
  showLogo: boolean;
  textColor: string;
}

export interface AdTemplate {
  helper: string;
  id: string;
  label: string;
  preset: AdTemplatePreset;
  thumbnail: string;
}

/** Presets sourced from https://sitepres.my.canva.site/laptop-lid */
export const AD_TEMPLATES: readonly AdTemplate[] = [
  {
    helper: "Storm sky hero · footer contact band",
    id: "roof-damage-hero",
    label: "Roof damage?",
    preset: {
      accentColor: "#D5F6E9",
      backgroundColor: "#0D3B3F",
      body: "I Can Help.",
      bodySize: 110,
      contentPadding: 100,
      cta: "512-968-3965",
      ctaSize: 105,
      defaultImageName: "Canva · neighborhood storm sky",
      defaultImageUrl: "/ad-templates/canva-bg-neighborhood.png",
      eyebrow: "",
      eyebrowSize: 100,
      fontPresetId: "condensed",
      footnote: "tandra@birdcreekroofing.com",
      footnote2: "",
      headline: "Roof\nDamage?",
      headlineAccentColor: "#D5F6E9",
      headlineColor: "#FFFFFF",
      headlineSize: 108,
      layout: "canva-hero-footer",
      showLogo: true,
      textColor: "#FFFFFF",
    },
    thumbnail: "/ad-templates/thumb-roof-damage.webp",
  },
  {
    helper: "Dark panel left · rain photo right",
    id: "after-the-storm",
    label: "After the storm?",
    preset: {
      accentColor: "#F9A825",
      backgroundColor: "#133C3E",
      body: "I can help!",
      bodySize: 115,
      contentPadding: 100,
      cta: "512-968-3965",
      ctaSize: 100,
      defaultImageName: "Rain on wet surface",
      defaultImageUrl: "/ad-templates/canva-bg-after-storm-rain.jpg",
      eyebrow: "",
      eyebrowSize: 100,
      fontPresetId: "condensed",
      footnote: "tandra@birdcreekroofing.com",
      headline: "After the\nStorm?",
      headlineAccentColor: "#F9A825",
      headlineColor: "#FFFFFF",
      headlineSize: 105,
      layout: "storm-split",
      showLogo: true,
      textColor: "#FFFFFF",
    },
    thumbnail: "/ad-templates/thumb-after-storm.webp",
  },
  {
    helper: "Full-bleed debris · bold stacked headline",
    id: "storm-damage-debris",
    label: "Storm damage",
    preset: {
      accentColor: "#F9A825",
      backgroundColor: "#092A1D",
      body: "I can help!",
      bodySize: 115,
      contentPadding: 95,
      cta: "512-968-3965",
      ctaSize: 102,
      eyebrow: "",
      eyebrowSize: 100,
      fontPresetId: "condensed",
      footnote: "tandra@birdcreekroofing.com",
      headline: "Storm\nDamage",
      headlineAccentColor: "#F9A825",
      headlineColor: "#FFFFFF",
      headlineSize: 112,
      layout: "canva-storm-overlay",
      showLogo: true,
      textColor: "#FFFFFF",
    },
    thumbnail: "/ad-templates/thumb-storm-damage.webp",
  },
  {
    helper: "Gradient panel · orange accent line",
    id: "ask-about-storm",
    label: "Ask me about storm damage",
    preset: {
      accentColor: "#FB6237",
      backgroundColor: "#092A1D",
      body: "",
      bodySize: 100,
      contentPadding: 100,
      cta: "512-968-3965",
      ctaSize: 105,
      defaultImageName: "Canva · neighborhood aerial",
      defaultImageUrl: "/ad-templates/canva-bg-neighborhood.png",
      eyebrow: "",
      eyebrowSize: 100,
      fontPresetId: "condensed",
      footnote: "tandra@birdcreekroofing.com",
      headline: "Ask me about\nStorm damage.",
      headlineAccentColor: "#FB6237",
      headlineColor: "#FFFFFF",
      headlineSize: 100,
      layout: "canva-gradient-panel",
      showLogo: true,
      textColor: "#FFFFFF",
    },
    thumbnail: "/ad-templates/thumb-ask-storm.webp",
  },
  {
    helper: "Intro-video storm split · purple accent",
    id: "texas-roofs-split",
    label: "Texas roofs",
    preset: {
      accentColor: "#12533A",
      backgroundColor: "#000000",
      body: "Hail, heat, wind, and insurance paperwork can turn one bad storm into weeks of second-guessing.",
      bodySize: 100,
      contentPadding: 100,
      cta: "",
      ctaSize: 100,
      eyebrow: "Austin homeowners",
      eyebrowSize: 100,
      fontPresetId: "condensed",
      footnote: "Tandra Peters",
      footnote2: "Birdcreek Roofing",
      headline: "Texas roofs\nTake a\nbeating.",
      headlineAccentColor: "#9C99FF",
      headlineColor: "#FFFFFF",
      headlineSize: 100,
      layout: "storm-split",
      showLogo: false,
      textColor: "#FFFFFF",
    },
    thumbnail: "/ad-templates/thumb-texas-roofs.webp",
  },
] as const;

export const LAYOUT_OPTIONS: readonly {
  id: CreativeLayout;
  label: string;
  helper: string;
}[] = [
  {
    helper: "Full photo · contact strip",
    id: "canva-hero-footer",
    label: "Hero + footer band",
  },
  {
    helper: "Copy left · image right",
    id: "storm-split",
    label: "Storm split",
  },
  {
    helper: "Full bleed · heavy tint",
    id: "canva-storm-overlay",
    label: "Storm overlay",
  },
  {
    helper: "Left fade · photo behind",
    id: "canva-gradient-panel",
    label: "Gradient panel",
  },
  {
    helper: "Copy block · image panel",
    id: "photo-right",
    label: "Photo side",
  },
  { helper: "Photo-led · copy overlay", id: "photo-fill", label: "Full bleed" },
  {
    helper: "Bold message · image badge",
    id: "headline-card",
    label: "Text first",
  },
  {
    helper: "Top photo · crossing headline",
    id: "image-top",
    label: "Image top",
  },
  {
    helper: "Poster · brand band",
    id: "poster-cover",
    label: "Cover headline",
  },
];

export const getAdTemplate = (templateId: string) =>
  AD_TEMPLATES.find((template) => template.id === templateId) ??
  AD_TEMPLATES[0];

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
  options?: { keepImage?: boolean }
) => {
  const keepImage = options?.keepImage ?? false;
  const templateDefaultImage = template.preset.defaultImageUrl
    ? {
        imageFile: null as File | null,
        imageName: template.preset.defaultImageName ?? template.label,
        imageUrl: template.preset.defaultImageUrl,
      }
    : {
        imageFile: null as File | null,
        imageName: null as string | null,
        imageUrl: null as string | null,
      };
  const nextImage =
    keepImage && (current.imageUrl || current.imageFile)
      ? {
          imageFile: current.imageFile,
          imageName: current.imageName,
          imageUrl: current.imageUrl,
        }
      : templateDefaultImage;

  return {
    ...current,
    templateId: template.id,
    ...template.preset,
    ...nextImage,
    bodyLineHeight: current.bodyLineHeight,
    bodyOffset: current.bodyOffset,
    ctaLineHeight: current.ctaLineHeight,
    ctaOffset: current.ctaOffset,
    eyebrowLineHeight: current.eyebrowLineHeight,
    eyebrowOffset: current.eyebrowOffset,
    footnoteLineHeight: current.footnoteLineHeight,
    footnoteOffset: current.footnoteOffset,
    headlineLineHeight: current.headlineLineHeight,
    headlineOffset: current.headlineOffset,
    logoVariant: current.logoVariant,
    showBottomBorder: current.showBottomBorder,
  } as T;
};
