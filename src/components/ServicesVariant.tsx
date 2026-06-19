import type React from "react";
import { useServicesSectionVariant } from "../hooks/useServicesSectionVariant";
import type { ServicesProps } from "../types";
import { Services } from "./Services";
import { ServicesAlt } from "./ServicesAlt";

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
export const ServicesVariant: React.FC<ServicesProps> = ({
  servicesStyle,
  ...props
}) => {
  const { variant } = useServicesSectionVariant(servicesStyle);

  if (variant === "typographic-alt") {
    return <ServicesAlt {...props} />;
  }

  return <Services {...props} />;
};

export default ServicesVariant;
