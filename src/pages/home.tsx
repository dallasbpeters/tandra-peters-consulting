import React, { lazy, Suspense } from "react";

import { ArticlesTeaser } from "../components/articles-teaser";
import { BirdcreekVideoBanner } from "../components/birdcreek-video-banner";
import { DeferUntilVisible } from "../components/defer-until-visible";
import { Faq } from "../components/faq";
import { GoogleAuthGate } from "../components/google-auth-gate";
import { HeroVariant } from "../components/hero-variant";
import { SeoStructuredData } from "../components/seo-structured-data";
import { SitePageChrome } from "../components/site-page-chrome";
import { useSanitySite } from "../context/use-sanity-site";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { asOptionalRichText } from "../portableText/value";
import { mergeTandraIntroContent } from "../remotion/tandra-intro-content";
import { sanityImageUrl } from "../sanity/image-url";
import {
  mapAboutProps,
  mapArticlesTeaserEditorialProps,
  mapBirdcreekVideoBannerProps,
  mapContactBannerProps,
  mapContactProps,
  mapExpertiseProps,
  mapFaqProps,
  mapHeroProps,
  mapMissionProps,
  mapServiceAreaMapProps,
  mapServicesProps,
  mapSocialShareProps,
  mapStatsProps,
  mapTestimonialsProps,
} from "../sanity/map-sanity-home";
import { theme } from "../theme";
import type { TestimonialsProps } from "../types";

