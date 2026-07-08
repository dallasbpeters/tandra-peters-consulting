import { stegaClean } from "@sanity/client/stega";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  ChatBubble,
  Clock,
  Facebook,
  Globe,
  HalfMoon,
  Heart,
  HelpCircle,
  Home,
  Key,
  LightBulb,
  Lock,
  Mail,
  MapPin,
  MediaImage,
  Phone,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Star,
  SubmitDocument,
  SunLight,
  ThumbsUp,
  Trophy,
  Truck,
  Umbrella,
  User,
  Wallet,
  Wifi,
  Wrench,
} from "iconoir-react";
import React from "react";

import { getServiceIconComponent } from "../icons/service-icon-map";
import type { ContactBannerProps } from "../lib/contact-banner-presets";
import { asOptionalRichText, asRichTextValue } from "../portableText/value";
import { theme } from "../theme";
import type {
  AboutProps,
  ArticlesTeaserProps,
  ContactProps,
  ExpertiseProps,
  FaqProps,
  FooterProps,
  HeroProps,
  MissionProps,
  NavItem,
  NavProps,
  RoofInspectionHotspotData,
  RoofInspectionSectionProps,
  ServiceAreaMapProps,
  ServicesProps,
  SocialShareBarProps,
  Stat,
  StatsProps,
  TestimonialsProps,
  VideoProps,
} from "../types";
import type { SanityImageTransform } from "./image-url";
import { sanityImageUrl } from "./image-url";

const SOCIAL_ICONS = {
  email: Mail,
  facebook: Facebook,
  phone: Phone,
} as const;

const SOCIAL_PLATFORM_LABELS: Record<keyof typeof SOCIAL_ICONS, string> = {
  email: "Email me",
  facebook: "Visit my Facebook",
  phone: "Call me",
};

const CONTACT_BANNER_ICONS = {
  arrowRight: ArrowRight,
  arrowUpRight: ArrowUpRight,
  calculator: Calculator,
  checkCircle: ShieldCheck,
  clock: Clock,
  documentText: SubmitDocument,
  globe: Globe,
  heart: Heart,
  helpCircle: HelpCircle,
  home: Home,
  image: MediaImage,
  key: Key,
  lightbulb: LightBulb,
  lock: Lock,
  mapPin: MapPin,
  message: ChatBubble,
  moon: HalfMoon,
  phone: Phone,
  search: Search,
  settings: Settings,
  shield: Shield,
  star: Star,
  sun: SunLight,
  thumbsUp: ThumbsUp,
  trophy: Trophy,
  truck: Truck,
  umbrella: Umbrella,
  user: User,
  wallet: Wallet,
  wifi: Wifi,
  wrench: Wrench,
} as const;

type SanityDoc = Record<string, unknown> | null | undefined;

const toSanityImage = (
  url: unknown,
  params?: SanityImageTransform
): string | undefined => {
  if (typeof url !== "string" || !url.trim()) {
    return;
  }
  return sanityImageUrl(stegaClean(url).trim(), params);
};

/** Shown when a required rich-text field is empty or unreadable (avoids dropping cards/rows). */
const RICH_TEXT_PLACEHOLDER =
  "This field is empty or could not be loaded. Add copy in Sanity Studio.";

export const mapHeroProps = (hero: SanityDoc): Partial<HeroProps> => {
  if (!hero) {
    return {};
  }
  const title =
    hero.titleLine1 || hero.titleLine2 ? (
      <>
        {hero.titleLine1 as React.ReactNode}
        <br />
        <span style={{ color: theme.colors.heroAccent }}>
          {hero.titleLine2 as React.ReactNode}
        </span>
      </>
    ) : undefined;

  const out: Partial<HeroProps> = {};
  if (hero.badge) {
    out.badgeText = hero.badge as string;
  }
  if (title) {
    out.title = title;
  }
  // Raw strings so hero variants can apply their own heading styles
  if (hero.titleLine1) {
    out.titleLine1 = String(hero.titleLine1);
  }
  if (hero.titleLine2) {
    out.titleLine2 = String(hero.titleLine2);
  }
  const subtitle = asOptionalRichText(hero.subtitle);
  if (subtitle) {
    out.subtitle = subtitle;
  }
  if (hero.ctaText) {
    out.ctaText = hero.ctaText as string;
  }
  if (hero.ctaHref) {
    out.ctaHref = hero.ctaHref as string;
  }
  if (hero.secondaryCtaText) {
    out.secondaryCtaText = hero.secondaryCtaText as string;
  }
  if (hero.secondaryCtaHref) {
    out.secondaryCtaHref = hero.secondaryCtaHref as string;
  }
  if (hero.backgroundImage) {
    out.backgroundImage = toSanityImage(hero.backgroundImage);
  }
  if (hero.heroStyle) {
    out.heroStyle = hero.heroStyle as HeroProps["heroStyle"];
  }
  if (hero.skyImage) {
    out.skyImage = toSanityImage(hero.skyImage);
  }
  if (hero.foregroundImage) {
    out.foregroundImage = toSanityImage(hero.foregroundImage);
  }
  return out;
};

