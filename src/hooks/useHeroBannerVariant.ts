import { useFeatureFlagVariantKey, usePostHog } from "@posthog/react";
import { useEffect } from "react";

import type { HeroProps } from "../types";

export const HERO_BANNER_STYLE_FLAG = "hero-banner-style";

export type HeroBannerStyle = NonNullable<HeroProps["heroStyle"]>;

const VALID_VARIANTS = new Set<HeroBannerStyle>([
  "control",
  "glass-overlay",
  "dual-cta-rail",
  "dark-floating-pill",
]);

const SESSION_CACHE_KEY = "tandra:hero-banner-style";

let memoryCache: HeroBannerStyle | undefined;

const readSessionCache = (): HeroBannerStyle | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const stored = window.sessionStorage.getItem(SESSION_CACHE_KEY);
    if (stored && VALID_VARIANTS.has(stored as HeroBannerStyle)) {
      return stored as HeroBannerStyle;
    }
  } catch {
    // sessionStorage unavailable
  }

  return undefined;
};

const writeSessionCache = (variant: HeroBannerStyle) => {
  memoryCache = variant;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(SESSION_CACHE_KEY, variant);
  } catch {
    // sessionStorage unavailable
  }
};

const normalizeVariant = (
  value: string | boolean | undefined | null,
): HeroBannerStyle | undefined => {
  if (value === undefined || value === null || value === false) {
    return undefined;
  }

  if (typeof value === "string" && VALID_VARIANTS.has(value as HeroBannerStyle)) {
    return value as HeroBannerStyle;
  }

  return undefined;
};

const readLiveVariant = (posthog: ReturnType<typeof usePostHog>): HeroBannerStyle | undefined =>
  normalizeVariant(posthog.getFeatureFlag(HERO_BANNER_STYLE_FLAG));

/**
 * Resolves the active hero/nav experiment variant without flashing control
 * while PostHog flags are still loading.
 *
 * `useFeatureFlagVariantKey` can return `undefined` when `bootstrap.featureFlags`
 * is an empty object (see main.tsx) even if persisted flags exist. We merge the
 * hook value with a synchronous `getFeatureFlag` read and a session cache so
 * off-home navigations keep the last known variant.
 */
export const useHeroBannerVariant = (heroStyle?: HeroProps["heroStyle"]) => {
  const posthog = usePostHog();
  const hookVariant = useFeatureFlagVariantKey(HERO_BANNER_STYLE_FLAG);
  const syncVariant = readLiveVariant(posthog);
  const hookNormalized = normalizeVariant(hookVariant);
  const liveVariant = hookNormalized ?? syncVariant;

  if (liveVariant) {
    writeSessionCache(liveVariant);
  }

  useEffect(() => {
    if (liveVariant) {
      writeSessionCache(liveVariant);
    }
  }, [liveVariant]);

  if (heroStyle) {
    return { variant: heroStyle, isResolved: true };
  }

  if (liveVariant) {
    return { variant: liveVariant, isResolved: true };
  }

  const cached = memoryCache ?? readSessionCache();
  const flagsReady =
    Boolean(posthog.featureFlags?.hasLoadedFlags) ||
    (posthog.featureFlags?.getFlags?.().length ?? 0) > 0;

  if (cached) {
    return { variant: cached, isResolved: flagsReady };
  }

  return { variant: undefined, isResolved: flagsReady };
};
