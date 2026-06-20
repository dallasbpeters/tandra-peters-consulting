import type { PortableTextBlock } from "@portabletext/types";
import type React from "react";

import type { IconoirIconComponent } from "./icons/serviceIconMap";
import type { PostListItem } from "./types/article";

declare module "react" {
  interface CSSProperties {
    cornerShape?: string;
    webkitCornerShape?: string;
  }
}

/** Sanity `blockContent` or a plain string (legacy / seed). */
export type RichTextSource = PortableTextBlock[] | string;

export interface NavItem {
  href: string;
  name: string;
}

export interface NavProps {
  ctaHref?: string;
  ctaText?: string;
  imageSrc?: string;
  logoTagline?: string;
  logoText?: string;
  navItems?: NavItem[];
  secondaryCtaHref?: string;
  secondaryCtaText?: string;
}

export interface HeroProps {
  backgroundImage?: string;
  /** Hero badge / eyebrow (e.g. Birdcreek Roofing consultant · Austin, TX) */
  badgeText?: string;
  ctaHref?: string;
  ctaText?: string;
  /** Pill Nav variant — house/roof cutout PNG, parallax −0.5× (rises toward viewer). */
  foregroundImage?: string;
  /** CMS or direct override: force a specific hero variant instead of the PostHog A/B flag. */
  heroStyle?:
    | "control"
    | "glass-overlay"
    | "dual-cta-rail"
    | "dark-floating-pill";
  secondaryCtaHref?: string;
  secondaryCtaText?: string;
  /** Pill Nav variant — sky/background layer, parallax 0.3× (recedes as user scrolls). */
  skyImage?: string;
  subtitle?: RichTextSource;
  title?: React.ReactNode;
  /** Raw CMS strings — used by hero variants that apply their own heading styles. */
  titleLine1?: string;
  titleLine2?: string;
}

export interface VideoProps {
  posterUrl?: string;
  title?: string;
  videoUrl?: string;
}

export interface CertificationsProps {
  certifications?: Certification[];
  title?: string;
}

export interface Certification {
  image: string;
  name: string;
}

export interface Stat {
  icon: IconoirIconComponent;
  name: string;
  /** Sanity array item `_key` when present (stable list keys). */
  rowKey?: string;
  value: string;
}

export interface StatsProps {
  /** CMS-driven stat rows (icon resolved on the client). */
  items?: Stat[];
  title?: string;
}

export interface AboutProps {
  badgeSubtext?: string;
  badgeText?: string;
  /** Primary about copy (Sanity `about.body`). */
  body?: RichTextSource;
  imageSrc?: string;
  linkHref?: string;
  linkText?: string;
  /**
   * Legacy Sanity field; used when `body` is absent (mapped into blocks on the client).
   * @deprecated Prefer `body` in Studio.
   */
  paragraphs?: string[];
  tagline?: string;
  title?: React.ReactNode;
}

export interface Service {
  description: RichTextSource;
  icon: IconoirIconComponent;
  id: string;
  image?: string;
  title: string;
}

export interface BirdcreekAdvantageCard {
  ctaHref: string;
  ctaLabel: string;
  description: RichTextSource;
  title: string;
}

export interface Mission {
  description: RichTextSource;
  icon?: React.ElementType;
  id: string;
  image?: string;
  title: string;
}

export interface MissionProps {
  description?: RichTextSource;
  services?: Mission[];
  tagline?: string;
  title?: RichTextSource;
}

export type ServicesStyleVariant = "" | "control" | "typographic-alt";

export interface ServicesTypographicArt {
  /** Sanity CDN URL for the full headline image mask. */
  baseMaskImage?: string;
  /** Sanity CDN URL for the circular overlay patches on the headline. */
  overlayMaskImage?: string;
}

export interface ServicesProps {
  birdcreekAdvantage?: BirdcreekAdvantageCard;
  description?: RichTextSource;
  services?: Service[];
  /** Sanity override for PostHog `services-section-style` experiment. */
  servicesStyle?: ServicesStyleVariant;
  tagline?: string;
  title?: React.ReactNode;
  /** Headline image masks for the typographic-alt layout (`servicesSection.typographicArt`). */
  typographicArt?: ServicesTypographicArt;
}

export interface ExpertiseItem {
  desc: RichTextSource;
  id: string;
  /** Sanity CDN or site path used as `img` src */
  image?: string;
  title: string;
}

export interface ExpertiseProps {
  items?: ExpertiseItem[];
  tagline?: string;
  title?: string;
}

export interface Testimonial {
  image: string;
  name: string;
  quote: string;
  role: string;
}

export interface TestimonialsProps {
  /** When set, overrides `VITE_ELFSIGHT_WIDGET_ID` for this embed */
  elfsightWidgetId?: string;
  /** Shown when no widget id is configured (Portable Text; links allowed). */
  emptyStateNote?: RichTextSource;
  tagline?: string;
  testimonials?: Testimonial[];
  title?: string;
}

export interface ContactInfo {
  icon: React.ElementType;
  label: string;
  value: string;
}

export interface ContactServiceOption {
  label: string;
  value: string;
}

