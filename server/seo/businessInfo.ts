/**
 * Single source of truth for the business / person facts used to build
 * schema.org JSON-LD for both the build-time prerender (scripts/prerender)
 * and the client runtime (src/components/SeoStructuredData).
 *
 * Keep this framework-neutral: no imports from `src/` or browser globals so
 * Node build scripts can import it directly.
 */

export const DEFAULT_SITE_URL = "https://www.tandra.me";

const TRAILING_SLASH_RE = /\/$/;

export const normalizeOrigin = (value?: string): string =>
  (value?.trim() || DEFAULT_SITE_URL).replace(TRAILING_SLASH_RE, "");

export const BUSINESS = {
  name: "Tandra Peters — Roofing consultation",
  legalName: "Tandra Peters Consulting",
  description:
    "Birdcreek Roofing consultant in Austin, Texas: roof assessments, insurance claim advocacy, and project oversight—with installation by the same Birdcreek team.",
  telephone: "+1-512-968-3965",
  email: "tandra@birdcreekroofing.com",
  priceRange: "$$",
  facebook: "https://www.facebook.com/tandra.peters.3",
  city: "Austin",
  state: "Texas",
  stateCode: "TX",
  country: "US",
  parentOrganization: "Birdcreek Roofing",
} as const;

export const PERSON = {
  name: "Tandra Peters",
  jobTitle: "Roofing Consultant",
  worksFor: "Birdcreek Roofing",
  description:
    "Tandra Peters is a roofing consultant with Birdcreek Roofing in Austin, Texas. She helps homeowners with roof assessments, insurance claim advocacy, and project oversight—paired with installation by the Birdcreek team.",
  knowsAbout: [
    "Roof assessments and inspections",
    "Insurance claim advocacy for roof damage",
    "Storm and hail damage roofing claims",
    "Asphalt shingle roofing",
    "Metal roofing",
    "Commercial roofing",
    "Roof replacement project oversight",
  ],
} as const;

/**
 * Counties / cities served. Mirrors the Sanity serviceAreaMap intent
 * (Travis/Austin plus the broader Texas service area). Used for `areaServed`.
 */
export const SERVICE_AREAS: { city: string; county: string }[] = [
  { city: "Austin", county: "Travis County" },
  { city: "San Antonio", county: "Bexar County" },
  { city: "Waco", county: "McLennan County" },
  { city: "Fort Worth", county: "Tarrant County" },
  { city: "Dallas", county: "Dallas County" },
];

export const SERVICES: { name: string; description: string }[] = [
  {
    name: "Roof assessment",
    description:
      "On-site roof inspection to document condition, damage, and remaining life before a claim or replacement.",
  },
  {
    name: "Insurance claim advocacy",
    description:
      "Help filing and supporting roof insurance claims, including supplements, so homeowners get a fair outcome.",
  },
  {
    name: "Project oversight",
    description:
      "Oversight of the roof replacement from approval through installation by the Birdcreek Roofing team.",
  },
];

const areaServedNodes = () => [
  {
    "@type": "City",
    name: BUSINESS.city,
    containedInPlace: { "@type": "State", name: BUSINESS.state },
  },
  { "@type": "State", name: BUSINESS.state },
  ...SERVICE_AREAS.map((area) => ({
    "@type": "AdministrativeArea",
    name: area.county,
    containedInPlace: { "@type": "State", name: BUSINESS.state },
  })),
];

/** RoofingContractor (a LocalBusiness subtype) describing the consulting service. */
export const buildLocalBusinessSchema = (
  siteUrlEnv?: string
): Record<string, unknown> => {
  const url = normalizeOrigin(siteUrlEnv);
  return {
    "@context": "https://schema.org",
    "@type": "RoofingContractor",
    "@id": `${url}/#business`,
    name: BUSINESS.name,
    description: BUSINESS.description,
    url,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    priceRange: BUSINESS.priceRange,
    address: {
      "@type": "PostalAddress",
      addressLocality: BUSINESS.city,
      addressRegion: BUSINESS.stateCode,
      addressCountry: BUSINESS.country,
    },
    areaServed: areaServedNodes(),
    parentOrganization: {
      "@type": "Organization",
      name: BUSINESS.parentOrganization,
    },
    makesOffer: SERVICES.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: service.name,
        description: service.description,
      },
    })),
    sameAs: [BUSINESS.facebook],
  };
};

/** Person schema for Tandra Peters (entity recognition for AI / search). */
export const buildPersonSchema = (
  siteUrlEnv?: string
): Record<string, unknown> => {
  const url = normalizeOrigin(siteUrlEnv);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${url}/#tandra-peters`,
    name: PERSON.name,
    jobTitle: PERSON.jobTitle,
    description: PERSON.description,
    url,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    knowsAbout: [...PERSON.knowsAbout],
    worksFor: {
      "@type": "Organization",
      name: PERSON.worksFor,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: BUSINESS.city,
      addressRegion: BUSINESS.stateCode,
      addressCountry: BUSINESS.country,
    },
    sameAs: [BUSINESS.facebook],
  };
};
