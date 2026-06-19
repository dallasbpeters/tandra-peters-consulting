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
  eyebrow: "Zero Cost · No Obligation",
  headline: "Free Inspection",
  phoneLabel: "Call or text",
  ctaIcon: Phone,
  ariaLabel: "Schedule a free roof inspection",
  phoneLinkBackground: mix(theme.colors.everglade, 40),
  phoneLinkHoverBackground: mix(theme.colors.black, 60),
  phoneLinkHoverShadow: mix(theme.colors.white, 15),
  accentGlowColor: theme.colors.black,
};

/** Homepage → /estimate CTA. Copy is overridden from the estimatorPage CMS doc. */
export const CONTACT_BANNER_ESTIMATOR: ContactBannerProps = {
  eyebrow: "Ballpark Pricing · 60 Seconds",
  headline: "Estimate Your Roof",
  phoneLabel: "No obligation",
  phoneDisplay: "Start estimate",
  phoneHref: "/estimate",
  ctaIcon: Calculator,
  phoneAriaLabel: "Open the roof cost estimator",
  ariaLabel: "Estimate your roof cost",
  backgroundColor: theme.colors.everglade,
  phoneLinkBackground: mix(theme.colors.everglade, 40),
  phoneLinkHoverBackground: mix(theme.colors.black, 60),
  phoneLinkHoverShadow: mix(theme.colors.white, 15),
};

/** Workflow page — gold FAQ card linking to `/insurance-faqs`. */
export const CONTACT_BANNER_WORKFLOW_FAQ: ContactBannerProps = {
  eyebrow: "After the diagram",
  headline: "Insurance claim FAQ",
  phoneLabel: "Browse answers",
  phoneDisplay: "View all FAQs",
  phoneHref: "/insurance-faqs",
  ctaIcon: HelpCircle,
  phoneAriaLabel: "View insurance claim frequently asked questions",
  ariaLabel: "Insurance claim FAQ",
  backgroundColor: theme.palette.gold["500"],
  textColor: theme.colors.black,
  eyebrowColor: theme.colors.everglade["900"],
  eyebrowColorLight: theme.colors.everglade["800"],
  accentGlowColor: theme.palette.gold["900"],
  iconColor: theme.colors.white,
  iconColorLight: theme.colors.everglade["300"],
  iconColorDark: theme.colors.everglade["500"],
  iconColorVeryDark: theme.colors.everglade["700"],
  phoneLinkBackground: theme.palette.purple["200"],
  phoneLinkHoverBackground: theme.palette.purple["400"],
  phoneLinkHoverShadow: mix(theme.palette.purple["500"], 25),
  phoneLinkHoverOutline: theme.palette.purple["500"],
  phoneLinkHoverTextColor: theme.colors.white,
  phoneLinkHoverLabelColor: mix(theme.colors.white, 75),
  phoneIconBackground: theme.colors.black,
  phoneIconHoverBackground: theme.palette.coral["600"],
  gridColor: mix(theme.palette.purple["300"], 10),
};
