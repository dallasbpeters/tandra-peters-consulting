import { useFeatureFlagVariantKey } from "@posthog/react";
import React from "react";

import type { HeroProps, NavProps } from "../types";

import { NavDualCTARail } from "./hero/NavDualCTARail";
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
export const NavVariant: React.FC<NavVariantProps> = ({ heroStyle, ...navProps }) => {
  const flagVariant = useFeatureFlagVariantKey("hero-banner-style");
  const variant = heroStyle ?? flagVariant;

  if (variant === "glass-overlay") return <NavGlassOverlay {...navProps} />;
  if (variant === "dual-cta-rail") return <NavDualCTARail {...navProps} />;
  if (variant === "dark-floating-pill") return <NavPillNav {...navProps} />;

  // control or flag not yet evaluated → existing Nav
  return <Nav {...navProps} />;
};
