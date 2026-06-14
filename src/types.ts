import type {
  CustomElements,
  CustomCssProperties,
} from "@awesome.me/webawesome/dist/custom-elements-jsx.d.ts";
import type { PortableTextBlock } from "@portabletext/types";

import React from "react";

import type { IconoirIconProps } from "./icons/serviceIconMap";
import type { PostListItem } from "./types/article";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntrinsicElements extends CustomElements {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CSSProperties extends CustomCssProperties {}
}

declare module "react" {
  interface CSSProperties {
    cornerShape?: string; // Or a union of specific values like 'bevel' | 'round'
    webkitCornerShape?: string;
  }
}

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
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  imageSrc?: string;
}

export interface HeroProps {
  title?: React.ReactNode;
  /** Raw CMS strings — used by hero variants that apply their own heading styles. */
  titleLine1?: string;
  titleLine2?: string;
  /** Hero badge / eyebrow (e.g. Birdcreek Roofing consultant · Austin, TX) */
  badgeText?: string;
  subtitle?: RichTextSource;
  ctaText?: string;
  ctaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  backgroundImage?: string;
  /** Pill Nav variant — sky/background layer, parallax 0.3× (recedes as user scrolls). */
  skyImage?: string;
  /** Pill Nav variant — house/roof cutout PNG, parallax −0.5× (rises toward viewer). */
  foregroundImage?: string;
  /** CMS or direct override: force a specific hero variant instead of the PostHog A/B flag. */
  heroStyle?: "control" | "glass-overlay" | "dual-cta-rail" | "dark-floating-pill";
}

export interface VideoProps {
  videoUrl?: string;
  title?: string;
  posterUrl?: string;
}

export interface CertificationsProps {
  title?: string;
  certifications?: Certification[];
}

export interface Certification {
  name: string;
  image: string;
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

export interface BirdcreekAdvantageCard {
  title: string;
  description: RichTextSource;
  ctaLabel: string;
  ctaHref: string;
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

export type ServicesStyleVariant = "" | "control" | "typographic-alt";

export interface ServicesTypographicArt {
  /** Sanity CDN URL for the full headline image mask. */
  baseMaskImage?: string;
  /** Sanity CDN URL for the circular overlay patches on the headline. */
  overlayMaskImage?: string;
}

export interface ServicesProps {
  tagline?: string;
  title?: React.ReactNode;
  description?: RichTextSource;
  services?: Service[];
  birdcreekAdvantage?: BirdcreekAdvantageCard;
  /** Sanity override for PostHog `services-section-style` experiment. */
  servicesStyle?: ServicesStyleVariant;
  /** Headline image masks for the typographic-alt layout (`servicesSection.typographicArt`). */
  typographicArt?: ServicesTypographicArt;
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
  /** Background color of the section. Defaults to `theme.colors.paper`. Pass `"transparent"` to inherit the page background. */
  backgroundColor?: string;
  /** Section element id for in-page anchors. Defaults to `faq`. */
  sectionId?: string;
  /** When false, skips FAQPage JSON-LD (use when multiple FAQ blocks share one page). */
  includeJsonLd?: boolean;
}

export interface ServiceAreaEntry {
  countyKey: string;
  displayName: string;
  clientCount: number;
}

export interface ServiceAreaMapProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  areas?: ServiceAreaEntry[];
}

export interface RoofInspectionHotspotData {
  /** Sanity array item key — stable identity for React keys across edits. */
  _key?: string;
  /** Short nav label shown in the left rail. */
  label: string;
  direction: "top" | "right" | "left" | "bottom";
  calloutTitle: string;
  calloutBody: string;
  watchFor: string;
  /** model-viewer world-space position components in metres. */
  pos3dX?: number;
  pos3dY?: number;
  pos3dZ?: number;
  /** model-viewer surface normal components. */
  norm3dX?: number;
  norm3dY?: number;
  norm3dZ?: number;
}

export interface RoofInspectionSectionProps {
  kicker?: string;
  titleLine1?: string;
  titleLine2?: string;
  /** Third title line under the main heading in the rail. */
  subtitle?: string;
  lede?: string;
  /** URL of the diagram image. Defaults to /roof-sidecut.svg. */
  diagramImageUrl?: string;
  /**
   * CMS-driven hotspot definitions. When present these replace the
   * built-in CHAPTERS default from data.ts.
   */
  hotspots?: RoofInspectionHotspotData[];
}

export interface ArticlesTeaserProps {
  posts: PostListItem[];
  eyebrow?: string;
  title?: string;
  intro?: RichTextSource;
  viewAllLabel?: string;
}

export interface EstimatorOption {
  _key?: string;
  label: string;
  description?: string;
  /** Home size midpoint; only read on the question with `drivesSquareFootage`. */
  sqftMidpoint?: number;
  /** Dollars per square foot this option adds to the running rate. */
  pricePerSqftAdd?: number;
  /** Flat dollars this option adds regardless of size. */
  flatAdd?: number;
}

export interface EstimatorQuestion {
  _key?: string;
  prompt: string;
  helpText?: string;
  /** When true, the selected option's `sqftMidpoint` sets the home size. */
  drivesSquareFootage?: boolean;
  options: EstimatorOption[];
}

export interface EstimatorProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  startButtonLabel?: string;
  resultHeading?: string;
  disclaimer?: string;
  questions?: EstimatorQuestion[];
  /** Flat amount added to every estimate. */
  baseFee?: number;
  /** Starting price per square foot before option modifiers. */
  baseRatePerSqft?: number;
  /** Half-width of the shown range, as a percent (15 = ±15%). */
  rangeSpreadPercent?: number;
  currency?: string;
  /** Section element id for in-page anchors. Defaults to `estimator`. */
  sectionId?: string;
}

/** Resolved /estimate page content: estimator config + SEO + homepage banner copy. */
export interface EstimatorPageContent extends EstimatorProps {
  seoTitle?: string;
  seoDescription?: string;
  bannerEyebrow?: string;
  bannerHeadline?: string;
  bannerCtaLabel?: string;
}
