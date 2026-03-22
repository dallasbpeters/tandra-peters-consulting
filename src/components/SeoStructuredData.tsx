import { useEffect } from "react";

const SCRIPT_ID = "professional-service-json-ld";

const resolveSiteOrigin = () => {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://www.tandrapeters.com";
};

/**
 * Injects ProfessionalService JSON-LD for SEO / rich results (complements FAQPage in Faq).
 */
export const SeoStructuredData = () => {
  useEffect(() => {
    const url = resolveSiteOrigin();
    const data = {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name: "Tandra Peters — Roofing consultation",
      description:
        "BirdCreek Roofing consultant in Austin, Texas: roof assessments, insurance claim advocacy, and project oversight—with installation by the same BirdCreek team.",
      url,
      telephone: "+1-512-968-3965",
      email: "tandra@birdcreekroofing.com",
      areaServed: [
        {
          "@type": "City",
          name: "Austin",
          containedInPlace: { "@type": "State", name: "Texas" },
        },
        { "@type": "State", name: "Texas" },
      ],
      priceRange: "$$",
      sameAs: [
        "https://www.linkedin.com/in/tandra-peters-b8b38026/",
        "https://www.instagram.com/tandra/",
        "https://www.facebook.com/tandra.peters.3",
      ],
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  return null;
};
