import { lazy, Suspense } from "react";

import HomeRoofInspection from "../components/home-roof-inspection";
import { SeoStructuredData } from "../components/seo-structured-data";
import { SitePageChrome } from "../components/site-page-chrome";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { useSanityRoofInspectionsPage } from "../hooks/use-sanity-roof-inspections-page";
import { buildRoofInspectionChapters } from "../lib/build-roof-inspection-chapters";
import {
  mapSocialShareProps,
  resolveRoofInspectionProps,
} from "../sanity/map-sanity-home";
import { theme } from "../theme";

const Band = lazy(() => import("../components/band"));
const DevAgentation = import.meta.env.DEV
  ? lazy(async () => {
      const module = await import("agentation");
      return { default: module.Agentation };
    })
  : null;
const SocialShareBar = lazy(async () => {
  const module = await import("../components/social-share-bar");
  return { default: module.SocialShareBar };
});

export const RoofInspections = () => {
  const { page, homeRoofInspection, homeSocialShare, loading, error } =
    useSanityRoofInspectionsPage();
  const pageData = page as Record<string, unknown> | null | undefined;
  const seoTitle =
    typeof pageData?.seoTitle === "string" && pageData.seoTitle.trim()
      ? pageData.seoTitle
      : "Tandra Peters | Roofing Consultant | Austin, TX";
  const seoDescription =
    typeof pageData?.seoDescription === "string" &&
    pageData.seoDescription.trim()
      ? pageData.seoDescription
      : "Birdcreek Roofing consultant in Austin for roof assessments, insurance claim advocacy, and project oversight—one team from consultation through Texas installation.";
  const socialShare = page?.socialShare ?? homeSocialShare ?? undefined;
  usePageMetadata({
    description: seoDescription,
    title: seoTitle,
  });

  if (loading && !pageData && !homeRoofInspection) {
    return (
      <section
        aria-label="Loading roof install page"
        className="home-loading-hero"
      />
    );
  }

  if (error && import.meta.env.DEV) {
    console.error("Failed to fetch roof inspections page from Sanity", error);
  }

  const roofInspection = resolveRoofInspectionProps(
    (pageData?.roofInspection as Record<string, unknown> | undefined) ??
      undefined,
    homeRoofInspection ?? undefined
  );
  const chapters = buildRoofInspectionChapters(roofInspection.hotspots);

  return (
    <SitePageChrome>
      <SeoStructuredData />
      <HomeRoofInspection chapters={chapters} roofInspection={roofInspection} />
      {socialShare ? (
        <Suspense fallback={null}>
          <SocialShareBar {...mapSocialShareProps(socialShare)} />
        </Suspense>
      ) : null}
      <Suspense fallback={null}>
        <Band
          colors={[
            theme.colors.evergladeLight,
            theme.colors.evergladeMuted,
            theme.colors.paper,
            theme.colors.purple,
            theme.colors.purple,
            theme.colors.purple,
          ]}
          maxHeight={16}
          minHeight={8}
          reverse={true}
          rotate={true}
          tint={theme.colors.everglade}
        />
      </Suspense>

      {DevAgentation ? (
        <Suspense fallback={null}>
          <DevAgentation />
        </Suspense>
      ) : null}
    </SitePageChrome>
  );
};