export const mapVideoProps = (
  video: SanityDoc,
  options?: { renderedVideoUrl?: string }
): Partial<VideoProps> => {
  const renderedVideoUrl =
    typeof options?.renderedVideoUrl === "string" &&
    options.renderedVideoUrl.trim()
      ? options.renderedVideoUrl.trim()
      : undefined;

  if (!(video || renderedVideoUrl)) {
    return {};
  }
  if (typeof video === "string") {
    return { videoUrl: renderedVideoUrl ?? video };
  }
  let uploadedVideoUrl: string | undefined;
  if (typeof video?.video === "string") {
    uploadedVideoUrl = video.video;
  } else if (
    typeof (video?.video as { asset?: { url?: unknown } } | undefined)?.asset
      ?.url === "string"
  ) {
    uploadedVideoUrl = (video?.video as { asset: { url: string } }).asset.url;
  }
  let rawPosterUrl: string | undefined;
  if (typeof video?.posterUrl === "string") {
    rawPosterUrl = video.posterUrl;
  } else if (
    typeof (video?.posterUrl as { asset?: { url?: unknown } } | undefined)
      ?.asset?.url === "string"
  ) {
    rawPosterUrl = (video?.posterUrl as { asset: { url: string } }).asset.url;
  }
  const posterUrl = toSanityImage(rawPosterUrl);
  return {
    posterUrl,
    title: typeof video?.title === "string" ? video.title : undefined,
    videoUrl: renderedVideoUrl ?? uploadedVideoUrl,
  };
};

export const mapBirdcreekVideoBannerProps = (
  data: SanityDoc
): Partial<{ vimeoUrl: string; title: string }> => {
  if (!data) {
    return {};
  }

  let rawVimeoUrl: string | undefined;
  if (typeof data.birdcreekVimeoUrl === "string") {
    rawVimeoUrl = data.birdcreekVimeoUrl;
  } else if (typeof data.vimeoUrl === "string") {
    rawVimeoUrl = data.vimeoUrl;
  }

  let rawTitle: string | undefined;
  if (typeof data.birdcreekVideoTitle === "string") {
    rawTitle = data.birdcreekVideoTitle;
  } else if (typeof data.title === "string") {
    rawTitle = data.title;
  }

  const vimeoUrl =
    typeof rawVimeoUrl === "string" ? stegaClean(rawVimeoUrl).trim() : "";
  const title = typeof rawTitle === "string" ? stegaClean(rawTitle).trim() : "";

  return {
    ...(vimeoUrl ? { vimeoUrl } : {}),
    ...(title ? { title } : {}),
  };
};