export interface ContactProps {
  contactInfo?: ContactInfo[];
  email?: string;
  formLabels?: {
    name?: string;
    email?: string;
    service?: string;
    property?: string;
    message?: string;
    button?: string;
  };
  location?: string;
  phone?: string;
  /** Defaults to shared roofing options from repo-root `contactServiceOptions.ts` */
  serviceOptions?: readonly ContactServiceOption[];
  tagline?: string;
  title?: string;
}

export interface FooterProps {
  copyrightText?: string;
  description?: RichTextSource;
  legalLinks?: NavItem[];
  logoText?: string;
  newsletterDesc?: string;
  newsletterTitle?: string;
  partnerText?: string;
  quickLinks?: NavItem[];
  StatText?: string;
  socialLinks?: {
    icon: IconoirIconComponent;
    href: string;
    platform?: string;
  }[];
}

export interface SocialShareBarProps {
  heading?: string;
  /** Used in share URLs; formatting is flattened to plain text. */
  shareText?: RichTextSource;
}

export interface FaqItem {
  _key?: string;
  /** Rich text in the UI; JSON-LD uses flattened plain text. */
  answer: RichTextSource;
  question: string;
}

export interface FaqProps {
  /** Background color of the section. Defaults to `theme.colors.paper`. Pass `"transparent"` to inherit the page background. */
  backgroundColor?: string;
  /** When false, skips FAQPage JSON-LD (use when multiple FAQ blocks share one page). */
  includeJsonLd?: boolean;
  intro?: RichTextSource;
  items?: FaqItem[];
  paddingTop?: string;
  /** Section element id for in-page anchors. Defaults to `faq`. */
  sectionId?: string;
  tagline?: string;
  title?: string;
}

export interface ServiceAreaEntry {
  clientCount: number;
  countyKey: string;
  displayName: string;
}

export interface ServiceAreaMapProps {
  areas?: ServiceAreaEntry[];
  description?: string;
  eyebrow?: string;
  title?: string;
}

export interface RoofInspectionHotspotData {
  /** Sanity array item key — stable identity for React keys across edits. */
  _key?: string;
  calloutBody: string;
  calloutTitle: string;
  direction: "top" | "right" | "left" | "bottom";
  /** Short nav label shown in the left rail. */
  label: string;
  /** model-viewer surface normal components. */
  norm3dX?: number;
  norm3dY?: number;
  norm3dZ?: number;
  /** model-viewer world-space position components in metres. */
  pos3dX?: number;
  pos3dY?: number;
  pos3dZ?: number;
  watchFor: string;
}

export interface RoofInspectionSectionProps {
  /** URL of the diagram image. Defaults to /roof-sidecut.svg. */
  diagramImageUrl?: string;
  /**
   * CMS-driven hotspot definitions. When present these replace the
   * built-in CHAPTERS default from data.ts.
   */
  hotspots?: RoofInspectionHotspotData[];
  kicker?: string;
  lede?: string;
  /** Third title line under the main heading in the rail. */
  subtitle?: string;
  titleLine1?: string;
  titleLine2?: string;
}

export interface ArticlesTeaserProps {
  eyebrow?: string;
  intro?: RichTextSource;
  posts: PostListItem[];
  title?: string;
  viewAllLabel?: string;
}

export interface EstimatorOption {
  _key?: string;
  description?: string;
  /** Flat dollars this option adds regardless of size. */
  flatAdd?: number;
  /** Optional public asset path used as option artwork in the estimator wizard. */
  illustration?: string;
  label: string;
  /** Dollars per square foot this option adds to the running rate. */
  pricePerSqftAdd?: number;
  /** Home size midpoint; only read on the question with `drivesSquareFootage`. */
  sqftMidpoint?: number;
  /** Multiplier applied to the running square footage (for stories, complexity, pitch). */
  sqftMultiplier?: number;
}

export interface EstimatorQuestion {
  _key?: string;
  /** When true, the selected option's `sqftMidpoint` sets the home size. */
  drivesSquareFootage?: boolean;
  helpText?: string;
  /** When true, the selected option's `sqftMultiplier` multiplies the running square footage. */
  multipliesSquareFootage?: boolean;
  options: EstimatorOption[];
  prompt: string;
}

export interface EstimatorProps {
  /** Flat amount added to every estimate. */
  baseFee?: number;
  /** Starting price per square foot before option modifiers. */
  baseRatePerSqft?: number;
  currency?: string;
  description?: string;
  disclaimer?: string;
  eyebrow?: string;
  questions?: EstimatorQuestion[];
  /** Half-width of the shown range, as a percent (15 = ±15%). */
  rangeSpreadPercent?: number;
  resultHeading?: string;
  /** Section element id for in-page anchors. Defaults to `estimator`. */
  sectionId?: string;
  startButtonLabel?: string;
  title?: string;
}

/** Resolved /estimate page content: estimator config + SEO + homepage banner copy. */
export interface EstimatorPageContent extends EstimatorProps {
  bannerCtaLabel?: string;
  bannerEyebrow?: string;
  bannerHeadline?: string;
  seoDescription?: string;
  seoTitle?: string;
}