const ScrollVelocity = lazy(async () => import("../components/scroll-text"));
const About = lazy(async () => {
  const module = await import("../components/about");
  return { default: module.About };
});
const BeforeAfterSlider = lazy(async () => {
  const module = await import("../components/before-after-slider");
  return { default: module.BeforeAfterSlider };
});
const ServicesVariant = lazy(async () => {
  const module = await import("../components/services-variant");
  return { default: module.ServicesVariant };
});
const Mission = lazy(async () => {
  const module = await import("../components/mission");
  return { default: module.Mission };
});
const Expertise = lazy(async () => {
  const module = await import("../components/expertise");
  return { default: module.Expertise };
});
const Testimonials = lazy(async () => {
  const module = await import("../components/testimonials");
  return {
    default: module.Testimonials as React.ComponentType<TestimonialsProps>,
  };
});
const FeaturedVideoSection = lazy(async () => {
  const module = await import("../components/featured-video-section");
  return { default: module.FeaturedVideoSection };
});
const Certifications = lazy(async () => {
  const module = await import("../components/certifications");
  return { default: module.Certifications };
});
const Stats = lazy(async () => {
  const module = await import("../components/stats");
  return { default: module.Stats };
});
const Contact = lazy(async () => {
  const module = await import("../components/contact");
  return { default: module.Contact };
});
const SocialShareBar = lazy(async () => {
  const module = await import("../components/social-share-bar");
  return { default: module.SocialShareBar };
});
const Band = lazy(async () => import("../components/band"));
const ServiceAreaMap = lazy(async () => {
  const module = await import("../components/service-area-map");
  return { default: module.ServiceAreaMap };
});
const ContactBanner = lazy(async () => {
  const module = await import("../components/contact-banner");
  return { default: module.ContactBanner };
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

  const introVideo = home?.tandraIntroVideo as
    | Record<string, unknown>
    | undefined;
  const seoTitle =
    typeof home?.seoTitle === "string" && home.seoTitle.trim()
      ? home.seoTitle
      : "Tandra Peters | Roofing Consultant | Austin, TX";
  const seoDescription =
    typeof home?.seoDescription === "string" && home.seoDescription.trim()
      ? home.seoDescription
      : "Birdcreek Roofing consultant in Austin for roof assessments, insurance claim advocacy, and project oversight—one team from consultation through Texas installation.";

  usePageMetadata({
    description: seoDescription,
    title: seoTitle,
  });

  if (loading && !data) {
    return (
      <main>
        <section aria-label="Loading homepage" className="home-loading-hero" />
      </main>
    );
  }

  if (!home) {
    return (
      <main>
        <section
          aria-label="Homepage unavailable"
          className="home-loading-hero"
        >
          {import.meta.env.DEV && error ? (
            <p role="alert">{error.message}</p>
          ) : null}
        </section>
      </main>
    );
  }

  const introVideoContent = introVideo
    ? mergeTandraIntroContent(introVideo)
    : undefined;
  const introVideoThumbnailUrl =
    typeof introVideo?.thumbnailUrl === "string" &&
    introVideo.thumbnailUrl.trim()
      ? sanityImageUrl(introVideo.thumbnailUrl.trim(), { fit: "max", w: 1280 })
      : undefined;

  interface HomeSection {
    _key?: string;
    _type?: string;
    data?: Record<string, unknown>;
  }

  const builderSections = Array.isArray(home?.sections)
    ? (home.sections as HomeSection[])
    : null;

  const isAuthSection = (type?: string) =>
    type === "servicesSection" ||
    type === "serviceAreaMap" ||
    type === "missionSection" ||
    type === "beforeAfterSection" ||
    type === "expertiseSection" ||
    type === "videoSection" ||
    type === "testimonialsSection" ||
    type === "faqSection" ||
    type === "articlesTeaserSection" ||
    type === "certificationsSection";

  const getSectionData = (section: HomeSection) =>
    (section.data ?? section) as Record<string, unknown>;

  const deferredSectionMinHeight = (type?: string): string | null => {
    switch (type) {
      case "videoSection": {
        return "34rem";
      }
      case "missionSection":
      case "expertiseSection":
      case "beforeAfterSection": {
        return "32rem";
      }
      case "certificationsSection": {
        return "12rem";
      }
      case "socialShareSection": {
        return "50px";
      }
      default: {
        return null;
      }
    }
  };

  const sectionFallbackMinHeight = (type?: string): string => {
    switch (type) {
      case "marqueeSection": {
        return "4rem";
      }
      case "aboutSection": {
        return "36rem";
      }
      case "statsSection":
      case "certificationsSection": {
        return "12rem";
      }
      case "socialShareSection": {
        return "100px";
      }
      case "servicesSection": {
        return "42rem";
      }
      case "serviceAreaMap": {
        return "28rem";
      }
      case "videoSection": {
        return "34rem";
      }
      case "missionSection":
      case "expertiseSection":
      case "beforeAfterSection": {
        return "32rem";
      }
      case "contactBannerSection": {
        return "18rem";
      }
      case "testimonialsSection":
      case "faqSection":
      case "articlesTeaserSection": {
        return "30rem";
      }
      case "contactSection": {
        return "38rem";
      }
      default: {
        return "12rem";
      }
    }
  };

  const sectionFallback = (type?: string) => (
    <div
      aria-hidden="true"
      style={{ minHeight: sectionFallbackMinHeight(type) }}
    />
  );

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
  const renderSection = (section: HomeSection, _index: number) => {
    const sectionData = getSectionData(section);
    switch (section._type) {
      case "heroSection": {
        return <HeroVariant {...mapHeroProps(sectionData)} />;
      }
      case "marqueeSection": {
        const text =
          typeof sectionData.text === "string" && sectionData.text.trim()
            ? sectionData.text
            : undefined;
        const direction = sectionData.direction === "left" ? "left" : "right";
        const velocity =
          typeof sectionData.velocity === "number" ? sectionData.velocity : 80;
        return text ? (
          <ScrollVelocity
            direction={direction}
            fontSize="1.2rem"
            texts={[{ text }]}
            velocity={velocity}
          />
        ) : null;
      }
      case "birdcreekVideoBannerSection": {
        return (
          <BirdcreekVideoBanner
            {...mapBirdcreekVideoBannerProps(sectionData)}
          />
        );
      }
      case "videoSection": {
        const sectionPosterUrl =
          typeof sectionData.posterUrl === "string" &&
          sectionData.posterUrl.trim()
            ? sectionData.posterUrl.trim()
            : undefined;
        return introVideoContent ? (
          <FeaturedVideoSection
            introContent={introVideoContent}
            posterUrl={introVideoThumbnailUrl ?? sectionPosterUrl}
          />
        ) : null;
      }
      case "aboutSection": {
        return <About {...mapAboutProps(sectionData)} />;
      }
      case "statsSection": {
        return <Stats {...mapStatsProps(sectionData)} />;
      }
      case "servicesSection": {
        return <ServicesVariant {...mapServicesProps(sectionData)} />;
      }
      case "serviceAreaMap": {
        return (
          <DeferUntilVisible minHeight="28rem">
            <ServiceAreaMap {...mapServiceAreaMapProps(sectionData)} />
          </DeferUntilVisible>
        );
      }
      case "certificationsSection": {
        return (
          <Certifications
            title={
              typeof sectionData.title === "string"
                ? sectionData.title
                : undefined
            }
          />
        );
      }
      case "missionSection": {
        return <Mission {...mapMissionProps(sectionData)} />;
      }
      case "beforeAfterSection": {
        const asMaybeString = (v: unknown): string | undefined =>
          typeof v === "string" && v.trim() ? v : undefined;
        const pairs = (
          sectionData.items as Record<string, unknown>[] | undefined
        )
          ?.map((item) => {
            const beforeRaw = asMaybeString(item.beforeImage);
            const afterRaw = asMaybeString(item.afterImage);
            return {
              afterImage: afterRaw
                ? sanityImageUrl(afterRaw, { fit: "max", w: 1200 })
                : undefined,
              beforeImage: beforeRaw
                ? sanityImageUrl(beforeRaw, { fit: "max", w: 1200 })
                : undefined,
              description: asMaybeString(item.description),
              id: asMaybeString(item._key),
              title: asMaybeString(item.title),
            };
          })
          ?.filter((item) => item.beforeImage && item.afterImage);
        return pairs && pairs.length > 0 ? (
          <BeforeAfterSlider
            description={asOptionalRichText(sectionData.intro)}
            eyebrow={asMaybeString(sectionData.eyebrow)}
            imagePairs={pairs}
            title={asMaybeString(sectionData.title)}
          />
        ) : null;
      }
      case "expertiseSection": {
        return <Expertise {...mapExpertiseProps(sectionData)} />;
      }
      case "contactBannerSection": {
        return <ContactBanner {...mapContactBannerProps(sectionData)} />;
      }
      case "testimonialsSection": {
        return <Testimonials {...mapTestimonialsProps(sectionData)} />;
      }
      case "faqSection": {
        return <Faq {...mapFaqProps(sectionData)} />;
      }
      case "articlesTeaserSection": {
        const maxPosts =
          typeof sectionData.maxPosts === "number" && sectionData.maxPosts > 0
            ? Math.min(50, Math.floor(sectionData.maxPosts))
            : undefined;
        return (
          <ArticlesTeaser
            posts={
              maxPosts
                ? (data?.latestPosts ?? []).slice(0, maxPosts)
                : (data?.latestPosts ?? [])
            }
            {...mapArticlesTeaserEditorialProps(sectionData)}
          />
        );
      }

      case "contactSection": {
        return <Contact {...mapContactProps(sectionData)} />;
      }
      case "socialShareSection": {
        return <SocialShareBar {...mapSocialShareProps(sectionData)} />;
      }
      default: {
        return null;
      }
    }
  };

  const builderSectionNodes = builderSections
    ? builderSections.map((section, index) => {
        const node = renderSection(section, index);
        if (!node) {
          return null;
        }
        const key = section._key ?? `${section._type ?? "section"}-${index}`;
        const deferredMinHeight = deferredSectionMinHeight(section._type);
        const content = deferredMinHeight ? (
          <DeferUntilVisible
            key={key}
            minHeight={deferredMinHeight}
            rootMargin="120px 0px"
          >
            {node}
          </DeferUntilVisible>
        ) : (
          node
        );
        const sectionNode = (
          <Suspense fallback={sectionFallback(section._type)} key={key}>
            {content}
          </Suspense>
        );

        return isAuthSection(section._type) ? (
          <GoogleAuthGate key={key}>{sectionNode}</GoogleAuthGate>
        ) : (
          <React.Fragment key={key}>{sectionNode}</React.Fragment>
        );
      })
    : null;

  return (
    <SitePageChrome>
      <SeoStructuredData />
      <main>{builderSectionNodes}</main>
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
