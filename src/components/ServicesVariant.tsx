import { useFeatureFlagVariantKey } from "@posthog/react";
import React from "react";

import type { ServicesProps } from "../types";

import { Services } from "./Services";
import { ServicesAlt } from "./ServicesAlt";

/**
 * PostHog A/B test router for the services section.
 *
 * Feature flag: services-section-style
 *   control         → original Services grid (default fallback)
 *   typographic-alt → full-bleed typographic ServicesAlt layout
 *
 * Sanity `servicesStyle` overrides the flag for CMS preview and QA.
 */
export const ServicesVariant: React.FC<ServicesProps> = ({ servicesStyle, ...props }) => {
  const flagVariant = useFeatureFlagVariantKey("services-section-style");
  const variant = servicesStyle || flagVariant;

  if (variant === "typographic-alt") {
    return <ServicesAlt {...props} />;
  }

  return <Services {...props} />;
};

export default ServicesVariant;
