import { useFeatureFlagVariantKey } from "@posthog/react";
import React from "react";

import type { HeroProps } from "../types";

import { Hero } from "./Hero";
import { HeroDualCTARail } from "./hero/HeroDualCTARail";
import { HeroGlassOverlay } from "./hero/HeroGlassOverlay";
import { HeroPillNav } from "./hero/HeroPillNav";

/**
 * PostHog A/B test router for the hero banner.
 *
 * Feature flag: hero-banner-style
 *   control            → original Hero (default fallback)
 *   glass-overlay      → centered-logo split-link nav, transparent→glass
 *   dual-cta-rail      → opaque sticky rail with dual outlined+filled CTAs
 *   dark-floating-pill → floating pill nav, full-bleed photo
 *
 * The Sanity `heroStyle` field overrides the flag for CMS preview and QA.
 * useFeatureFlagVariantKey re-renders reactively when flags load or the
 * toolbar overrides the flag — unlike getFeatureFlag() which only reads
 * the cached value at mount time.
 */
export const HeroVariant: React.FC<HeroProps> = ({ heroStyle, ...props }) => {
  const flagVariant = useFeatureFlagVariantKey("hero-banner-style");
  const variant = heroStyle ?? flagVariant;

  if (variant === "glass-overlay") return <HeroGlassOverlay {...props} />;
  if (variant === "dual-cta-rail") return <HeroDualCTARail {...props} />;
  if (variant === "dark-floating-pill") return <HeroPillNav {...props} />;

  // control — always the safe fallback
  return <Hero {...props} />;
};
