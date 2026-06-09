import { Suspense, lazy } from "react";

import HomeRoofInspection from "../components/HomeRoofInspection";
import { SeoStructuredData } from "../components/SeoStructuredData";
import { SitePageChrome } from "../components/SitePageChrome";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { useSanityRoofInspectionsPage } from "../hooks/useSanityRoofInspectionsPage";
import { buildRoofInspectionChapters } from "../lib/buildRoofInspectionChapters";
import { resolveRoofInspectionProps } from "../sanity/mapSanityHome";
import { mapSocialShareProps } from "../sanity/mapSanityHome";
import { theme } from "../theme";

const Band = lazy(() => import("../components/Band"));
const DevAgentation = import.meta.env.DEV
  ? lazy(async () => {
      const module = await import("agentation");
      return { default: module.Agentation };
    })
  : null;
const SocialShareBar = lazy(async () => {
  const module = await import("../components/SocialShareBar");
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
    typeof pageData?.seoDescription === "string" && pageData.seoDescription.trim()
      ? pageData.seoDescription
      : "Birdcreek Roofing consultant in Austin for roof assessments, insurance claim advocacy, and project oversight—one team from consultation through Texas installation.";
  const socialShare = page?.socialShare ?? homeSocialShare ?? undefined;
  usePageMetadata({
    title: seoTitle,
    description: seoDescription,
  });

  if (loading && !pageData && !homeRoofInspection) {
    return (
      <main>
        <section className="home-loading-hero" aria-label="Loading roof install page" />
      </main>
    );
  }

  if (error && import.meta.env.DEV) {
    console.error("Failed to fetch roof inspections page from Sanity", error);
  }

  const roofInspection = resolveRoofInspectionProps(
    (pageData?.roofInspection as Record<string, unknown> | undefined) ?? undefined,
    homeRoofInspection ?? undefined,
  );
  const chapters = buildRoofInspectionChapters(roofInspection.hotspots);

  return (
    <SitePageChrome>
      <SeoStructuredData />
      <main>
        <HomeRoofInspection chapters={chapters} roofInspection={roofInspection} />
        {socialShare ? (
          <Suspense fallback={null}>
            <SocialShareBar {...mapSocialShareProps(socialShare)} />
          </Suspense>
        ) : null}
      </main>
      <Suspense fallback={null}>
        <Band
          minHeight={8}
          maxHeight={16}
          reverse={true}
          rotate={true}
          tint={theme.colors.everglade}
          colors={[
            theme.colors.evergladeLight,
            theme.colors.evergladeMuted,
            theme.colors.paper,
            theme.colors.purple,
            theme.colors.purple,
            theme.colors.purple,
          ]}
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
