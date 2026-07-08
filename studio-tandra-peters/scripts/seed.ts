/** Upsert `siteSettings` + `homePage`, upload public images, sync home article refs. `pnpm seed` */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@sanity/client";
import { config } from "dotenv";

import { patchHomePageArticleRefs } from "./articlePostsSeed";
import {
  articlesPageSeed,
  homePageSeed,
  siteSettingsNavLogoImageUrl,
  siteSettingsSeed,
  workflowPageSeed,
} from "./seedDefaults";
import { uploadImageFromFile, uploadImageFromUrl } from "./uploadSanityImages";
import type { SanityImageValue } from "./uploadSanityImages";

type ServiceRow = (typeof homePageSeed.services.services)[number] & {
  image?: SanityImageValue;
};
type MissionRow = (typeof homePageSeed.mission.values)[number] & {
  image?: SanityImageValue;
};
type ExpertiseRow = (typeof homePageSeed.expertise.items)[number] & {
  image: SanityImageValue;
};

type HomePageSeedWithImages = typeof homePageSeed & {
  hero: typeof homePageSeed.hero & { backgroundImage: SanityImageValue };
  about: typeof homePageSeed.about & { image: SanityImageValue };
  services: Omit<
    typeof homePageSeed.services,
    "services" | "typographicArt"
  > & {
    services: ServiceRow[];
    typographicArt: {
      _type: string;
      baseMaskImage?: SanityImageValue;
      overlayMaskImage?: SanityImageValue;
    };
  };
  mission: Omit<typeof homePageSeed.mission, "values"> & {
    values: MissionRow[];
  };
  expertise: Omit<typeof homePageSeed.expertise, "items"> & {
    items: ExpertiseRow[];
  };
};

type HomePageSection = Record<string, unknown> & {
  _key: string;
  _type: string;
};

const studioRoot = resolve(import.meta.dirname, "..");
const repoRoot = resolve(studioRoot, "..");
const publicDir = resolve(repoRoot, "public");

config({ path: resolve(studioRoot, ".env"), quiet: true });
config({
  override: true,
  path: resolve(studioRoot, ".env.local"),
  quiet: true,
});

const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
if (!token) {
  console.error(
    "Missing SANITY_API_WRITE_TOKEN. Add it to studio-tandra-peters/.env.local or export it in the shell."
  );
  process.exit(1);
}

const client = createClient({
  apiVersion: "2026-05-29",
  dataset: "production",
  projectId: "7irm699i",
  token,
  useCdn: false,
});

const pub = (filename: string) => resolve(publicDir, filename);

const withSectionKey = (
  section: Record<string, unknown> & { _type: string },
  _key: string
): HomePageSection => ({
  ...section,
  _key,
});

const buildHomePageDocument = (homePayload: HomePageSeedWithImages) => ({
  _id: homePayload._id,
  _type: homePayload._type,
  sections: [
    withSectionKey(homePayload.hero, "home-section-hero"),
    withSectionKey(homePayload.marquee, "home-section-marquee"),
    withSectionKey(homePayload.about, "home-section-about"),
    withSectionKey(homePayload.stats, "home-section-stats"),
    withSectionKey(homePayload.services, "home-section-services"),
    {
      _key: "home-section-estimator-banner",
      _type: "contactBannerSection",
      ariaLabel: "Estimate your roof cost",
      ctaIcon: "calculator",
      eyebrow: "Ballpark Pricing · 60 Seconds",
      headline: "Estimate Your Roof",
      phoneAriaLabel: "Open the roof cost estimator",
      phoneDisplay: "Start estimate",
      phoneHref: "/estimate",
      phoneLabel: "No obligation",
    },
    withSectionKey(homePayload.mission, "home-section-mission"),
    withSectionKey(homePayload.expertise, "home-section-expertise"),
    {
      _key: "home-section-featured-video",
      _type: "videoSection",
    },
    withSectionKey(homePayload.testimonials, "home-section-testimonials"),
    withSectionKey(homePayload.faq, "home-section-faq"),
    withSectionKey(homePayload.articlesTeaser, "home-section-articles"),
    {
      _key: "home-section-certifications",
      _type: "certificationsSection",
      title: "Certifications",
    },
    withSectionKey(homePayload.contact, "home-section-contact"),
    withSectionKey(homePayload.socialShare, "home-section-social-share"),
  ],
});

async function main() {
  const navLogoImage = await uploadImageFromUrl(
    client,
    siteSettingsNavLogoImageUrl,
    "nav-logo.jpg"
  );

  const sitePayload = {
    ...siteSettingsSeed,
    navLogoImage,
  };

  const homePayload = structuredClone(homePageSeed) as HomePageSeedWithImages;

  homePayload.hero.backgroundImage = await uploadImageFromFile(
    client,
    pub("roof.png"),
    "roof.png"
  );
  homePayload.about.image = await uploadImageFromFile(
    client,
    pub("tandra.png"),
    "tandra.png"
  );

  const s0 = homePayload.services.services[0];
  if (s0) {
    s0.image = await uploadImageFromFile(
      client,
      pub("roof-2.jpg"),
      "roof-2.jpg"
    );
  }

  homePayload.services.typographicArt = {
    _type: "object",
    baseMaskImage: await uploadImageFromFile(
      client,
      pub("roof-2.jpg"),
      "roof-2-mask-base.jpg"
    ),
    overlayMaskImage: await uploadImageFromFile(
      client,
      pub("metal-roof.jpg"),
      "metal-roof-mask-overlay.jpg"
    ),
  };

  const missionFiles = [
    "Image-1774131541900.jpg",
    "Image-1774131578178.jpg",
    "Image-1774131587458.jpg",
  ] as const;
  for (let i = 0; i < missionFiles.length; i++) {
    const row = homePayload.mission.values[i];
    const file = missionFiles[i];
    if (row && file) {
      row.image = await uploadImageFromFile(client, pub(file), file);
    }
  }

  const expertiseFiles = [
    "shingles.jpg",
    "metal-roof.jpg",
    "commercial.jpg",
    "hail-storm.jpg",
  ] as const;
  for (let i = 0; i < expertiseFiles.length; i++) {
    const row = homePayload.expertise.items[i];
    const file = expertiseFiles[i];
    if (row && file) {
      row.image = await uploadImageFromFile(client, pub(file), file);
    }
  }

  const homeDocument = buildHomePageDocument(homePayload);

  await client
    .transaction()
    .createOrReplace(sitePayload)
    .createOrReplace(homeDocument)
    .createOrReplace(articlesPageSeed)
    .createOrReplace(workflowPageSeed)
    .commit();
  console.log(
    "Seeded siteSettings + homePage + articlesPage + workflowPage (with image assets)"
  );
  await patchHomePageArticleRefs(client);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
