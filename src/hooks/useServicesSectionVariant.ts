import { useFeatureFlagVariantKey, usePostHog } from "@posthog/react";
import { useEffect } from "react";

import type { ServicesStyleVariant } from "../types";

export const SERVICES_SECTION_STYLE_FLAG = "services-section-style";

const VALID_VARIANTS = new Set<ServicesStyleVariant>(["control", "typographic-alt"]);

const normalizeVariant = (
  value: string | boolean | undefined | null,
): ServicesStyleVariant | undefined => {
  if (value === undefined || value === null || value === false) {
    return undefined;
  }

  if (typeof value === "string" && VALID_VARIANTS.has(value as ServicesStyleVariant)) {
    return value as ServicesStyleVariant;
  }

  return undefined;
};

const isExperimentEnabled = () => import.meta.env.VITE_SERVICES_STYLE_EXPERIMENT === "true";

/**
 * Resolves which services layout to render.
 *
 * Priority:
 * 1. Sanity `servicesStyle` (CMS preview / forced layout)
 * 2. PostHog `services-section-style` when VITE_SERVICES_STYLE_EXPERIMENT=true
 * 3. Control grid (production default while experiment is gated off)
 */
export const useServicesSectionVariant = (servicesStyle?: ServicesStyleVariant) => {
  const posthog = usePostHog();
  const hookVariant = useFeatureFlagVariantKey(SERVICES_SECTION_STYLE_FLAG);
  const syncVariant = normalizeVariant(posthog?.getFeatureFlag(SERVICES_SECTION_STYLE_FLAG));
  const flagVariant = normalizeVariant(hookVariant) ?? syncVariant;
  const experimentEnabled = isExperimentEnabled();

  useEffect(() => {
    if (!import.meta.env.DEV || servicesStyle || !experimentEnabled || !flagVariant) {
      return;
    }

    console.info(
      `[ServicesVariant] PostHog assigned "${flagVariant}" for ${SERVICES_SECTION_STYLE_FLAG}.`,
    );
  }, [experimentEnabled, flagVariant, servicesStyle]);

  if (servicesStyle) {
    return { variant: servicesStyle, source: "sanity" as const };
  }

  if (experimentEnabled && flagVariant === "typographic-alt") {
    return { variant: "typographic-alt", source: "posthog" as const };
  }

  if (experimentEnabled && flagVariant === "control") {
    return { variant: "control", source: "posthog" as const };
  }

  return { variant: "control" as const, source: "default" as const };
};
