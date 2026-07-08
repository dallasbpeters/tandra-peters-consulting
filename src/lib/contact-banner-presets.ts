import { Calculator, HelpCircle, Phone } from "iconoir-react";
import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";

import { mix, theme } from "../theme";

export type ContactBannerCtaIcon = ForwardRefExoticComponent<
  Omit<SVGProps<SVGSVGElement>, "ref"> & RefAttributes<SVGSVGElement>
>;

export interface ContactBannerProps {
  accentGlowColor?: string;
  /** Accessible name for the outer `<section>`. */
  ariaLabel?: string;
  backgroundColor?: string;
  className?: string;
  /** Icon inside the CTA pill. Defaults to `Phone`. */
  ctaIcon?: ContactBannerCtaIcon;
  eyebrow?: string;
  eyebrowColor?: string;
  eyebrowColorLight?: string;
  /** Grid line color for the banner background texture. Defaults to a subtle mix of `textColor`. */
  gridColor?: string;
  headline?: string;
  iconColor?: string;
  iconColorDark?: string;
  iconColorLight?: string;
  iconColorVeryDark?: string;
  /** Accessible name for the CTA link. Defaults to "Call or text {phoneDisplay}". */
  phoneAriaLabel?: string;
  phoneDisplay?: string;
  /** Defaults to `tel:${phoneTel}` when omitted. */
  phoneHref?: string;
  phoneIconBackground?: string;
  phoneIconHoverBackground?: string;
  phoneLabel?: string;
  phoneLinkBackground?: string;
  /** CTA pill background on hover/focus. */
  phoneLinkHoverBackground?: string;
  /** CTA label text ("Call or text", etc.) on hover/focus. Defaults to `iconColorLight` or `textColor`. */
  phoneLinkHoverLabelColor?: string;
  /** CTA pill focus outline color on hover/focus. */
  phoneLinkHoverOutline?: string;
  /** CTA pill box-shadow on hover/focus. */
  phoneLinkHoverShadow?: string;
  /** CTA main text (phone number / link title) on hover/focus. Defaults to `textColor`. */
  phoneLinkHoverTextColor?: string;
  phoneTel?: string;
  pulseColor?: string;
  pulsePingColor?: string;
  textColor?: string;
}

export const CONTACT_BANNER_DEFAULT_PHONE_DISPLAY = "(512) 968-3965";
export const CONTACT_BANNER_DEFAULT_PHONE_TEL = "+15129683965";

/** Default free-inspection banner — reuse via spread on other pages. */
export const CONTACT_BANNER_FREE_INSPECTION: ContactBannerProps = {
  accentGlowColor: theme.colors.black,
  ariaLabel: "Schedule a free roof inspection",
  ctaIcon: Phone,
  eyebrow: "Zero Cost · No Obligation",
  headline: "Free Inspection",
  phoneLabel: "Call or text",
  phoneLinkBackground: mix(theme.colors.everglade, 40),
  phoneLinkHoverBackground: mix(theme.colors.black, 60),
  phoneLinkHoverShadow: mix(theme.colors.white, 15),
};

/** Homepage → /estimate CTA. Copy is overridden from the estimatorPage CMS doc. */
export const CONTACT_BANNER_ESTIMATOR: ContactBannerProps = {
  ariaLabel: "Estimate your roof cost",
  backgroundColor: theme.colors.everglade,
  ctaIcon: Calculator,
  eyebrow: "Ballpark Pricing · 60 Seconds",
  headline: "Estimate Your Roof",
  phoneAriaLabel: "Open the roof cost estimator",
  phoneDisplay: "Start estimate",
  phoneHref: "/estimate",
  phoneLabel: "No obligation",
  phoneLinkBackground: mix(theme.colors.everglade, 40),
  phoneLinkHoverBackground: mix(theme.colors.black, 60),
  phoneLinkHoverShadow: mix(theme.colors.white, 15),
};

/** Workflow page — gold FAQ card linking to `/insurance-faqs`. */
export const CONTACT_BANNER_WORKFLOW_FAQ: ContactBannerProps = {
  accentGlowColor: theme.palette.gold["900"],
  ariaLabel: "Insurance claim FAQ",
  backgroundColor: theme.palette.gold["500"],
  className: "contact-banner--workflow-faq",
  ctaIcon: HelpCircle,
  eyebrow: "After the diagram",
  eyebrowColor: theme.colors.everglade["900"],
  eyebrowColorLight: theme.colors.everglade["800"],
  gridColor: mix(theme.palette.purple["300"], 10),
  headline: "Insurance claim FAQ",
  iconColor: theme.colors.white,
  iconColorDark: theme.colors.everglade["500"],
  iconColorLight: theme.colors.everglade["300"],
  iconColorVeryDark: theme.colors.everglade["700"],
  phoneAriaLabel: "View insurance claim frequently asked questions",
  phoneDisplay: "View all FAQs",
  phoneHref: "/insurance-faqs",
  phoneIconBackground: theme.colors.black,
  phoneIconHoverBackground: theme.palette.coral["600"],
  phoneLabel: "Browse answers",
  phoneLinkBackground: theme.palette.purple["200"],
  phoneLinkHoverBackground: theme.palette.purple["400"],
  phoneLinkHoverLabelColor: mix(theme.colors.white, 75),
  phoneLinkHoverOutline: theme.palette.purple["500"],
  phoneLinkHoverShadow: mix(theme.palette.purple["500"], 25),
  phoneLinkHoverTextColor: theme.colors.white,
  textColor: theme.colors.black,
};
