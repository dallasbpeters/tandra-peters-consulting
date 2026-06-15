import { stegaClean } from "@sanity/client/stega";
import {
  Calculator,
  Facebook,
  HelpCircle,
  Mail,
  Phone,
  Home,
  ArrowRight,
  Search,
  Settings,
  Shield,
  Star,
  Truck,
  User,
  Wrench,
  MapPin,
  SubmitDocument,
  MediaImage,
  ChatBubble,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Globe,
  Heart,
  Key,
  LightBulb,
  Lock,
  HalfMoon,
  SunLight,
  ThumbsUp,
  Trophy,
  Umbrella,
  Wallet,
  Wifi,
} from "iconoir-react";
import React from "react";

import type { ContactBannerProps } from "../lib/contactBannerPresets";
import type { HeroProps } from "../types";
import type { VideoProps } from "../types";
import type { AboutProps } from "../types";
import type { ServicesProps } from "../types";
import type { MissionProps } from "../types";
import type { ExpertiseProps } from "../types";
import type { Stat, StatsProps } from "../types";
import type { FaqProps } from "../types";
import type { ContactProps } from "../types";
import type { SocialShareBarProps } from "../types";
import type { ArticlesTeaserProps } from "../types";
import type { NavItem, NavProps } from "../types";
import type { FooterProps } from "../types";
import type { TestimonialsProps } from "../types";
import type { ServiceAreaMapProps } from "../types";
import type { RoofInspectionSectionProps, RoofInspectionHotspotData } from "../types";

import { getServiceIconComponent } from "../icons/serviceIconMap";
import { asOptionalRichText, asRichTextValue } from "../portableText/value";
import { theme } from "../theme";
import { sanityImageUrl, type SanityImageTransform } from "./imageUrl";

const SOCIAL_ICONS = {
  facebook: Facebook,
  email: Mail,
  phone: Phone,
} as const;

const SOCIAL_PLATFORM_LABELS: Record<keyof typeof SOCIAL_ICONS, string> = {
  facebook: "Visit my Facebook",
  email: "Email me",
  phone: "Call me",
};

