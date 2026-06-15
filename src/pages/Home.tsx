import React, { Suspense, lazy } from "react";

import type { TestimonialsProps } from "../types";

import { ArticlesTeaser } from "../components/ArticlesTeaser";
import { BirdcreekVideoBanner } from "../components/BirdcreekVideoBanner";
import { DeferUntilVisible } from "../components/DeferUntilVisible";
import { Faq } from "../components/Faq";
import { GoogleAuthGate } from "../components/GoogleAuthGate";
import { HeroVariant } from "../components/HeroVariant";
import { SeoStructuredData } from "../components/SeoStructuredData";
import { SitePageChrome } from "../components/SitePageChrome";
import { useSanitySite } from "../context/useSanitySite";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { useSanityEstimatorPage } from "../hooks/useSanityEstimatorPage";
import { CONTACT_BANNER_ESTIMATOR } from "../lib/contactBannerPresets";
import { asOptionalRichText } from "../portableText/value";
import { mergeTandraIntroContent } from "../remotion/fetchTandraIntroContent";
import { sanityImageUrl } from "../sanity/imageUrl";
import { mapEstimatorPageContent } from "../sanity/mapEstimatorPage";
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
  mapServicesProps,
  mapServiceAreaMapProps,
  mapSocialShareProps,
  mapStatsProps,
  mapTestimonialsProps,
  mapVideoProps,
} from "../sanity/mapSanityHome";
import { theme } from "../theme";

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
  return { default: module.Testimonials as React.ComponentType<TestimonialsProps> };
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
const ContactBanner = lazy(async () => {
  const module = await import("../components/ContactBanner");
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
  const { page: estimatorPage } = useSanityEstimatorPage();
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
  const birdcreekVideoProps = mapBirdcreekVideoBannerProps(home);
  const marqueeText =
    typeof marquee?.text === "string" && marquee.text.trim() ? marquee.text : undefined;
  const marqueeDirection = marquee?.direction === "left" ? "left" : "right";
  const marqueeVelocity = typeof marquee?.velocity === "number" ? marquee.velocity : 80;

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

  type HomeSection = {
    _key?: string;
    _type?: string;
    data?: Record<string, unknown>;
  };

  const builderSections = Array.isArray(home?.sections) ? (home.sections as HomeSection[]) : null;
  const hasBuilderSections = Boolean(builderSections && builderSections.length > 0);

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

  const renderSection = (section: HomeSection, _index: number) => {
    const sectionData = getSectionData(section);
    switch (section._type) {
      case "heroSection":
        return <HeroVariant {...mapHeroProps(sectionData)} />;
      case "marqueeSection": {
        const text =
          typeof sectionData.text === "string" && sectionData.text.trim()
            ? sectionData.text
            : undefined;
        const direction = sectionData.direction === "left" ? "left" : "right";
        const velocity = typeof sectionData.velocity === "number" ? sectionData.velocity : 80;
        return text ? (
          <ScrollVelocity
            direction={direction}
            velocity={velocity}
            texts={[{ text }]}
            fontSize="1.2rem"
          />
        ) : null;
      }
      case "birdcreekVideoBannerSection":
        return <BirdcreekVideoBanner {...mapBirdcreekVideoBannerProps(sectionData)} />;
      case "videoSection": {
        const sectionVideoProps = mapVideoProps(sectionData, { renderedVideoUrl });
        return sectionVideoProps.videoUrl || introVideoContent ? (
          <FeaturedVideoSection
            videoUrl={sectionVideoProps.videoUrl}
            title={sectionVideoProps.title}
            posterUrl={introVideoThumbnailUrl ?? sectionVideoProps.posterUrl}
            introContent={introVideoContent}
          />
        ) : null;
      }
      case "aboutSection":
        return <About {...mapAboutProps(sectionData)} />;
      case "statsSection":
        return <Stats {...mapStatsProps(sectionData)} />;
      case "servicesSection":
        return <ServicesVariant {...mapServicesProps(sectionData)} />;
      case "serviceAreaMap":
        return (
          <DeferUntilVisible minHeight="28rem">
            <ServiceAreaMap {...mapServiceAreaMapProps(sectionData)} />
          </DeferUntilVisible>
        );
      case "missionSection":
        return <Mission {...mapMissionProps(sectionData)} />;
      case "beforeAfterSection": {
        const asMaybeString = (v: unknown): string | undefined =>
          typeof v === "string" && v.trim() ? v : undefined;
        const pairs = (sectionData.items as Record<string, unknown>[] | undefined)
          ?.map((item) => ({
            id: asMaybeString(item._key),
            title: asMaybeString(item.title),
            beforeImage: asMaybeString(item.beforeImage)
              ? sanityImageUrl(asMaybeString(item.beforeImage)!, { w: 1200, fit: "max" })
              : undefined,
            afterImage: asMaybeString(item.afterImage)
              ? sanityImageUrl(asMaybeString(item.afterImage)!, { w: 1200, fit: "max" })
              : undefined,
            description: asMaybeString(item.description),
          }))
          ?.filter((item) => item.beforeImage && item.afterImage);
        return pairs && pairs.length > 0 ? (
          <BeforeAfterSlider
            imagePairs={pairs}
            eyebrow={asMaybeString(sectionData.eyebrow)}
            title={asMaybeString(sectionData.title)}
            description={asOptionalRichText(sectionData.intro)}
          />
        ) : null;
      }
      case "expertiseSection":
        return <Expertise {...mapExpertiseProps(sectionData)} />;
      case "contactBannerSection":
        return <ContactBanner {...mapContactBannerProps(sectionData)} />;
      case "testimonialsSection":
        return <Testimonials {...mapTestimonialsProps(sectionData)} />;
      case "faqSection":
        return <Faq {...mapFaqProps(sectionData)} />;
      case "articlesTeaserSection":
        return (
          <ArticlesTeaser
            posts={data?.latestPosts ?? []}
            {...mapArticlesTeaserEditorialProps(sectionData)}
          />
        );
      case "certificationsSection":
        return (
          <Certifications
            title={typeof sectionData.title === "string" ? sectionData.title : undefined}
          />
        );
      case "contactSection":
        return <Contact {...mapContactProps(sectionData)} />;
      case "socialShareSection":
        return <SocialShareBar {...mapSocialShareProps(sectionData)} />;
      default:
        return null;
    }
  };

  const builderSectionNodes = builderSections ? (
    <Suspense fallback={null}>
      {builderSections.map((section, index) => {
        const node = renderSection(section, index);
        if (!node) {
          return null;
        }
        const key = section._key ?? `${section._type ?? "section"}-${index}`;
        return isAuthSection(section._type) ? (
          <GoogleAuthGate key={key}>{node}</GoogleAuthGate>
        ) : (
          <React.Fragment key={key}>{node}</React.Fragment>
        );
      })}
    </Suspense>
  ) : null;

  const estimatorContent = mapEstimatorPageContent(estimatorPage);
  const estimatorBannerProps = {
    ...CONTACT_BANNER_ESTIMATOR,
    ...(estimatorContent.bannerEyebrow ? { eyebrow: estimatorContent.bannerEyebrow } : {}),
    ...(estimatorContent.bannerHeadline ? { headline: estimatorContent.bannerHeadline } : {}),
    ...(estimatorContent.bannerCtaLabel ? { phoneDisplay: estimatorContent.bannerCtaLabel } : {}),
  };

  if (hasBuilderSections) {
    return (
      <SitePageChrome>
        <SeoStructuredData />
        <main>{builderSectionNodes}</main>

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
  }

  return (
    <SitePageChrome>
      <SeoStructuredData />
      <main>
        {hero ? <HeroVariant {...mapHeroProps(hero)} /> : null}

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
        </Suspense>

        <BirdcreekVideoBanner {...birdcreekVideoProps} />

        <GoogleAuthGate>
          <Suspense fallback={null}>
            {services ? <ServicesVariant {...mapServicesProps(services)} /> : null}
          </Suspense>
        </GoogleAuthGate>
        <ContactBanner {...estimatorBannerProps} />
        <GoogleAuthGate>
          <Suspense fallback={null}>
            {serviceAreaMap ? (
              <DeferUntilVisible minHeight="28rem">
                <ServiceAreaMap {...mapServiceAreaMapProps(serviceAreaMap)} />
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
          </Suspense>
        </GoogleAuthGate>

        <GoogleAuthGate>
          <Suspense fallback={null}>
            {videoProps.videoUrl || introVideoContent ? (
              <FeaturedVideoSection
                videoUrl={videoProps.videoUrl}
                title={videoProps.title}
                posterUrl={introVideoThumbnailUrl ?? videoProps.posterUrl}
                introContent={introVideoContent}
              />
            ) : null}
            {testimonials ? <Testimonials /> : null}
            <Faq {...mapFaqProps(faq)} />
            <ArticlesTeaser
              posts={data?.latestPosts ?? []}
              {...mapArticlesTeaserEditorialProps(articlesTeaser)}
            />
            <Certifications />
          </Suspense>
        </GoogleAuthGate>

        <Suspense fallback={null}>
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