export const mapContactBannerProps = (
  data: SanityDoc
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
): Partial<ContactBannerProps> => {
  if (!data) {
    return {};
  }

  const pick = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim() ? value.trim() : undefined;

  return {
    ...(pick(data.eyebrow) ? { eyebrow: pick(data.eyebrow) } : {}),
    ...(pick(data.headline) ? { headline: pick(data.headline) } : {}),
    ...(pick(data.phoneLabel) ? { phoneLabel: pick(data.phoneLabel) } : {}),
    ...(pick(data.phoneDisplay)
      ? { phoneDisplay: pick(data.phoneDisplay) }
      : {}),
    ...(pick(data.phoneTel) ? { phoneTel: pick(data.phoneTel) } : {}),
    ...(pick(data.phoneHref) ? { phoneHref: pick(data.phoneHref) } : {}),
    ...(pick(data.phoneAriaLabel)
      ? { phoneAriaLabel: pick(data.phoneAriaLabel) }
      : {}),
    ...(pick(data.ariaLabel) ? { ariaLabel: pick(data.ariaLabel) } : {}),
    ...(pick(data.backgroundColor)
      ? { backgroundColor: pick(data.backgroundColor) }
      : {}),
    ...(pick(data.textColor) ? { textColor: pick(data.textColor) } : {}),
    ...(pick(data.eyebrowColor)
      ? { eyebrowColor: pick(data.eyebrowColor) }
      : {}),
    ...(pick(data.eyebrowColorLight)
      ? { eyebrowColorLight: pick(data.eyebrowColorLight) }
      : {}),
    ...(pick(data.accentGlowColor)
      ? { accentGlowColor: pick(data.accentGlowColor) }
      : {}),
    ...(pick(data.iconColor) ? { iconColor: pick(data.iconColor) } : {}),
    ...(pick(data.iconColorLight)
      ? { iconColorLight: pick(data.iconColorLight) }
      : {}),
    ...(pick(data.iconColorDark)
      ? { iconColorDark: pick(data.iconColorDark) }
      : {}),
    ...(pick(data.iconColorVeryDark)
      ? { iconColorVeryDark: pick(data.iconColorVeryDark) }
      : {}),
    ...(pick(data.phoneLinkBackground)
      ? { phoneLinkBackground: pick(data.phoneLinkBackground) }
      : {}),
    ...(pick(data.phoneLinkHoverBackground)
      ? { phoneLinkHoverBackground: pick(data.phoneLinkHoverBackground) }
      : {}),
    ...(pick(data.phoneLinkHoverShadow)
      ? { phoneLinkHoverShadow: pick(data.phoneLinkHoverShadow) }
      : {}),
    ...(pick(data.phoneLinkHoverOutline)
      ? { phoneLinkHoverOutline: pick(data.phoneLinkHoverOutline) }
      : {}),
    ...(pick(data.phoneLinkHoverTextColor)
      ? { phoneLinkHoverTextColor: pick(data.phoneLinkHoverTextColor) }
      : {}),
    ...(pick(data.phoneLinkHoverLabelColor)
      ? { phoneLinkHoverLabelColor: pick(data.phoneLinkHoverLabelColor) }
      : {}),
    ...(pick(data.phoneIconBackground)
      ? { phoneIconBackground: pick(data.phoneIconBackground) }
      : {}),
    ...(pick(data.phoneIconHoverBackground)
      ? { phoneIconHoverBackground: pick(data.phoneIconHoverBackground) }
      : {}),
    ...(pick(data.pulseColor) ? { pulseColor: pick(data.pulseColor) } : {}),
    ...(pick(data.pulsePingColor)
      ? { pulsePingColor: pick(data.pulsePingColor) }
      : {}),
    ...(pick(data.gridColor) ? { gridColor: pick(data.gridColor) } : {}),
    ...(() => {
      const iconData = data.ctaIcon;
      // Handle new iconPicker format: { provider, name }
      if (iconData && typeof iconData === "object" && "name" in iconData) {
        const iconName = String(iconData.name);
        // Map common icon names to our iconoir icons
        const iconMap: Record<string, keyof typeof CONTACT_BANNER_ICONS> = {
          "arrow-right": "arrowRight",
          "arrow-right-solid": "arrowRight",
          "arrow-up-right": "arrowUpRight",
          "arrow-up-right-solid": "arrowUpRight",
          calculator: "calculator",
          "chat-bubble": "message",
          "chat-bubble-left-right-solid": "message",
          "check-circle-solid": "checkCircle",
          clock: "clock",
          "clock-solid": "clock",
          "cog-6-tooth-solid": "settings",
          "document-text-solid": "documentText",
          "fa-arrow-right": "arrowRight",
          "fa-calculator": "calculator",
          "fa-check-circle": "checkCircle",
          "fa-clock": "clock",
          "fa-cog": "settings",
          "fa-comment": "message",
          "fa-external-link-alt": "arrowUpRight",
          "fa-file-alt": "documentText",
          "fa-globe": "globe",
          "fa-heart": "heart",
          "fa-home": "home",
          "fa-image": "image",
          "fa-key": "key",
          "fa-lightbulb": "lightbulb",
          "fa-lock": "lock",
          "fa-map-marker": "mapPin",
          "fa-moon": "moon",
          // Font Awesome names (with fa prefix)
          "fa-phone": "phone",
          "fa-question-circle": "helpCircle",
          "fa-search": "search",
          "fa-shield": "shield",
          "fa-star": "star",
          "fa-sun": "sun",
          "fa-thumbs-up": "thumbsUp",
          "fa-trophy": "trophy",
          "fa-truck": "truck",
          "fa-umbrella": "umbrella",
          "fa-user": "user",
          "fa-wallet": "wallet",
          "fa-wifi": "wifi",
          "fa-wrench": "wrench",
          globe: "globe",
          "globe-alt-solid": "globe",
          "half-moon": "moon",
          heart: "heart",
          "heart-solid": "heart",
          "help-circle": "helpCircle",
          home: "home",
          // Hero Icons names
          "home-solid": "home",
          key: "key",
          "key-solid": "key",
          "light-bulb": "lightbulb",
          "light-bulb-solid": "lightbulb",
          lock: "lock",
          "lock-closed-solid": "lock",
          "magnifying-glass-solid": "search",
          "map-pin": "mapPin",
          "map-pin-solid": "mapPin",
          "mdi-account": "user",
          "mdi-arrow-right": "arrowRight",
          "mdi-calculator": "calculator",
          "mdi-checkbox-marked-circle": "checkCircle",
          "mdi-clock": "clock",
          "mdi-cog": "settings",
          "mdi-earth": "globe",
          "mdi-file-document": "documentText",
          "mdi-heart": "heart",
          "mdi-help-circle": "helpCircle",
          "mdi-home": "home",
          "mdi-image": "image",
          "mdi-key": "key",
          "mdi-lightbulb": "lightbulb",
          "mdi-lock": "lock",
          "mdi-magnify": "search",
          "mdi-map-marker": "mapPin",
          "mdi-message": "message",
          "mdi-open-in-new": "arrowUpRight",
          // Material Design Icons
          "mdi-phone": "phone",
          "mdi-shield": "shield",
          "mdi-star": "star",
          "mdi-thumb-up": "thumbsUp",
          "mdi-trophy": "trophy",
          "mdi-truck": "truck",
          "mdi-umbrella": "umbrella",
          "mdi-wallet": "wallet",
          "mdi-weather-night": "moon",
          "mdi-weather-sunny": "sun",
          "mdi-wifi": "wifi",

          "mdi-wrench": "wrench",
          "media-image": "image",
          "moon-solid": "moon",
          // Iconoir names (most will match directly)
          phone: "phone",
          "photo-solid": "image",
          search: "search",
          settings: "settings",
          shield: "shield",
          "shield-check": "checkCircle",
          "shield-check-solid": "shield",
          star: "star",
          "star-solid": "star",
          "submit-document": "documentText",
          "sun-light": "sun",
          "sun-solid": "sun",
          "thumb-up-solid": "thumbsUp",
          "thumbs-up": "thumbsUp",
          trophy: "trophy",
          "trophy-solid": "trophy",
          truck: "truck",
          "truck-solid": "truck",
          umbrella: "umbrella",
          user: "user",
          "user-solid": "user",
          wallet: "wallet",
          wifi: "wifi",
          wrench: "wrench",
          "wrench-screwdriver-solid": "wrench",
        };
        const normalizedName = iconName.toLowerCase().replaceAll("_", "-");
        const mappedKey = iconMap[normalizedName] ?? iconMap[iconName];
        if (mappedKey && mappedKey in CONTACT_BANNER_ICONS) {
          return { ctaIcon: CONTACT_BANNER_ICONS[mappedKey] };
        }
        // Keyword fallback: match by substring against known icon keys
        const matchedKey = Object.keys(CONTACT_BANNER_ICONS).find((k) =>
          normalizedName.includes(k.toLowerCase())
        );
        if (matchedKey) {
          return {
            ctaIcon:
              CONTACT_BANNER_ICONS[
                matchedKey as keyof typeof CONTACT_BANNER_ICONS
              ],
          };
        }
      }
      // Legacy string format fallback
      if (
        typeof iconData === "string" &&
        iconData.trim() &&
        iconData in CONTACT_BANNER_ICONS
      ) {
        return {
          ctaIcon:
            CONTACT_BANNER_ICONS[iconData as keyof typeof CONTACT_BANNER_ICONS],
        };
      }
      return {};
    })(),
  };
};

