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
  city: "Austin",
  country: "US",
  description:
    "Birdcreek Roofing consultant in Austin, Texas: roof assessments, insurance claim advocacy, and project oversight—with installation by the same Birdcreek team.",
  email: "tandra@birdcreekroofing.com",
  facebook: "https://www.facebook.com/tandra.peters.3",
  legalName: "Tandra Peters Consulting",
  name: "Tandra Peters — Roofing consultation",
  parentOrganization: "Birdcreek Roofing",
  priceRange: "$$",
  state: "Texas",
  stateCode: "TX",
  telephone: "+1-512-968-3965",
} as const;

export const PERSON = {
  description:
    "Tandra Peters is a roofing consultant with Birdcreek Roofing in Austin, Texas. She helps homeowners with roof assessments, insurance claim advocacy, and project oversight—paired with installation by the Birdcreek team.",
  jobTitle: "Roofing Consultant",
  knowsAbout: [
    "Roof assessments and inspections",
    "Insurance claim advocacy for roof damage",
    "Storm and hail damage roofing claims",
    "Asphalt shingle roofing",
    "Metal roofing",
    "Commercial roofing",
    "Roof replacement project oversight",
  ],
  name: "Tandra Peters",
  worksFor: "Birdcreek Roofing",
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
    description:
      "On-site roof inspection to document condition, damage, and remaining life before a claim or replacement.",
    name: "Roof assessment",
  },
  {
    description:
      "Help filing and supporting roof insurance claims, including supplements, so homeowners get a fair outcome.",
    name: "Insurance claim advocacy",
  },
  {
    description:
      "Oversight of the roof replacement from approval through installation by the Birdcreek Roofing team.",
    name: "Project oversight",
  },
];

const areaServedNodes = () => [
  {
    "@type": "City",
    containedInPlace: { "@type": "State", name: BUSINESS.state },
    name: BUSINESS.city,
  },
  { "@type": "State", name: BUSINESS.state },
  ...SERVICE_AREAS.map((area) => ({
    "@type": "AdministrativeArea",
    containedInPlace: { "@type": "State", name: BUSINESS.state },
    name: area.county,
  })),
];

/** RoofingContractor (a LocalBusiness subtype) describing the consulting service. */
export const buildLocalBusinessSchema = (
  siteUrlEnv?: string
): Record<string, unknown> => {
  const url = normalizeOrigin(siteUrlEnv);
  return {
    "@context": "https://schema.org",
    "@id": `${url}/#business`,
    "@type": "RoofingContractor",
    address: {
      "@type": "PostalAddress",
      addressCountry: BUSINESS.country,
      addressLocality: BUSINESS.city,
      addressRegion: BUSINESS.stateCode,
    },
    areaServed: areaServedNodes(),
    description: BUSINESS.description,
    email: BUSINESS.email,
    makesOffer: SERVICES.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        description: service.description,
        name: service.name,
      },
    })),
    name: BUSINESS.name,
    parentOrganization: {
      "@type": "Organization",
      name: BUSINESS.parentOrganization,
    },
    priceRange: BUSINESS.priceRange,
    sameAs: [BUSINESS.facebook],
    telephone: BUSINESS.telephone,
    url,
  };
};

/** Person schema for Tandra Peters (entity recognition for AI / search). */
export const buildPersonSchema = (
  siteUrlEnv?: string
): Record<string, unknown> => {
  const url = normalizeOrigin(siteUrlEnv);
  return {
    "@context": "https://schema.org",
    "@id": `${url}/#tandra-peters`,
    "@type": "Person",
    address: {
      "@type": "PostalAddress",
      addressCountry: BUSINESS.country,
      addressLocality: BUSINESS.city,
      addressRegion: BUSINESS.stateCode,
    },
    description: PERSON.description,
    email: BUSINESS.email,
    jobTitle: PERSON.jobTitle,
    knowsAbout: [...PERSON.knowsAbout],
    name: PERSON.name,
    sameAs: [BUSINESS.facebook],
    telephone: BUSINESS.telephone,
    url,
    worksFor: {
      "@type": "Organization",
      name: PERSON.worksFor,
    },
  };
};