const CONTACT_BANNER_ICONS = {
  phone: Phone,
  calculator: Calculator,
  helpCircle: HelpCircle,
  home: Home,
  arrowRight: ArrowRight,
  search: Search,
  settings: Settings,
  shield: Shield,
  star: Star,
  truck: Truck,
  user: User,
  wrench: Wrench,
  mapPin: MapPin,
  documentText: SubmitDocument,
  image: MediaImage,
  message: ChatBubble,
  arrowUpRight: ArrowUpRight,
  checkCircle: ShieldCheck,
  clock: Clock,
  globe: Globe,
  heart: Heart,
  key: Key,
  lightbulb: LightBulb,
  lock: Lock,
  moon: HalfMoon,
  sun: SunLight,
  thumbsUp: ThumbsUp,
  trophy: Trophy,
  umbrella: Umbrella,
  wallet: Wallet,
  wifi: Wifi,
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityDoc = Record<string, any> | null | undefined;

const toSanityImage = (url: unknown, params?: SanityImageTransform): string | undefined => {
  if (typeof url !== "string" || !url.trim()) {
    return undefined;
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
        {hero.titleLine1}
        <br />
        <span style={{ color: theme.colors.heroAccent }}>{hero.titleLine2}</span>
      </>
    ) : undefined;

  const out: Partial<HeroProps> = {};
  if (hero.badge) {
    out.badgeText = hero.badge;
  }
  if (title) {
    out.title = title;
  }
  // Raw strings so hero variants can apply their own heading styles
  if (hero.titleLine1) out.titleLine1 = String(hero.titleLine1);
  if (hero.titleLine2) out.titleLine2 = String(hero.titleLine2);
  const subtitle = asOptionalRichText(hero.subtitle);
  if (subtitle) {
    out.subtitle = subtitle;
  }
  if (hero.ctaText) {
    out.ctaText = hero.ctaText;
  }
  if (hero.ctaHref) {
    out.ctaHref = hero.ctaHref;
  }
  if (hero.secondaryCtaText) {
    out.secondaryCtaText = hero.secondaryCtaText;
  }
  if (hero.secondaryCtaHref) {
    out.secondaryCtaHref = hero.secondaryCtaHref;
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
  options?: { renderedVideoUrl?: string },
): Partial<VideoProps> => {
  const renderedVideoUrl =
    typeof options?.renderedVideoUrl === "string" && options.renderedVideoUrl.trim()
      ? options.renderedVideoUrl.trim()
      : undefined;

  if (!video && !renderedVideoUrl) {
    return {};
  }
  if (typeof video === "string") {
    return { videoUrl: renderedVideoUrl ?? video };
  }
  const uploadedVideoUrl =
    typeof video?.video === "string"
      ? video.video
      : typeof video?.video?.asset?.url === "string"
        ? video.video.asset.url
        : undefined;
  const posterUrl = toSanityImage(
    typeof video?.posterUrl === "string"
      ? video.posterUrl
      : typeof video?.posterUrl?.asset?.url === "string"
        ? video.posterUrl.asset.url
        : undefined,
  );
  return {
    videoUrl: renderedVideoUrl ?? uploadedVideoUrl,
    title: typeof video?.title === "string" ? video.title : undefined,
    posterUrl,
  };
};

export const mapBirdcreekVideoBannerProps = (
  data: SanityDoc,
): Partial<{ vimeoUrl: string; title: string }> => {
  if (!data) {
    return {};
  }

  const rawVimeoUrl =
    typeof data.birdcreekVimeoUrl === "string"
      ? data.birdcreekVimeoUrl
      : typeof data.vimeoUrl === "string"
        ? data.vimeoUrl
        : undefined;

  const rawTitle =
    typeof data.birdcreekVideoTitle === "string"
      ? data.birdcreekVideoTitle
      : typeof data.title === "string"
        ? data.title
        : undefined;

  const vimeoUrl = typeof rawVimeoUrl === "string" ? stegaClean(rawVimeoUrl).trim() : "";
  const title = typeof rawTitle === "string" ? stegaClean(rawTitle).trim() : "";

  return {
    ...(vimeoUrl ? { vimeoUrl } : {}),
    ...(title ? { title } : {}),
  };
};

export const mapContactBannerProps = (data: SanityDoc): Partial<ContactBannerProps> => {
  if (!data) {
    return {};
  }

  const pick = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim() ? value.trim() : undefined;

  return {
    ...(pick(data.eyebrow) ? { eyebrow: pick(data.eyebrow) } : {}),
    ...(pick(data.headline) ? { headline: pick(data.headline) } : {}),
    ...(pick(data.phoneLabel) ? { phoneLabel: pick(data.phoneLabel) } : {}),
    ...(pick(data.phoneDisplay) ? { phoneDisplay: pick(data.phoneDisplay) } : {}),
    ...(pick(data.phoneTel) ? { phoneTel: pick(data.phoneTel) } : {}),
    ...(pick(data.phoneHref) ? { phoneHref: pick(data.phoneHref) } : {}),
    ...(pick(data.phoneAriaLabel) ? { phoneAriaLabel: pick(data.phoneAriaLabel) } : {}),
    ...(pick(data.ariaLabel) ? { ariaLabel: pick(data.ariaLabel) } : {}),
    ...(pick(data.backgroundColor) ? { backgroundColor: pick(data.backgroundColor) } : {}),
    ...(pick(data.textColor) ? { textColor: pick(data.textColor) } : {}),
    ...(pick(data.eyebrowColor) ? { eyebrowColor: pick(data.eyebrowColor) } : {}),
    ...(pick(data.eyebrowColorLight) ? { eyebrowColorLight: pick(data.eyebrowColorLight) } : {}),
    ...(pick(data.accentGlowColor) ? { accentGlowColor: pick(data.accentGlowColor) } : {}),
    ...(pick(data.iconColor) ? { iconColor: pick(data.iconColor) } : {}),
    ...(pick(data.iconColorLight) ? { iconColorLight: pick(data.iconColorLight) } : {}),
    ...(pick(data.iconColorDark) ? { iconColorDark: pick(data.iconColorDark) } : {}),
    ...(pick(data.iconColorVeryDark) ? { iconColorVeryDark: pick(data.iconColorVeryDark) } : {}),
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
    ...(pick(data.pulsePingColor) ? { pulsePingColor: pick(data.pulsePingColor) } : {}),
    ...(pick(data.gridColor) ? { gridColor: pick(data.gridColor) } : {}),
    ...(() => {
      const iconData = data.ctaIcon;
      // Handle new iconPicker format: { provider, name }
      if (iconData && typeof iconData === "object" && "name" in iconData) {
        const iconName = String(iconData.name);
        // Map common icon names to our iconoir icons
        const iconMap: Record<string, keyof typeof CONTACT_BANNER_ICONS> = {
          // Iconoir names (most will match directly)
          phone: "phone",
          calculator: "calculator",
          "help-circle": "helpCircle",
          home: "home",
          "arrow-right": "arrowRight",
          search: "search",
          settings: "settings",
          shield: "shield",
          star: "star",
          truck: "truck",
          user: "user",
          wrench: "wrench",
          "map-pin": "mapPin",
          "submit-document": "documentText",
          "media-image": "image",
          "chat-bubble": "message",
          "arrow-up-right": "arrowUpRight",
          "shield-check": "checkCircle",
          clock: "clock",
          globe: "globe",
          heart: "heart",
          key: "key",
          "light-bulb": "lightbulb",
          lock: "lock",
          "half-moon": "moon",
          "sun-light": "sun",
          "thumbs-up": "thumbsUp",
          trophy: "trophy",
          umbrella: "umbrella",
          wallet: "wallet",
          wifi: "wifi",
          // Font Awesome names (with fa prefix)
          "fa-phone": "phone",
          "fa-calculator": "calculator",
          "fa-question-circle": "helpCircle",
          "fa-home": "home",
          "fa-arrow-right": "arrowRight",
          "fa-search": "search",
          "fa-cog": "settings",
          "fa-shield": "shield",
          "fa-star": "star",
          "fa-truck": "truck",
          "fa-user": "user",
          "fa-wrench": "wrench",
          "fa-map-marker": "mapPin",
          "fa-file-alt": "documentText",
          "fa-image": "image",
          "fa-comment": "message",
          "fa-external-link-alt": "arrowUpRight",
          "fa-check-circle": "checkCircle",
          "fa-clock": "clock",
          "fa-globe": "globe",
          "fa-heart": "heart",
          "fa-key": "key",
          "fa-lightbulb": "lightbulb",
          "fa-lock": "lock",
          "fa-moon": "moon",
          "fa-sun": "sun",
          "fa-thumbs-up": "thumbsUp",
          "fa-trophy": "trophy",
          "fa-umbrella": "umbrella",
          "fa-wallet": "wallet",
          "fa-wifi": "wifi",
          // Hero Icons names
          "home-solid": "home",
          "arrow-right-solid": "arrowRight",
          "magnifying-glass-solid": "search",
          "cog-6-tooth-solid": "settings",
          "shield-check-solid": "shield",
          "star-solid": "star",
          "truck-solid": "truck",
          "user-solid": "user",
          "wrench-screwdriver-solid": "wrench",
          "map-pin-solid": "mapPin",
          "document-text-solid": "documentText",
          "photo-solid": "image",
          "chat-bubble-left-right-solid": "message",
          "arrow-up-right-solid": "arrowUpRight",
          "check-circle-solid": "checkCircle",
          "clock-solid": "clock",
          "globe-alt-solid": "globe",
          "heart-solid": "heart",
          "key-solid": "key",
          "light-bulb-solid": "lightbulb",
          "lock-closed-solid": "lock",
          "moon-solid": "moon",
          "sun-solid": "sun",
          "thumb-up-solid": "thumbsUp",
          "trophy-solid": "trophy",
          // Material Design Icons
          "mdi-phone": "phone",
          "mdi-calculator": "calculator",
          "mdi-help-circle": "helpCircle",
          "mdi-home": "home",
          "mdi-arrow-right": "arrowRight",
          "mdi-magnify": "search",
          "mdi-cog": "settings",
          "mdi-shield": "shield",
          "mdi-star": "star",
          "mdi-truck": "truck",
          "mdi-account": "user",
          "mdi-wrench": "wrench",
          "mdi-map-marker": "mapPin",
          "mdi-file-document": "documentText",
          "mdi-image": "image",
          "mdi-message": "message",
          "mdi-open-in-new": "arrowUpRight",
          "mdi-checkbox-marked-circle": "checkCircle",
          "mdi-clock": "clock",
          "mdi-earth": "globe",
          "mdi-heart": "heart",
          "mdi-key": "key",
          "mdi-lightbulb": "lightbulb",
          "mdi-lock": "lock",
          "mdi-weather-night": "moon",
          "mdi-weather-sunny": "sun",
          "mdi-thumb-up": "thumbsUp",
          "mdi-trophy": "trophy",
          "mdi-umbrella": "umbrella",
          "mdi-wallet": "wallet",
          "mdi-wifi": "wifi",
        };
        const normalizedName = iconName.toLowerCase().replace(/_/g, "-");
        const mappedKey = iconMap[normalizedName] ?? iconMap[iconName];
        if (mappedKey && mappedKey in CONTACT_BANNER_ICONS) {
          return { ctaIcon: CONTACT_BANNER_ICONS[mappedKey] };
        }
        // Keyword fallback: match by substring against known icon keys
        const matchedKey = Object.keys(CONTACT_BANNER_ICONS).find((k) =>
          normalizedName.includes(k.toLowerCase()),
        );
        if (matchedKey) {
          return { ctaIcon: CONTACT_BANNER_ICONS[matchedKey as keyof typeof CONTACT_BANNER_ICONS] };
        }
      }
      // Legacy string format fallback
      if (typeof iconData === "string" && iconData.trim() && iconData in CONTACT_BANNER_ICONS) {
        return {
          ctaIcon: CONTACT_BANNER_ICONS[iconData as keyof typeof CONTACT_BANNER_ICONS],
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
    ...(about.badgeText ? { badgeText: about.badgeText } : {}),
    ...(about.badgeSubtext ? { badgeSubtext: about.badgeSubtext } : {}),
    ...(about.image ? { imageSrc: toSanityImage(about.image) } : {}),
    ...(title ? { title } : {}),
    ...(body ? { body } : {}),
  };
};

export const mapServicesProps = (svc: SanityDoc): Partial<ServicesProps> => {
  if (!svc) {
    return {};
  }
  const title =
    svc.titleLines?.length > 0 ? (
      <>
        {svc.titleLines.map((line: string, i: number) => (
          <React.Fragment key={i}>
            {line}
            {i < svc.titleLines.length - 1 ? <br /> : null}
          </React.Fragment>
        ))}
      </>
    ) : undefined;

  const services = svc.services?.map(
    (row: { id: string; title: string; description?: unknown; icon?: string; image?: string }) => {
      const Icon = getServiceIconComponent(row.icon);
      const description = asOptionalRichText(row.description) ?? RICH_TEXT_PLACEHOLDER;
      return {
        id: row.id,
        title: row.title,
        description,
        icon: Icon,
        ...(row.image ? { image: toSanityImage(row.image) } : {}),
      };
    },
  );

  const sectionDescription = asOptionalRichText(svc.description);

  // Build birdcreekAdvantage from any available Sanity fields, falling back to
  // defaults per-field. This ensures stega metadata always reaches the component
  // so Presentation overlays appear even when only some fields are populated.
  const rawBca = svc.birdcreekAdvantage as Record<string, unknown> | null | undefined;
  const birdcreekAdvantage = rawBca
    ? {
        title:
          typeof rawBca.title === "string" && rawBca.title
            ? rawBca.title
            : "The Birdcreek Advantage",
        description:
          asOptionalRichText(rawBca.description) ??
          "Direct access to Austin's premier roofing company, combining Tandra's consultation with Birdcreek's legendary execution.",
        ctaLabel:
          typeof rawBca.ctaLabel === "string" && rawBca.ctaLabel ? rawBca.ctaLabel : "Learn More",
        ctaHref:
          typeof rawBca.ctaHref === "string" && rawBca.ctaHref
            ? rawBca.ctaHref
            : "https://birdcreekroofing.com",
      }
    : undefined;

  const servicesStyle =
    typeof svc.servicesStyle === "string" && svc.servicesStyle
      ? (svc.servicesStyle as ServicesProps["servicesStyle"])
      : undefined;

  const rawTypographicArt = svc.typographicArt as Record<string, unknown> | null | undefined;
  const typographicArt = rawTypographicArt
    ? {
        ...(rawTypographicArt.baseMaskImage
          ? { baseMaskImage: toSanityImage(rawTypographicArt.baseMaskImage) }
          : {}),
        ...(rawTypographicArt.overlayMaskImage
          ? {
              overlayMaskImage: toSanityImage(rawTypographicArt.overlayMaskImage),
            }
          : {}),
      }
    : undefined;
  const hasTypographicArt =
    typographicArt &&
    (typographicArt.baseMaskImage !== undefined || typographicArt.overlayMaskImage !== undefined);

  return {
    ...(svc.tagline ? { tagline: svc.tagline } : {}),
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
  const rows = stats.items as { name?: string; value?: string; icon?: string }[] | undefined;
  const items =
    rows
      ?.map((row: { _key?: string; name?: string; value?: string | number; icon?: string }) => {
        const name = typeof row.name === "string" ? row.name.trim() : "";
        const valueRaw = row.value;
        const value =
          typeof valueRaw === "number" && Number.isFinite(valueRaw)
            ? String(valueRaw)
            : typeof valueRaw === "string"
              ? valueRaw.trim()
              : "";
        if (!name || !value) {
          return null;
        }
        return {
          ...(typeof row._key === "string" && row._key ? { rowKey: row._key } : {}),
          name,
          value,
          icon: getServiceIconComponent(row.icon),
        };
      })
      .filter((row): row is Stat => row !== null) ?? [];
  return {
    ...(typeof stats.title === "string" && stats.title.trim() ? { title: stats.title.trim() } : {}),
    ...(items.length > 0 ? { items } : {}),
  };
};

export const mapMissionProps = (m: SanityDoc): Partial<MissionProps> => {
  if (!m) {
    return {};
  }
  const values = m.values?.map(
    (row: { id: string; title: string; description?: unknown; image?: string }) => {
      const description = asOptionalRichText(row.description) ?? RICH_TEXT_PLACEHOLDER;
      return {
        id: row.id,
        title: row.title,
        description,
        ...(row.image ? { image: toSanityImage(row.image) } : {}),
      };
    },
  );

  const missionTitle = asOptionalRichText(m.title);
  const missionDescription = asOptionalRichText(m.description);

  return {
    ...(m.tagline ? { tagline: m.tagline } : {}),
    ...(missionTitle ? { title: missionTitle } : {}),
    ...(missionDescription ? { description: missionDescription } : {}),
    ...(values && values.length > 0 ? { services: values } : {}),
  };
};

export const mapExpertiseProps = (e: SanityDoc): Partial<ExpertiseProps> => {
  if (!e) {
    return {};
  }
  const items = e.items?.map(
    (row: { id: string; title: string; desc?: unknown; image?: string }) => {
      const desc = asOptionalRichText(row.desc) ?? RICH_TEXT_PLACEHOLDER;
      return {
        id: row.id,
        title: row.title,
        desc,
        ...(row.image ? { image: toSanityImage(row.image) } : {}),
      };
    },
  );

  return {
    ...(e.tagline ? { tagline: e.tagline } : {}),
    ...(e.title ? { title: e.title } : {}),
    ...(items && items.length > 0 ? { items } : {}),
  };
};

export const mapFaqProps = (f: SanityDoc): Partial<FaqProps> => {
  if (!f) {
    return {};
  }
  const items = f.items
    ?.map((row: { _key?: string; question?: string; answer?: unknown }) => {
      const question = typeof row.question === "string" ? row.question.trim() : "";
      if (!question) {
        return null;
      }
      const answer = asOptionalRichText(row.answer) ?? RICH_TEXT_PLACEHOLDER;
      return {
        ...(typeof row._key === "string" && row._key.trim() ? { _key: row._key } : {}),
        question,
        answer,
      };
    })
    .filter(Boolean);

  const intro = asOptionalRichText(f.intro);

  return {
    ...(f.tagline ? { tagline: f.tagline } : {}),
    ...(f.title ? { title: f.title } : {}),
    ...(intro ? { intro } : {}),
    ...(items && items.length > 0 ? { items } : {}),
  };
};

export const mapContactProps = (c: SanityDoc): Partial<ContactProps> => {
  if (!c) {
    return {};
  }
  return {
    ...(c.tagline ? { tagline: c.tagline } : {}),
    ...(c.title ? { title: c.title } : {}),
    ...(c.email ? { email: c.email } : {}),
    ...(c.phone ? { phone: c.phone } : {}),
    ...(c.location ? { location: c.location } : {}),
  };
};

export const mapSocialShareProps = (s: SanityDoc): Partial<SocialShareBarProps> => {
  if (!s) {
    return {};
  }
  const shareText = asOptionalRichText(s.shareText);

  return {
    ...(s.heading ? { heading: s.heading } : {}),
    ...(shareText ? { shareText } : {}),
  };
};

export const mapArticlesTeaserEditorialProps = (
  s: SanityDoc,
): Partial<Omit<ArticlesTeaserProps, "posts">> => {
  if (!s) {
    return {};
  }
  const intro = asOptionalRichText(s.intro);

  return {
    ...(typeof s.eyebrow === "string" && s.eyebrow.trim() ? { eyebrow: s.eyebrow.trim() } : {}),
    ...(typeof s.title === "string" && s.title.trim() ? { title: s.title.trim() } : {}),
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
        name: l.name,
        href: l.href,
      }))
    : undefined;

  return {
    ...(site.navLogoText ? { logoText: site.navLogoText } : {}),
    ...(site.navLogoTagline ? { logoTagline: site.navLogoTagline } : {}),
    ...(site.navLogoImage ? { imageSrc: toSanityImage(site.navLogoImage) } : {}),
    ...(navItemsRaw?.length ? { navItems: navItemsRaw } : {}),
    ...(site.navCtaText ? { ctaText: site.navCtaText } : {}),
    ...(site.navCtaHref ? { ctaHref: site.navCtaHref } : {}),
    ...(site.navSecondaryCtaText ? { secondaryCtaText: site.navSecondaryCtaText } : {}),
    ...(site.navSecondaryCtaHref ? { secondaryCtaHref: site.navSecondaryCtaHref } : {}),
  };
};

export const mapFooterProps = (site: SanityDoc): Partial<FooterProps> => {
  if (!site) {
    return {};
  }
  const socialLinks = site.footerSocialLinks
    ?.map((l: { platform: keyof typeof SOCIAL_ICONS; url: string }) => {
      const Icon = SOCIAL_ICONS[l.platform];
      if (!Icon) {
        return null;
      }
      return {
        icon: Icon,
        href: l.url,
        platform: SOCIAL_PLATFORM_LABELS[l.platform],
      };
    })
    .filter(Boolean) as FooterProps["socialLinks"];

  const quickLinksRaw: NavItem[] | undefined = Array.isArray(site.footerQuickLinks)
    ? site.footerQuickLinks.map((l: { name: string; href: string }) => ({
        name: l.name,
        href: l.href,
      }))
    : undefined;
  const legalLinks: NavItem[] | undefined = Array.isArray(site.footerLegalLinks)
    ? site.footerLegalLinks.map((l: { name: string; href: string }) => ({
        name: l.name,
        href: l.href,
      }))
    : undefined;

  const footerDescription = asOptionalRichText(site.footerDescription);

  return {
    ...(site.footerLogoText ? { logoText: site.footerLogoText } : {}),
    ...(footerDescription ? { description: footerDescription } : {}),
    ...(socialLinks?.length ? { socialLinks } : {}),
    ...(quickLinksRaw?.length ? { quickLinks: quickLinksRaw } : {}),
    ...(legalLinks?.length ? { legalLinks } : {}),
    ...(site.footerCopyrightText ? { copyrightText: site.footerCopyrightText } : {}),
    ...(site.footerPartnerText ? { partnerText: site.footerPartnerText } : {}),
  };
};

export const mapTestimonialsProps = (t: SanityDoc): Partial<TestimonialsProps> => {
  if (!t) {
    return {};
  }
  const out: Partial<TestimonialsProps> = {};
  if (t.elfsightWidgetId?.trim()) {
    out.elfsightWidgetId = t.elfsightWidgetId.trim();
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
    typeof value === "string" || typeof value === "number" ? stegaClean(value) : value;

  if (typeof cleaned === "number" && Number.isFinite(cleaned)) {
    return cleaned;
  }
  if (typeof cleaned === "string" && cleaned.trim()) {
    const parsed = Number(cleaned.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export const mapRoofInspectionProps = (data: SanityDoc): Partial<RoofInspectionSectionProps> => {
  if (!data) return {};

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
  const img = data.diagramImage;
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
          typeof h.watchFor === "string",
      )
      .map(
        (h): RoofInspectionHotspotData => ({
          ...(typeof h._key === "string" ? { _key: h._key } : {}),
          label: stegaClean(h.label as string).trim(),
          direction: stegaClean(h.direction as string) as RoofInspectionHotspotData["direction"],
          calloutTitle: stegaClean(h.calloutTitle as string).trim(),
          calloutBody: stegaClean(h.calloutBody as string).trim(),
          watchFor: stegaClean(h.watchFor as string).trim(),
          ...(toFiniteNumber(h.pos3dX) !== undefined ? { pos3dX: toFiniteNumber(h.pos3dX) } : {}),
          ...(toFiniteNumber(h.pos3dY) !== undefined ? { pos3dY: toFiniteNumber(h.pos3dY) } : {}),
          ...(toFiniteNumber(h.pos3dZ) !== undefined ? { pos3dZ: toFiniteNumber(h.pos3dZ) } : {}),
          ...(toFiniteNumber(h.norm3dX) !== undefined
            ? { norm3dX: toFiniteNumber(h.norm3dX) }
            : {}),
          ...(toFiniteNumber(h.norm3dY) !== undefined
            ? { norm3dY: toFiniteNumber(h.norm3dY) }
            : {}),
          ...(toFiniteNumber(h.norm3dZ) !== undefined
            ? { norm3dZ: toFiniteNumber(h.norm3dZ) }
            : {}),
        }),
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
  homeSection?: SanityDoc,
): Partial<RoofInspectionSectionProps> => {
  const pageProps = mapRoofInspectionProps(pageSection ?? {});
  const homeProps = mapRoofInspectionProps(homeSection ?? {});
  const hotspots = pageProps.hotspots?.length ? pageProps.hotspots : homeProps.hotspots;

  return {
    ...homeProps,
    ...pageProps,
    ...(hotspots ? { hotspots } : {}),
  };
};

export const mapServiceAreaMapProps = (data: SanityDoc): Partial<ServiceAreaMapProps> => {
  if (!data) return {};

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
          typeof a.clientCount === "number",
      )
      .map((a: Record<string, unknown>) => {
        const key = stegaClean(a.countyKey as string).trim();
        const name =
          typeof a.displayName === "string" && a.displayName.trim()
            ? stegaClean(a.displayName as string).trim()
            : key;
        return {
          countyKey: key,
          displayName: name,
          clientCount: a.clientCount as number,
        };
      });
  }

  return out;
};
