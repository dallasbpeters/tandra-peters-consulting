import { stegaClean } from "@sanity/client/stega";
import { Facebook, Instagram, Linkedin } from "iconoir-react";
import React from "react";

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

const SOCIAL_ICONS = {
  instagram: Instagram,
  linkedin: Linkedin,
  facebook: Facebook,
} as const;

const SOCIAL_PLATFORM_LABELS: Record<keyof typeof SOCIAL_ICONS, string> = {
  instagram: "Visit my Instagram",
  linkedin: "Visit my LinkedIn",
  facebook: "Visit my Facebook",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityDoc = Record<string, any> | null | undefined;

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
    out.backgroundImage = hero.backgroundImage;
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
  const posterUrl =
    typeof video?.posterUrl === "string"
      ? video.posterUrl
      : typeof video?.posterUrl?.asset?.url === "string"
        ? video.posterUrl.asset.url
        : undefined;
  return {
    videoUrl: renderedVideoUrl ?? uploadedVideoUrl,
    title: typeof video?.title === "string" ? video.title : undefined,
    posterUrl,
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
    ...(about.image ? { imageSrc: about.image } : {}),
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
        ...(row.image ? { image: row.image } : {}),
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

  return {
    ...(svc.tagline ? { tagline: svc.tagline } : {}),
    ...(title ? { title } : {}),
    ...(sectionDescription ? { description: sectionDescription } : {}),
    ...(services && services.length > 0 ? { services } : {}),
    ...(birdcreekAdvantage ? { birdcreekAdvantage } : {}),
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
        ...(row.image ? { image: row.image } : {}),
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
        ...(row.image ? { image: row.image } : {}),
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
    ...(site.navLogoImage ? { imageSrc: site.navLogoImage } : {}),
    ...(navItemsRaw?.length ? { navItems: navItemsRaw } : {}),
    ...(site.navCtaText ? { ctaText: site.navCtaText } : {}),
    ...(site.navCtaHref ? { ctaHref: site.navCtaHref } : {}),
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
    out.diagramImageUrl = img.asset.url;
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
