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
// import { Faq } from "../components/Faq";
import { SeoStructuredData } from "../components/SeoStructuredData";
// import { ArticlesTeaser } from "../components/ArticlesTeaser";
import Band from "../components/Band";
import { ServiceAreaMap } from "../components/ServiceAreaMap";
import { theme } from "../theme";
import { useSanitySite } from "../context/SanitySiteContext";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { Agentation } from "agentation";
import {
  mapAboutProps,
  // mapArticlesTeaserEditorialProps,
  mapContactProps,
  mapExpertiseProps,
  // mapFaqProps,
  mapHeroProps,
  mapStatsProps,
  mapMissionProps,
  mapServicesProps,
  mapServiceAreaMapProps,
  mapSocialShareProps,
  mapTestimonialsProps,
  mapRoofInspectionProps,
} from "../sanity/mapSanityHome";
import {
  RoofInspection,
  CHAPTERS,
  VIEWS,
  type Chapter,
} from "../components/RoofInspection";
import type { RoofInspectionHotspotData } from "../types";

export const Home = () => {
  const { data } = useSanitySite();
  const home = data?.home as Record<string, unknown> | null | undefined;
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

  const hero = home?.hero as Record<string, unknown> | undefined;
  const marquee = home?.marquee as Record<string, unknown> | undefined;
  const about = home?.about as Record<string, unknown> | undefined;
  const stats = home?.stats as Record<string, unknown> | undefined;
  const services = home?.services as Record<string, unknown> | undefined;
  const mission = home?.mission as Record<string, unknown> | undefined;
  const expertise = home?.expertise as Record<string, unknown> | undefined;
  const testimonials = home?.testimonials as
    | Record<string, unknown>
    | undefined;
  // const faq = home?.faq as Record<string, unknown> | undefined;
  // const articlesTeaser = home?.articlesTeaser as
  //   | Record<string, unknown>
  //   | undefined;
  const contact = home?.contact as Record<string, unknown> | undefined;
  const socialShare = home?.socialShare as Record<string, unknown> | undefined;
  const serviceAreaMap = home?.serviceAreaMap as
    | Record<string, unknown>
    | undefined;
  const roofInspectionData = home?.roofInspection as
    | Record<string, unknown>
    | undefined;

  const marqueeText =
    typeof marquee?.text === "string" && marquee.text.trim()
      ? marquee.text
      : "Amarillo - Canyon - Lubbock - San Antonio - Kerrville - Belton - Temple - Waco - Fort Worth - Austin - Surrounding Areas - San Antonio - Kerrville - Belton - Temple - Waco - Fort Worth - Austin & Surrounding Areas -";

  const marqueeDirection = marquee?.direction === "left" ? "left" : "right";
  const marqueeVelocity =
    typeof marquee?.velocity === "number" ? marquee.velocity : 80;

  const roofInspection = mapRoofInspectionProps(roofInspectionData);

  // DEBUG — remove once position updates are confirmed working
  if (import.meta.env.DEV) {
    console.log("[RoofInspection] sanity raw:", roofInspectionData);
    console.log("[RoofInspection] mapped hotspots:", roofInspection.hotspots);
  }

  /**
   * Convert CMS hotspot data to the Chapter shape expected by RoofInspection.
   * Roman numeral is derived from array position so editors never have to
   * manage it manually.
   */
  const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];
  const sanityChapters: Chapter[] | null =
    roofInspection.hotspots && roofInspection.hotspots.length > 0
      ? roofInspection.hotspots.map(
          (h: RoofInspectionHotspotData, i: number): Chapter => {
            // Derive position3d / normal3d strings from individual number fields
            const position3d =
              typeof h.pos3dX === "number" &&
              typeof h.pos3dY === "number" &&
              typeof h.pos3dZ === "number"
                ? `${h.pos3dX}m ${h.pos3dY}m ${h.pos3dZ}m`
                : undefined;
            const normal3d =
              typeof h.norm3dX === "number" &&
              typeof h.norm3dY === "number" &&
              typeof h.norm3dZ === "number"
                ? `${h.norm3dX}m ${h.norm3dY}m ${h.norm3dZ}m`
                : undefined;
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
            };
          },
        )
      : null;

  // Merge static CHAPTERS 3D coords for any chapter that has no Sanity data yet
  const activeChapters = (sanityChapters ?? CHAPTERS).map((ch) => {
    const staticMatch = CHAPTERS.find((c) => c.id === ch.id);
    return {
      ...ch,
      position3d: ch.position3d ?? staticMatch?.position3d,
      normal3d: ch.normal3d ?? staticMatch?.normal3d,
    };
  });

  const inspectionTitle = (
    <>
      {roofInspection.titleLine1 ?? "The"}{" "}
      <em>{roofInspection.titleLine2 ?? "Inspection."}</em>
      <br />
      Seven things I check on every roof.
    </>
  );

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
        <ServiceAreaMap {...mapServiceAreaMapProps(serviceAreaMap)} />
        <RoofInspection chapters={activeChapters} views={VIEWS}>
          <RoofInspection.Rail
            kicker={roofInspection.kicker}
            title={inspectionTitle}
            lede={
              roofInspection.lede ??
              "You don't need to be a roofer to know what you're looking at — just someone who'll point out the seven places that matter. Hover any number on the photo."
            }
          />
          <RoofInspection.Canvas>
            <RoofInspection.Toolbar />
            <RoofInspection.Diagram src="/roof.glb">
              {activeChapters.map((c) => (
                <RoofInspection.Hotspot key={c.id} chapter={c} />
              ))}
            </RoofInspection.Diagram>
          </RoofInspection.Canvas>
        </RoofInspection>
        <Mission {...mapMissionProps(mission)} />
        <Expertise {...mapExpertiseProps(expertise)} />
        <Testimonials {...mapTestimonialsProps(testimonials)} />
        {/* <Faq {...mapFaqProps(faq)} /> */}
        {/* <ArticlesTeaser
          posts={data?.latestPosts ?? []}
          {...mapArticlesTeaserEditorialProps(articlesTeaser)}
        /> */}
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
        <Contact {...mapContactProps(contact)} />
      </main>
      <SocialShareBar {...mapSocialShareProps(socialShare)} />
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
      {process.env.NODE_ENV === "development" && <Agentation />}
    </SitePageChrome>
  );
};
