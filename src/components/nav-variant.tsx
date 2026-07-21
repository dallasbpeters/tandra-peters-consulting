import type React from "react";

import { useHeroBannerVariant } from "../hooks/use-hero-banner-variant";
import type { HeroProps, NavProps } from "../types";
import { Nav } from "./nav";
import { NavDualCTARail } from "./nav/nav-dual-cta-rail";
import { NavGlassOverlay } from "./nav/nav-glass-overlay";
import { NavPillNav } from "./nav/nav-pill-nav";

type NavVariantProps = NavProps & {
  /** Mirrors HeroVariant — Sanity heroStyle overrides the PostHog flag for CMS preview. */
  heroStyle?: HeroProps["heroStyle"];
};

/**
 * Renders the site navigation appropriate for the active hero A/B variant.
 * Mirrors HeroVariant: reads the same PostHog flag and Sanity override.
 *
 * Drop-in replacement for <Nav> inside SitePageChrome.
 */
export const NavVariant: React.FC<NavVariantProps> = ({
  heroStyle,
  ...navProps
}) => {
  const { variant, isResolved } = useHeroBannerVariant(heroStyle);

  if (!variant) {
    if (!isResolved) {
      return (
        <div
          aria-hidden
          className="site-nav-vt"
          style={{ minHeight: "4.5rem", visibility: "hidden" }}
        />
      );
    }

    return <Nav {...navProps} />;
  }

  if (variant === "glass-overlay") {
    return <NavGlassOverlay {...navProps} />;
  }
  if (variant === "dual-cta-rail") {
    return <NavDualCTARail {...navProps} />;
  }
  if (variant === "dark-floating-pill") {
    return <NavPillNav {...navProps} />;
  }

  return <Nav {...navProps} />;
};
