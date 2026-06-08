import { Suspense, lazy } from "react";

import type { HeroProps, RoofInspectionHotspotData } from "../types";

import { ArticlesTeaser } from "../components/ArticlesTeaser";
import { DeferUntilVisible } from "../components/DeferUntilVisible";
import { Faq } from "../components/Faq";
import { GoogleAuthGate } from "../components/GoogleAuthGate";
import { HeroVariant } from "../components/HeroVariant";
import { CHAPTERS, type Chapter } from "../components/RoofInspection";
import { parseHotspotCoords } from "../components/RoofInspection/hotspotCoords";
import { SeoStructuredData } from "../components/SeoStructuredData";
import { SitePageChrome } from "../components/SitePageChrome";
import { useSanitySite } from "../context/useSanitySite";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { asOptionalRichText } from "../portableText/value";
import { mergeTandraIntroContent } from "../remotion/fetchTandraIntroContent";
import { isSanityPresentationPreviewActive } from "../sanity/client";
import { sanityImageUrl } from "../sanity/imageUrl";
import {
  mapAboutProps,
  mapArticlesTeaserEditorialProps,
  mapContactProps,
  mapExpertiseProps,
  mapFaqProps,
  mapHeroProps,
  mapVideoProps,
  mapStatsProps,
  mapMissionProps,
  mapServicesProps,
  mapServiceAreaMapProps,
  mapSocialShareProps,
  mapTestimonialsProps,
  mapRoofInspectionProps,
} from "../sanity/mapSanityHome";
import { theme } from "../theme";

const HomeRoofInspection = lazy(() => import("../components/HomeRoofInspection"));
const ScrollVelocity = lazy(async () => import("../components/ScrollText"));
const About = lazy(async () => {
  const module = await import("../components/About");
  return { default: module.About };
});
const BeforeAfterSlider = lazy(async () => {
  const module = await import("../components/BeforeAfterSlider");
  return { default: module.BeforeAfterSlider };
});
const ServicesVariant = lazy(async () => {
  const module = await import("../components/ServicesVariant");
  return { default: module.ServicesVariant };
});

const Mission = lazy(async () => {
  const module = await import("../components/Mission");
  return { default: module.Mission };
});
const Expertise = lazy(async () => {
  const module = await import("../components/Expertise");
  return { default: module.Expertise };
});
const Testimonials = lazy(async () => {
  const module = await import("../components/Testimonials");
  return { default: module.Testimonials };
});
const FeaturedVideoSection = lazy(async () => {
  const module = await import("../components/FeaturedVideoSection");
  return { default: module.FeaturedVideoSection };
});
const Certifications = lazy(async () => {
  const module = await import("../components/Certifications");
  return { default: module.Certifications };
});
const Stats = lazy(async () => {
  const module = await import("../components/Stats");
  return { default: module.Stats };
});
const Contact = lazy(async () => {
  const module = await import("../components/Contact");
  return { default: module.Contact };
});
const SocialShareBar = lazy(async () => {
  const module = await import("../components/SocialShareBar");
  return { default: module.SocialShareBar };
});
const Band = lazy(async () => import("../components/Band"));
const ServiceAreaMap = lazy(async () => {
  const module = await import("../components/ServiceAreaMap");
  return { default: module.ServiceAreaMap };
});
const DevAgentation = import.meta.env.DEV
  ? lazy(async () => {
      const module = await import("agentation");
      return { default: module.Agentation };
    })
  : null;