export const mapAboutProps = (about: SanityDoc): Partial<AboutProps> => {
  if (!about) {
    return {};
  }
  const title =
    about.titleLine1 || about.titleLine2 ? (
      <>
        {about.titleLine1}
        <br />
        {about.titleLine2}
      </>
    ) : undefined;

  const body = asRichTextValue(about.body, about.paragraphs);

  return {
    ...(about.badgeText ? { badgeText: about.badgeText as string } : {}),
    ...(about.badgeSubtext
      ? { badgeSubtext: about.badgeSubtext as string }
      : {}),
    ...(about.image ? { imageSrc: toSanityImage(about.image) } : {}),
    ...(title ? { title } : {}),
    ...(body ? { body } : {}),
  };
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
export const mapServicesProps = (svc: SanityDoc): Partial<ServicesProps> => {
  if (!svc) {
    return {};
  }
  const titleLines = svc.titleLines as string[] | undefined;
  const title =
    titleLines && titleLines.length > 0
      ? titleLines.map((line: string, i: number) => (
          <React.Fragment key={line}>
            {line}
            {i < titleLines.length - 1 ? <br /> : null}
          </React.Fragment>
        ))
      : undefined;

  const services = (
    svc.services as
      | {
          id: string;
          title: string;
          description?: unknown;
          icon?: string;
          image?: string;
        }[]
      | undefined
  )?.map(
    (row: {
      id: string;
      title: string;
      description?: unknown;
      icon?: string;
      image?: string;
    }) => {
      const Icon = getServiceIconComponent(row.icon);
      const description =
        asOptionalRichText(row.description) ?? RICH_TEXT_PLACEHOLDER;
      return {
        description,
        icon: Icon,
        id: row.id,
        title: row.title,
        ...(row.image ? { image: toSanityImage(row.image) } : {}),
      };
    }
  );

  const sectionDescription = asOptionalRichText(svc.description);

  // Build birdcreekAdvantage from any available Sanity fields, falling back to
  // defaults per-field. This ensures stega metadata always reaches the component
  // so Presentation overlays appear even when only some fields are populated.
  const rawBca = svc.birdcreekAdvantage as
    | Record<string, unknown>
    | null
    | undefined;
  const birdcreekAdvantage = rawBca
    ? {
        ctaHref:
          typeof rawBca.ctaHref === "string" && rawBca.ctaHref
            ? rawBca.ctaHref
            : "https://birdcreekroofing.com",
        ctaLabel:
          typeof rawBca.ctaLabel === "string" && rawBca.ctaLabel
            ? rawBca.ctaLabel
            : "Learn More",
        description:
          asOptionalRichText(rawBca.description) ??
          "Direct access to Austin's premier roofing company, combining Tandra's consultation with Birdcreek's legendary execution.",
        title:
          typeof rawBca.title === "string" && rawBca.title
            ? rawBca.title
            : "The Birdcreek Advantage",
      }
    : undefined;

  const servicesStyle =
    typeof svc.servicesStyle === "string" && svc.servicesStyle
      ? (svc.servicesStyle as ServicesProps["servicesStyle"])
      : undefined;

  const rawTypographicArt = svc.typographicArt as
    | Record<string, unknown>
    | null
    | undefined;
  const typographicArt = rawTypographicArt
    ? {
        ...(rawTypographicArt.baseMaskImage
          ? { baseMaskImage: toSanityImage(rawTypographicArt.baseMaskImage) }
          : {}),
        ...(rawTypographicArt.overlayMaskImage
          ? {
              overlayMaskImage: toSanityImage(
                rawTypographicArt.overlayMaskImage
              ),
            }
          : {}),
      }
    : undefined;
  const hasTypographicArt =
    typographicArt &&
    (typographicArt.baseMaskImage !== undefined ||
      typographicArt.overlayMaskImage !== undefined);

  return {
    ...(svc.tagline ? { tagline: svc.tagline as string } : {}),
    ...(title ? { title } : {}),
    ...(sectionDescription ? { description: sectionDescription } : {}),
    ...(services && services.length > 0 ? { services } : {}),
    ...(birdcreekAdvantage ? { birdcreekAdvantage } : {}),
    ...(servicesStyle ? { servicesStyle } : {}),
    ...(hasTypographicArt ? { typographicArt } : {}),
  };
};

export const mapStatsProps = (stats: SanityDoc): Partial<StatsProps> => {
  if (!stats) {
    return {};
  }
  const rows = stats.items as
    | { name?: string; value?: string; icon?: string }[]
    | undefined;
  const items =
    rows
      ?.map(
        (row: {
          _key?: string;
          name?: string;
          value?: string | number;
          icon?: string;
        }) => {
          const name = typeof row.name === "string" ? row.name.trim() : "";
          const valueRaw = row.value;
          let value: string;
          if (typeof valueRaw === "number" && Number.isFinite(valueRaw)) {
            value = String(valueRaw);
          } else if (typeof valueRaw === "string") {
            value = valueRaw.trim();
          } else {
            value = "";
          }
          if (!(name && value)) {
            return null;
          }
          return {
            ...(typeof row._key === "string" && row._key
              ? { rowKey: row._key }
              : {}),
            icon: getServiceIconComponent(row.icon),
            name,
            value,
          };
        }
      )
      .filter((row): row is Stat => row !== null) ?? [];
  return {
    ...(typeof stats.title === "string" && stats.title.trim()
      ? { title: stats.title.trim() }
      : {}),
    ...(items.length > 0 ? { items } : {}),
  };
};

export const mapMissionProps = (m: SanityDoc): Partial<MissionProps> => {
  if (!m) {
    return {};
  }
  const values = (
    m.values as
      | { id: string; title: string; description?: unknown; image?: string }[]
      | undefined
  )?.map(
    (row: {
      id: string;
      title: string;
      description?: unknown;
      image?: string;
    }) => {
      const description =
        asOptionalRichText(row.description) ?? RICH_TEXT_PLACEHOLDER;
      return {
        description,
        id: row.id,
        title: row.title,
        ...(row.image ? { image: toSanityImage(row.image) } : {}),
      };
    }
  );

  const missionTitle = asOptionalRichText(m.title);
  const missionDescription = asOptionalRichText(m.description);

  return {
    ...(m.tagline ? { tagline: m.tagline as string } : {}),
    ...(missionTitle ? { title: missionTitle } : {}),
    ...(missionDescription ? { description: missionDescription } : {}),
    ...(values && values.length > 0 ? { services: values } : {}),
  };
};

export const mapExpertiseProps = (e: SanityDoc): Partial<ExpertiseProps> => {
  if (!e) {
    return {};
  }
  const items = (
    e.items as
      | { id: string; title: string; desc?: unknown; image?: string }[]
      | undefined
  )?.map(
    (row: { id: string; title: string; desc?: unknown; image?: string }) => {
      const desc = asOptionalRichText(row.desc) ?? RICH_TEXT_PLACEHOLDER;
      return {
        desc,
        id: row.id,
        title: row.title,
        ...(row.image ? { image: toSanityImage(row.image) } : {}),
      };
    }
  );

  return {
    ...(e.tagline ? { tagline: e.tagline as string } : {}),
    ...(e.title ? { title: e.title as string } : {}),
    ...(items && items.length > 0 ? { items } : {}),
  };
};

export const mapFaqProps = (f: SanityDoc): Partial<FaqProps> => {
  if (!f) {
    return {};
  }
  const items = (
    f.items as
      | { _key?: string; question?: string; answer?: unknown }[]
      | undefined
  )
    ?.map((row: { _key?: string; question?: string; answer?: unknown }) => {
      const question =
        typeof row.question === "string" ? row.question.trim() : "";
      if (!question) {
        return null;
      }
      const answer = asOptionalRichText(row.answer) ?? RICH_TEXT_PLACEHOLDER;
      return {
        ...(typeof row._key === "string" && row._key.trim()
          ? { _key: row._key }
          : {}),
        answer,
        question,
      };
    })
    .filter(Boolean);

  const intro = asOptionalRichText(f.intro);

  return {
    ...(f.tagline ? { tagline: f.tagline as string } : {}),
    ...(f.title ? { title: f.title as string } : {}),
    ...(intro ? { intro } : {}),
    ...(items && items.length > 0 ? { items } : {}),
  };
};

export const mapContactProps = (c: SanityDoc): Partial<ContactProps> => {
  if (!c) {
    return {};
  }
  return {
    ...(c.tagline ? { tagline: c.tagline as string } : {}),
    ...(c.title ? { title: c.title as string } : {}),
    ...(c.email ? { email: c.email as string } : {}),
    ...(c.phone ? { phone: c.phone as string } : {}),
    ...(c.location ? { location: c.location as string } : {}),
  };
};

export const mapSocialShareProps = (
  s: SanityDoc
): Partial<SocialShareBarProps> => {
  if (!s) {
    return {};
  }
  const shareText = asOptionalRichText(s.shareText);

  return {
    ...(s.heading ? { heading: s.heading as string } : {}),
    ...(shareText ? { shareText } : {}),
  };
};

export const mapArticlesTeaserEditorialProps = (
  s: SanityDoc
): Partial<Omit<ArticlesTeaserProps, "posts">> => {
  if (!s) {
    return {};
  }
  const intro = asOptionalRichText(s.intro);

  return {
    ...(typeof s.eyebrow === "string" && s.eyebrow.trim()
      ? { eyebrow: s.eyebrow.trim() }
      : {}),
    ...(typeof s.title === "string" && s.title.trim()
      ? { title: s.title.trim() }
      : {}),
    ...(intro ? { intro } : {}),
    ...(typeof s.viewAllLabel === "string" && s.viewAllLabel.trim()
      ? { viewAllLabel: s.viewAllLabel.trim() }
      : {}),
  };
};

export const mapNavProps = (site: SanityDoc): Partial<NavProps> => {
  if (!site) {
    return {};
  }

  // Explicitly access each property so the stega proxy resolves and encodes
  // edit-path metadata into the string values before they reach React.
  const navItemsRaw: NavItem[] | undefined = Array.isArray(site.navItems)
    ? site.navItems.map((l: { name: string; href: string }) => ({
        href: l.href,
        name: l.name,
      }))
    : undefined;

  return {
    ...(site.navLogoText ? { logoText: site.navLogoText as string } : {}),
    ...(site.navLogoTagline
      ? { logoTagline: site.navLogoTagline as string }
      : {}),
    ...(site.navLogoImage
      ? { imageSrc: toSanityImage(site.navLogoImage) }
      : {}),
    ...(navItemsRaw?.length ? { navItems: navItemsRaw } : {}),
    ...(site.navCtaText ? { ctaText: site.navCtaText as string } : {}),
    ...(site.navCtaHref ? { ctaHref: site.navCtaHref as string } : {}),
    ...(site.navSecondaryCtaText
      ? { secondaryCtaText: site.navSecondaryCtaText as string }
      : {}),
    ...(site.navSecondaryCtaHref
      ? { secondaryCtaHref: site.navSecondaryCtaHref as string }
      : {}),
  };
};

export const mapFooterProps = (site: SanityDoc): Partial<FooterProps> => {
  if (!site) {
    return {};
  }
  const socialLinks = (
    site.footerSocialLinks as
      | { platform: keyof typeof SOCIAL_ICONS; url: string }[]
      | undefined
  )
    ?.map((l: { platform: keyof typeof SOCIAL_ICONS; url: string }) => {
      const Icon = SOCIAL_ICONS[l.platform];
      if (!Icon) {
        return null;
      }
      return {
        href: l.url,
        icon: Icon,
        platform: SOCIAL_PLATFORM_LABELS[l.platform],
      };
    })
    .filter(Boolean) as FooterProps["socialLinks"];

  const quickLinksRaw: NavItem[] | undefined = Array.isArray(
    site.footerQuickLinks
  )
    ? site.footerQuickLinks.map((l: { name: string; href: string }) => ({
        href: l.href,
        name: l.name,
      }))
    : undefined;
  const legalLinks: NavItem[] | undefined = Array.isArray(site.footerLegalLinks)
    ? site.footerLegalLinks.map((l: { name: string; href: string }) => ({
        href: l.href,
        name: l.name,
      }))
    : undefined;

  const footerDescription = asOptionalRichText(site.footerDescription);

  return {
    ...(site.footerLogoText ? { logoText: site.footerLogoText as string } : {}),
    ...(footerDescription ? { description: footerDescription } : {}),
    ...(socialLinks?.length ? { socialLinks } : {}),
    ...(quickLinksRaw?.length ? { quickLinks: quickLinksRaw } : {}),
    ...(legalLinks?.length ? { legalLinks } : {}),
    ...(site.footerCopyrightText
      ? { copyrightText: site.footerCopyrightText as string }
      : {}),
    ...(site.footerPartnerText
      ? { partnerText: site.footerPartnerText as string }
      : {}),
  };
};

export const mapTestimonialsProps = (
  t: SanityDoc
): Partial<TestimonialsProps> => {
  if (!t) {
    return {};
  }
  const out: Partial<TestimonialsProps> = {};
  if ((t.elfsightWidgetId as string | undefined)?.trim()) {
    out.elfsightWidgetId = (t.elfsightWidgetId as string).trim();
  }
  const emptyStateNote = asOptionalRichText(t.emptyStateNote);
  if (emptyStateNote) {
    out.emptyStateNote = emptyStateNote;
  }
  return out;
};

const VALID_DIRECTIONS = new Set(["top", "right", "left", "bottom"]);
type RawHotspot = Record<string, unknown>;
const isRawHotspot = (value: unknown): value is RawHotspot =>
  typeof value === "object" && value !== null;

const toFiniteNumber = (value: unknown): number | undefined => {
  const cleaned =
    typeof value === "string" || typeof value === "number"
      ? stegaClean(value)
      : value;

  if (typeof cleaned === "number" && Number.isFinite(cleaned)) {
    return cleaned;
  }
  if (typeof cleaned === "string" && cleaned.trim()) {
    const parsed = Number(cleaned.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return;
};

export const mapRoofInspectionProps = (
  data: SanityDoc
): Partial<RoofInspectionSectionProps> => {
  if (!data) {
    return {};
  }

  const out: Partial<RoofInspectionSectionProps> = {};

  if (typeof data.kicker === "string" && data.kicker.trim()) {
    out.kicker = stegaClean(data.kicker).trim();
  }
  if (typeof data.titleLine1 === "string" && data.titleLine1.trim()) {
    out.titleLine1 = stegaClean(data.titleLine1).trim();
  }
  if (typeof data.titleLine2 === "string" && data.titleLine2.trim()) {
    out.titleLine2 = stegaClean(data.titleLine2).trim();
  }
  if (typeof data.subtitle === "string" && data.subtitle.trim()) {
    out.subtitle = stegaClean(data.subtitle).trim();
  }
  if (typeof data.lede === "string" && data.lede.trim()) {
    out.lede = stegaClean(data.lede).trim();
  }

  // Diagram image — Sanity image asset URL
  const img = data.diagramImage as
    | { asset?: { url?: unknown; _ref?: unknown } }
    | undefined;
  if (img?.asset?.url && typeof img.asset.url === "string") {
    out.diagramImageUrl = toSanityImage(img.asset.url);
  } else if (img?.asset?._ref && typeof img.asset._ref === "string") {
    // Fallback: let the component handle missing URL gracefully
    out.diagramImageUrl = undefined;
  }

  // Hotspot array — only include entries that pass validation
  if (Array.isArray(data.hotspots) && data.hotspots.length > 0) {
    const mapped: RoofInspectionHotspotData[] = data.hotspots
      .filter(
        (h): h is RawHotspot =>
          isRawHotspot(h) &&
          typeof h.label === "string" &&
          typeof h.direction === "string" &&
          VALID_DIRECTIONS.has(stegaClean(h.direction)) &&
          typeof h.calloutTitle === "string" &&
          typeof h.calloutBody === "string" &&
          typeof h.watchFor === "string"
      )
      .map(
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
        (h): RoofInspectionHotspotData => ({
          ...(typeof h._key === "string" ? { _key: h._key } : {}),
          calloutBody: stegaClean(h.calloutBody as string).trim(),
          calloutTitle: stegaClean(h.calloutTitle as string).trim(),
          direction: stegaClean(
            h.direction as string
          ) as RoofInspectionHotspotData["direction"],
          label: stegaClean(h.label as string).trim(),
          watchFor: stegaClean(h.watchFor as string).trim(),
          ...(toFiniteNumber(h.pos3dX) === undefined
            ? {}
            : { pos3dX: toFiniteNumber(h.pos3dX) }),
          ...(toFiniteNumber(h.pos3dY) === undefined
            ? {}
            : { pos3dY: toFiniteNumber(h.pos3dY) }),
          ...(toFiniteNumber(h.pos3dZ) === undefined
            ? {}
            : { pos3dZ: toFiniteNumber(h.pos3dZ) }),
          ...(toFiniteNumber(h.norm3dX) === undefined
            ? {}
            : { norm3dX: toFiniteNumber(h.norm3dX) }),
          ...(toFiniteNumber(h.norm3dY) === undefined
            ? {}
            : { norm3dY: toFiniteNumber(h.norm3dY) }),
          ...(toFiniteNumber(h.norm3dZ) === undefined
            ? {}
            : { norm3dZ: toFiniteNumber(h.norm3dZ) }),
        })
      );

    if (mapped.length > 0) {
      out.hotspots = mapped;
    }
  }

  return out;
};

/** Merge dedicated /roof-inspections CMS data with homePage.roofInspection fallback. */
export const resolveRoofInspectionProps = (
  pageSection?: SanityDoc,
  homeSection?: SanityDoc
): Partial<RoofInspectionSectionProps> => {
  const pageProps = mapRoofInspectionProps(pageSection ?? {});
  const homeProps = mapRoofInspectionProps(homeSection ?? {});
  const hotspots = pageProps.hotspots?.length
    ? pageProps.hotspots
    : homeProps.hotspots;

  return {
    ...homeProps,
    ...pageProps,
    ...(hotspots ? { hotspots } : {}),
  };
};

export const mapServiceAreaMapProps = (
  data: SanityDoc
): Partial<ServiceAreaMapProps> => {
  if (!data) {
    return {};
  }

  const out: Partial<ServiceAreaMapProps> = {};

  if (typeof data.eyebrow === "string" && data.eyebrow.trim()) {
    out.eyebrow = data.eyebrow.trim();
  }
  if (typeof data.title === "string" && data.title.trim()) {
    out.title = data.title.trim();
  }
  if (typeof data.description === "string" && data.description.trim()) {
    out.description = data.description.trim();
  }
  if (Array.isArray(data.areas) && data.areas.length > 0) {
    out.areas = data.areas
      .filter(
        (a: Record<string, unknown>) =>
          typeof a.countyKey === "string" &&
          a.countyKey.trim() &&
          typeof a.clientCount === "number"
      )
      .map((a: Record<string, unknown>) => {
        const key = stegaClean(a.countyKey as string).trim();
        const name =
          typeof a.displayName === "string" && a.displayName.trim()
            ? stegaClean(a.displayName as string).trim()
            : key;
        return {
          clientCount: a.clientCount as number,
          countyKey: key,
          displayName: name,
        };
      });
  }

  return out;
};
