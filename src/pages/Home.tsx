import { SitePageChrome } from "../components/SitePageChrome";
import { Hero } from "../components/Hero";
import ScrollVelocity from "../components/ScrollText";
import { About } from "../components/About";
import { Services } from "../components/Services";
import { Mission } from "../components/Mission";
import { Expertise } from "../components/Expertise";
import { Testimonials } from "../components/Testimonials";
import { Stats } from "../components/Stats";
import { Contact } from "../components/Contact";
import { SocialShareBar } from "../components/SocialShareBar";
import { Faq } from "../components/Faq";
import { SeoStructuredData } from "../components/SeoStructuredData";
// import { ArticlesTeaser } from "../components/ArticlesTeaser";
import Band from "../components/Band";
import { theme } from "../theme";
import { useSanitySite } from "../context/SanitySiteContext";
import { usePageMetadata } from "../hooks/usePageMetadata";
import {
  mapAboutProps,
  mapArticlesTeaserEditorialProps,
  mapContactProps,
  mapExpertiseProps,
  mapFaqProps,
  mapHeroProps,
  mapStatsProps,
  mapMissionProps,
  mapServicesProps,
  mapSocialShareProps,
  mapTestimonialsProps,
} from "../sanity/mapSanityHome";

export const Home = () => {
  const { data } = useSanitySite();
  const home = data?.home as Record<string, unknown> | null | undefined;
  const seoTitle =
    typeof home?.seoTitle === "string" && home.seoTitle.trim()
      ? home.seoTitle
      : "Tandra Peters | Birdcreek Roofing Consultant | Austin, TX";
  const seoDescription =
    typeof home?.seoDescription === "string" && home.seoDescription.trim()
      ? home.seoDescription
      : "Birdcreek Roofing consultant in Austin for roof assessments, insurance claim advocacy, and project oversight—one team from consultation through Texas installation.";

  usePageMetadata({
    title: seoTitle,
    description: seoDescription,
  });

  const hero = home?.hero as Record<string, unknown> | undefined;
  const marquee = home?.marquee as Record<string, unknown> | undefined;
  const about = home?.about as Record<string, unknown> | undefined;
  const stats = home?.stats as Record<string, unknown> | undefined;
  const services = home?.services as Record<string, unknown> | undefined;
  const mission = home?.mission as Record<string, unknown> | undefined;
  const expertise = home?.expertise as Record<string, unknown> | undefined;
  const testimonials = home?.testimonials as Record<string, unknown> | undefined;
  const faq = home?.faq as Record<string, unknown> | undefined;
  const articlesTeaser = home?.articlesTeaser as
    | Record<string, unknown>
    | undefined;
  const contact = home?.contact as Record<string, unknown> | undefined;
  const socialShare = home?.socialShare as Record<string, unknown> | undefined;

  const marqueeText =
    typeof marquee?.text === "string" && marquee.text.trim()
      ? marquee.text
      : "Amarillo - Canyon - Lubbock - San Antonio - Kerrville - Belton - Temple - Waco - Fort Worth - Austin - Surrounding Areas - San Antonio - Kerrville - Belton - Temple - Waco - Fort Worth - Austin & Surrounding Areas -";

  const marqueeDirection =
    marquee?.direction === "left" ? "left" : "right";
  const marqueeVelocity =
    typeof marquee?.velocity === "number" ? marquee.velocity : 80;

  return (
    <SitePageChrome>
      <SeoStructuredData />
      <main>
        <Hero {...mapHeroProps(hero)} />
        <ScrollVelocity
          direction={marqueeDirection}
          velocity={marqueeVelocity}
          texts={[{ text: marqueeText }]}
          fontSize="1.2rem"
        />
        <About {...mapAboutProps(about)} />
        <Stats {...mapStatsProps(stats)} />
        <Services {...mapServicesProps(services)} />
        <Mission {...mapMissionProps(mission)} />
        <Expertise {...mapExpertiseProps(expertise)} />
        <Testimonials {...mapTestimonialsProps(testimonials)} />
        <Faq {...mapFaqProps(faq)} />
        {/* <ArticlesTeaser
          posts={data?.latestPosts ?? []}
          {...mapArticlesTeaserEditorialProps(articlesTeaser)}
        /> */}
        <Band
          minHeight={8}
          maxHeight={20}
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
        <Contact {...mapContactProps(contact)} />
      </main>
      <SocialShareBar {...mapSocialShareProps(socialShare)} />
      <Band
      minHeight={8}
      maxHeight={20}
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
    </SitePageChrome>
  );
};
