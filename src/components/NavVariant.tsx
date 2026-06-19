import type React from "react";
import { useHeroBannerVariant } from "../hooks/useHeroBannerVariant";
import type { HeroProps, NavProps } from "../types";
import { NavDualCTARail } from "./hero/NavDualCtaRail";
import { NavGlassOverlay } from "./hero/NavGlassOverlay";
import { NavPillNav } from "./hero/NavPillNav";
import { Nav } from "./Nav";

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
