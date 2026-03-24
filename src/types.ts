import React from "react";
import type { PortableTextBlock } from "@portabletext/types";
import type { IconoirIconProps } from "./icons/serviceIconMap";
import type { PostListItem } from "./types/article";

/** Sanity `blockContent` or a plain string (legacy / seed). */
export type RichTextSource = PortableTextBlock[] | string;

export interface NavItem {
  name: string;
  href: string;
}

export interface NavProps {
  logoText?: string;
  logoTagline?: string;
  navItems?: NavItem[];
  ctaText?: string;
  ctaHref?: string;
  imageSrc?: string;
}

export interface HeroProps {
  title?: React.ReactNode;
  /** Hero badge / eyebrow (e.g. BirdCreek Roofing consultant · Austin, TX) */
  badgeText?: string;
  subtitle?: RichTextSource;
  ctaText?: string;
  ctaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  backgroundImage?: string;
}

export interface Stat {
  /** Sanity array item `_key` when present (stable list keys). */
  rowKey?: string;
  name: string;
  value: string;
  icon: React.ComponentType<IconoirIconProps>;
}

export interface StatsProps {
  title?: string;
  /** CMS-driven stat rows (icon resolved on the client). */
  items?: Stat[];
}

export interface AboutProps {
  badgeText?: string;
  badgeSubtext?: string;
  imageSrc?: string;
  tagline?: string;
  title?: React.ReactNode;
  /** Primary about copy (Sanity `about.body`). */
  body?: RichTextSource;
  /**
   * Legacy Sanity field; used when `body` is absent (mapped into blocks on the client).
   * @deprecated Prefer `body` in Studio.
   */
  paragraphs?: string[];
  linkText?: string;
  linkHref?: string;
}

export interface Service {
  id: string;
  title: string;
  description: RichTextSource;
  icon: React.ElementType;
  image?: string;
}
export interface Mission {
  id: string;
  title: string;
  description: RichTextSource;
  icon?: React.ElementType;
  image?: string;
}

export interface MissionProps {
  tagline?: string;
  title?: RichTextSource;
  description?: RichTextSource;
  services?: Mission[];
}

export interface ServicesProps {
  tagline?: string;
  title?: React.ReactNode;
  description?: RichTextSource;
  services?: Service[];
}

export interface ExpertiseItem {
  id: string;
  title: string;
  desc: RichTextSource;
  /** Sanity CDN or site path used as `img` src */
  image?: string;
}

export interface ExpertiseProps {
  tagline?: string;
  title?: string;
  items?: ExpertiseItem[];
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  image: string;
}

export interface TestimonialsProps {
  tagline?: string;
  title?: string;
  testimonials?: Testimonial[];
  /** When set, overrides `VITE_ELFSIGHT_WIDGET_ID` for this embed */
  elfsightWidgetId?: string;
  /** Shown when no widget id is configured (Portable Text; links allowed). */
  emptyStateNote?: RichTextSource;
}

export interface ContactInfo {
  icon: React.ElementType;
  label: string;
  value: string;
}

export interface ContactServiceOption {
  value: string;
  label: string;
}

export interface ContactProps {
  tagline?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  /** Defaults to shared roofing options from repo-root `contactServiceOptions.ts` */
  serviceOptions?: readonly ContactServiceOption[];
  contactInfo?: ContactInfo[];
  formLabels?: {
    name?: string;
    email?: string;
    service?: string;
    property?: string;
    message?: string;
    button?: string;
  };
}

export interface FooterProps {
  logoText?: string;
  description?: RichTextSource;
  socialLinks?: { icon: React.ElementType; href: string; platform?: string }[];
  quickLinks?: NavItem[];
  legalLinks?: NavItem[];
  newsletterTitle?: string;
  newsletterDesc?: string;
  copyrightText?: string;
  StatText?: string;
  partnerText?: string;
}

export interface SocialShareBarProps {
  heading?: string;
  /** Used in share URLs; formatting is flattened to plain text. */
  shareText?: RichTextSource;
}

export interface FaqItem {
  _key?: string;
  question: string;
  /** Rich text in the UI; JSON-LD uses flattened plain text. */
  answer: RichTextSource;
}

export interface FaqProps {
  tagline?: string;
  title?: string;
  intro?: RichTextSource;
  items?: FaqItem[];
  paddingTop?: string;
}

export interface ArticlesTeaserProps {
  posts: PostListItem[];
  eyebrow?: string;
  title?: string;
  intro?: RichTextSource;
  viewAllLabel?: string;
}
