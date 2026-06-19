import { useEffect } from "react";

import {
  buildLocalBusinessSchema,
  buildPersonSchema,
} from "../../server/seo/businessInfo";
import { resolveSiteOrigin } from "../utils/siteUrl";

const BUSINESS_SCRIPT_ID = "professional-service-json-ld";
const PERSON_SCRIPT_ID = "person-json-ld";

const injectJsonLd = (
  id: string,
  data: Record<string, unknown>
): HTMLScriptElement => {
  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
  return script;
};

/**
 * Injects RoofingContractor + Person JSON-LD for SEO / rich results and AI
 * entity recognition (complements FAQPage in Faq). The same schema is baked
 * into the prerendered HTML at build time (scripts/prerender) so non-JS
 * crawlers see it too; this runtime copy keeps SPA navigations covered and is
 * skipped when the prerendered tag is already present.
 */
export const SeoStructuredData = () => {
  useEffect(() => {
    const origin = resolveSiteOrigin();
    const scripts: HTMLScriptElement[] = [];

    if (!document.getElementById(BUSINESS_SCRIPT_ID)) {
      scripts.push(
        injectJsonLd(BUSINESS_SCRIPT_ID, buildLocalBusinessSchema(origin))
      );
    }
    if (!document.getElementById(PERSON_SCRIPT_ID)) {
      scripts.push(injectJsonLd(PERSON_SCRIPT_ID, buildPersonSchema(origin)));
    }

    return () => {
      for (const script of scripts) {
        script.remove();
      }
    };
  }, []);

  return null;
};