export const Home = () => {
  const { data, loading, error } = useSanitySite();
  const home = data?.home as Record<string, unknown> | null | undefined;
  const introVideo = home?.tandraIntroVideo as Record<string, unknown> | undefined;
  const seoTitle =
    typeof home?.seoTitle === "string" && home.seoTitle.trim()
      ? home.seoTitle
      : "Tandra Peters | Roofing Consultant | Austin, TX";
  const seoDescription =
    typeof home?.seoDescription === "string" && home.seoDescription.trim()
      ? home.seoDescription
      : "Birdcreek Roofing consultant in Austin for roof assessments, insurance claim advocacy, and project oversight—one team from consultation through Texas installation.";

  usePageMetadata({
    title: seoTitle,
    description: seoDescription,
  });

  if (loading && !data) {
    return (
      <main>
        <section className="home-loading-hero" aria-label="Loading homepage" />
      </main>
    );
  }

  if (!home) {
    return (
      <main>
        <section className="home-loading-hero" aria-label="Homepage unavailable">
          {import.meta.env.DEV && error ? <p role="alert">{error.message}</p> : null}
        </section>
      </main>
    );
  }

  const hero = home?.hero as Record<string, unknown> | undefined;
  const introVideoContent = introVideo ? mergeTandraIntroContent(introVideo) : undefined;
  const renderedVideoUrl =
    typeof introVideo?.renderedVideoUrl === "string" && introVideo.renderedVideoUrl.trim()
      ? introVideo.renderedVideoUrl.trim()
      : undefined;
  const videoProps = mapVideoProps(home?.featuredVideo as Record<string, unknown> | undefined, {
    renderedVideoUrl,
  });
  const shouldUseRenderedIntroVideo =
    Boolean(renderedVideoUrl) && !isSanityPresentationPreviewActive();
  const introVideoThumbnailUrl =
    typeof introVideo?.thumbnailUrl === "string" && introVideo.thumbnailUrl.trim()
      ? sanityImageUrl(introVideo.thumbnailUrl.trim(), { w: 1280, fit: "max" })
      : undefined;
  const marquee = home?.marquee as Record<string, unknown> | undefined;
  const about = home?.about as Record<string, unknown> | undefined;
  const stats = home?.stats as Record<string, unknown> | undefined;
  const services = home?.services as Record<string, unknown> | undefined;

  const mission = home?.mission as Record<string, unknown> | undefined;
  const expertise = home?.expertise as Record<string, unknown> | undefined;
  const testimonials = home?.testimonials as Record<string, unknown> | undefined;
  const faq = home?.faq as Record<string, unknown> | undefined;
  const articlesTeaser = home?.articlesTeaser as Record<string, unknown> | undefined;
  const contact = home?.contact as Record<string, unknown> | undefined;
  const socialShare = home?.socialShare as Record<string, unknown> | undefined;
  const serviceAreaMap = home?.serviceAreaMap as Record<string, unknown> | undefined;
  const roofInspectionData = home?.roofInspection as Record<string, unknown> | undefined;
  const marqueeText =
    typeof marquee?.text === "string" && marquee.text.trim() ? marquee.text : undefined;
  const marqueeDirection = marquee?.direction === "left" ? "left" : "right";
  const marqueeVelocity = typeof marquee?.velocity === "number" ? marquee.velocity : 80;

  const roofInspection = mapRoofInspectionProps(roofInspectionData);
  const beforeAfter = home?.beforeAfter as Record<string, unknown> | undefined;
  const asString = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v : undefined;
  const beforeAfterItems = (beforeAfter?.items as Record<string, unknown>[] | undefined)
    ?.map((item) => {
      return {
        id: asString(item._key),
        title: asString(item.title),
        beforeImage: asString(item.beforeImage)
          ? sanityImageUrl(asString(item.beforeImage)!, { w: 1200, fit: "max" })
          : undefined,
        afterImage: asString(item.afterImage)
          ? sanityImageUrl(asString(item.afterImage)!, { w: 1200, fit: "max" })
          : undefined,
        description: asString(item.description),
      };
    })
    ?.filter((item) => item.beforeImage && item.afterImage);
  const beforeAfterEyebrow = asString(beforeAfter?.eyebrow);
  const beforeAfterTitle = asString(beforeAfter?.title);
  const beforeAfterIntro = asOptionalRichText(beforeAfter?.intro);

  /**
   * Convert CMS hotspot data to the Chapter shape expected by RoofInspection.
   * Roman numeral is derived from array position so editors never have to
   * manage it manually.
   */
  const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];
  const sanityChapters: Chapter[] | null =
    roofInspection.hotspots && roofInspection.hotspots.length > 0
      ? roofInspection.hotspots.map((h: RoofInspectionHotspotData, i: number): Chapter => {
          const { position3d, normal3d } = parseHotspotCoords(h);
          return {
            id: String(i + 1),
            num: ROMAN[i] ?? String(i + 1),
            label: h.label,
            position: { top: "0%", left: "0%" },
            direction: h.direction,
            callout: {
              title: h.calloutTitle,
              body: h.calloutBody,
              watchFor: h.watchFor,
            },
            position3d,
            normal3d,
            sanityKey: h._key,
          };
        })
      : null;

  const activeChapters = sanityChapters ?? CHAPTERS;

  const heroStyle = (hero?.heroStyle || undefined) as HeroProps["heroStyle"];

  return (
    <SitePageChrome heroStyle={heroStyle}>
      <SeoStructuredData />
      <main>
        {hero ? <HeroVariant {...mapHeroProps(hero)} /> : null}

        <GoogleAuthGate>
          <Suspense fallback={null}>
            {marqueeText ? (
              <ScrollVelocity
                direction={marqueeDirection}
                velocity={marqueeVelocity}
                texts={[{ text: marqueeText }]}
                fontSize="1.2rem"
              />
            ) : null}
            {about ? <About {...mapAboutProps(about)} /> : null}
            {stats ? <Stats {...mapStatsProps(stats)} /> : null}
            {services ? <ServicesVariant {...mapServicesProps(services)} /> : null}

            {serviceAreaMap ? (
              <DeferUntilVisible minHeight="28rem">
                <ServiceAreaMap {...mapServiceAreaMapProps(serviceAreaMap)} />
              </DeferUntilVisible>
            ) : null}

            {roofInspectionData ? (
              <DeferUntilVisible minHeight="36rem" rootMargin="600px 0px">
                <HomeRoofInspection chapters={activeChapters} roofInspection={roofInspection} />
              </DeferUntilVisible>
            ) : null}
            {mission ? <Mission {...mapMissionProps(mission)} /> : null}
            {beforeAfterItems && beforeAfterItems.length > 0 ? (
              <BeforeAfterSlider
                imagePairs={beforeAfterItems}
                eyebrow={beforeAfterEyebrow}
                title={beforeAfterTitle}
                description={beforeAfterIntro}
              />
            ) : null}
            {expertise ? <Expertise {...mapExpertiseProps(expertise)} /> : null}
            {videoProps.videoUrl || introVideoContent ? (
              <FeaturedVideoSection
                videoUrl={videoProps.videoUrl}
                title={videoProps.title}
                posterUrl={introVideoThumbnailUrl ?? videoProps.posterUrl}
                introContent={shouldUseRenderedIntroVideo ? undefined : introVideoContent}
              />
            ) : null}
            {testimonials ? <Testimonials {...mapTestimonialsProps(testimonials)} /> : null}
            <Faq {...mapFaqProps(faq)} />
            <ArticlesTeaser
              posts={data?.latestPosts ?? []}
              {...mapArticlesTeaserEditorialProps(articlesTeaser)}
            />
            <Certifications />
            <Band
              minHeight={8}
              maxHeight={16}
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
            {contact ? <Contact {...mapContactProps(contact)} /> : null}
            {socialShare ? <SocialShareBar {...mapSocialShareProps(socialShare)} /> : null}
          </Suspense>
        </GoogleAuthGate>
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
