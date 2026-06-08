import React from "react";

import type { ServicesProps } from "../types";

import {
  SERVICES_SECTION_STYLE_FLAG,
  useServicesSectionVariant,
} from "../hooks/useServicesSectionVariant";
import { Services } from "./Services";
import { ServicesAlt } from "./ServicesAlt";

export { SERVICES_SECTION_STYLE_FLAG };

/**
 * PostHog A/B test router for the services section.
 *
 * Feature flag: services-section-style
 *   control         → original Services grid
 *   typographic-alt → full-bleed typographic ServicesAlt layout
 *
 * Sanity `servicesStyle` overrides the flag for CMS preview and QA.
 * When Sanity is blank, PostHog variant rollout decides (sticky per user).
 */
export const ServicesVariant: React.FC<ServicesProps> = ({ servicesStyle, ...props }) => {
  const { variant } = useServicesSectionVariant(servicesStyle);

  if (variant === "typographic-alt") {
    return <ServicesAlt {...props} />;
  }

  return <Services {...props} />;
};

export default ServicesVariant;
