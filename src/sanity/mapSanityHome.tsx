import React from "react";
import { FileText, Search, ShieldCheck } from "lucide-react";
import { Facebook, Instagram, Linkedin } from "iconoir-react";
import { theme } from "../theme";
import type { HeroProps } from "../types";
import type { AboutProps } from "../types";
import type { ServicesProps } from "../types";
import type { MissionProps } from "../types";
import type { ExpertiseProps } from "../types";
import type { FaqProps } from "../types";
import type { ContactProps } from "../types";
import type { SocialShareBarProps } from "../types";
import type { NavProps } from "../types";
import type { FooterProps } from "../types";
import type { TestimonialsProps } from "../types";

const SERVICE_ICONS = {
  search: Search,
  fileText: FileText,
  shieldCheck: ShieldCheck,
} as const;

type ServiceIconKey = keyof typeof SERVICE_ICONS;

const SOCIAL_ICONS = {
  instagram: Instagram,
  linkedin: Linkedin,
  facebook: Facebook,
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityDoc = Record<string, any> | null | undefined;

export const mapHeroProps = (hero: SanityDoc): Partial<HeroProps> => {
  if (!hero) {
    return {};
  }
  const title =
    hero.titleLine1 || hero.titleLine2 ? (
      <>
        {hero.titleLine1}
        <br />
        <span style={{ color: theme.colors.evergladeMuted }}>
          {hero.titleLine2}
        </span>
      </>
    ) : undefined;

  const out: Partial<HeroProps> = {};
  if (hero.badge) {
    out.badgeText = hero.badge;
  }
  if (title) {
    out.title = title;
  }
  if (hero.subtitle) {
    out.subtitle = hero.subtitle;
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

  return {
    ...(about.badgeText ? { badgeText: about.badgeText } : {}),
    ...(about.badgeSubtext ? { badgeSubtext: about.badgeSubtext } : {}),
    ...(about.image ? { imageSrc: about.image } : {}),
    ...(title ? { title } : {}),
    ...(about.paragraphs?.length
      ? { paragraphs: about.paragraphs.filter(Boolean) }
      : {}),
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
    (row: {
      id: string;
      title: string;
      description: string;
      icon?: string;
      image?: string;
    }) => {
      const key = (row.icon || "search") as ServiceIconKey;
      const Icon = SERVICE_ICONS[key] ?? Search;
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        icon: Icon,
        ...(row.image ? { image: row.image } : {}),
      };
    },
  );

  return {
    ...(svc.tagline ? { tagline: svc.tagline } : {}),
    ...(title ? { title } : {}),
    ...(svc.description ? { description: svc.description } : {}),
    ...(services?.length ? { services } : {}),
  };
};

export const mapMissionProps = (m: SanityDoc): Partial<MissionProps> => {
  if (!m) {
    return {};
  }
  const values = m.values?.map(
    (row: { id: string; title: string; description: string; image?: string }) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      ...(row.image ? { image: row.image } : {}),
    }),
  );

  return {
    ...(m.tagline ? { tagline: m.tagline } : {}),
    ...(m.title ? { title: m.title } : {}),
    ...(m.description ? { description: m.description } : {}),
    ...(values?.length ? { services: values } : {}),
  };
};

export const mapExpertiseProps = (e: SanityDoc): Partial<ExpertiseProps> => {
  if (!e) {
    return {};
  }
  const items = e.items?.map(
    (row: { id: string; title: string; desc: string; image?: string }) => ({
      id: row.id,
      title: row.title,
      desc: row.desc,
      ...(row.image ? { image: row.image } : {}),
    }),
  );

  return {
    ...(e.tagline ? { tagline: e.tagline } : {}),
    ...(e.title ? { title: e.title } : {}),
    ...(items?.length ? { items } : {}),
  };
};

export const mapFaqProps = (f: SanityDoc): Partial<FaqProps> => {
  if (!f) {
    return {};
  }
  const items = f.items?.map(
    (row: { question: string; answer: string }) => ({
      question: row.question,
      answer: row.answer,
    }),
  );

  return {
    ...(f.tagline ? { tagline: f.tagline } : {}),
    ...(f.title ? { title: f.title } : {}),
    ...(f.intro ? { intro: f.intro } : {}),
    ...(items?.length ? { items } : {}),
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

export const mapSocialShareProps = (
  s: SanityDoc,
): Partial<SocialShareBarProps> => {
  if (!s) {
    return {};
  }
  return {
    ...(s.heading ? { heading: s.heading } : {}),
    ...(s.shareText ? { shareText: s.shareText } : {}),
  };
};

export const mapNavProps = (site: SanityDoc): Partial<NavProps> => {
  if (!site) {
    return {};
  }
  const navItems = site.navItems?.map(
    (l: { name: string; href: string }) => ({
      name: l.name,
      href: l.href,
    }),
  );

  return {
    ...(site.navLogoText ? { logoText: site.navLogoText } : {}),
    ...(site.navLogoTagline ? { logoTagline: site.navLogoTagline } : {}),
    ...(site.navLogoImage ? { imageSrc: site.navLogoImage } : {}),
    ...(navItems?.length ? { navItems } : {}),
    ...(site.navCtaText ? { ctaText: site.navCtaText } : {}),
    ...(site.navCtaHref ? { ctaHref: site.navCtaHref } : {}),
  };
};

export const mapFooterProps = (site: SanityDoc): Partial<FooterProps> => {
  if (!site) {
    return {};
  }
  const socialLinks = site.footerSocialLinks?.map(
    (l: { platform: keyof typeof SOCIAL_ICONS; url: string }) => {
      const Icon = SOCIAL_ICONS[l.platform];
      if (!Icon) {
        return null;
      }
      return { icon: Icon, href: l.url };
    },
  ).filter(Boolean) as FooterProps["socialLinks"];

  const quickLinks = site.footerQuickLinks?.map(
    (l: { name: string; href: string }) => ({
      name: l.name,
      href: l.href,
    }),
  );
  const legalLinks = site.footerLegalLinks?.map(
    (l: { name: string; href: string }) => ({
      name: l.name,
      href: l.href,
    }),
  );

  return {
    ...(site.footerLogoText ? { logoText: site.footerLogoText } : {}),
    ...(site.footerDescription
      ? { description: site.footerDescription }
      : {}),
    ...(socialLinks?.length ? { socialLinks } : {}),
    ...(quickLinks?.length ? { quickLinks } : {}),
    ...(legalLinks?.length ? { legalLinks } : {}),
    ...(site.footerCopyrightText
      ? { copyrightText: site.footerCopyrightText }
      : {}),
    ...(site.footerPartnerText ? { partnerText: site.footerPartnerText } : {}),
  };
};

export const mapTestimonialsProps = (
  t: SanityDoc,
): Partial<TestimonialsProps> => {
  if (!t?.elfsightWidgetId?.trim()) {
    return {};
  }
  return { elfsightWidgetId: t.elfsightWidgetId.trim() };
};
