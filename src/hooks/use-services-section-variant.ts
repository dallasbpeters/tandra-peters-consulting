import { useFeatureFlagVariantKey, usePostHog } from "@posthog/react";

import type { ServicesStyleVariant } from "../types";

export const SERVICES_SECTION_STYLE_FLAG = "services-section-style";

const VALID_VARIANTS = new Set<ServicesStyleVariant>([
  "control",
  "typographic-alt",
]);

const normalizeVariant = (
  value: string | boolean | undefined | null
): ServicesStyleVariant | undefined => {
  if (value === undefined || value === null || value === false) {
    return;
  }

  if (
    typeof value === "string" &&
    VALID_VARIANTS.has(value as ServicesStyleVariant)
  ) {
    return value as ServicesStyleVariant;
  }

  return;
};

/**
 * Resolves which services layout to render.
 *
 * Priority:
 * 1. Sanity `servicesStyle` (CMS preview / forced layout)
 * 2. PostHog `services-section-style` variant (control | typographic-alt)
 * 3. Control grid while flags load or variant is unrecognized
 */
export const useServicesSectionVariant = (
  servicesStyle?: ServicesStyleVariant
) => {
  const posthog = usePostHog();
  const forcedVariant = normalizeVariant(servicesStyle);
  const hookVariant = useFeatureFlagVariantKey(SERVICES_SECTION_STYLE_FLAG);
  const syncVariant = normalizeVariant(
    posthog?.getFeatureFlag(SERVICES_SECTION_STYLE_FLAG)
  );
  const flagVariant = normalizeVariant(hookVariant) ?? syncVariant;

  if (forcedVariant) {
    return { source: "sanity" as const, variant: forcedVariant };
  }

  if (flagVariant === "typographic-alt") {
    return { source: "posthog" as const, variant: "typographic-alt" };
  }

  return {
    source: flagVariant ? "posthog" : ("default" as const),
    variant: "control" as const,
  };
};
