import type { ReactElement } from "react";

import { render, type RenderResult } from "@testing-library/react";

import { About } from "../components/About";
import { AdImagePicker } from "../components/AdImagePicker";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "../components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "../components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTextarea,
} from "../components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "../components/ai-elements/reasoning";
import { Shimmer } from "../components/ai-elements/shimmer";
import { Suggestion, Suggestions } from "../components/ai-elements/suggestion";
import { ArticleCardSharedStyles } from "../components/ArticleCardSharedStyles";
import { ArticleGridCard } from "../components/ArticleGridCard";
import { ArticleJsonLd } from "../components/ArticleJsonLd";
import { ArticleRichTextLinkStyles } from "../components/ArticleRichTextLinkStyles";
import { ArticlesTeaser } from "../components/ArticlesTeaser";
import Band from "../components/Band";
import { BeforeAfterSlider } from "../components/BeforeAfterSlider";
import BirdCreekLogo from "../components/BirdCreekLogo";
import { CallButton } from "../components/CallButton";
import { Certifications } from "../components/Certifications";
import { Contact } from "../components/Contact";
import { ContactSmall } from "../components/ContactSmall";
import { DeferUntilVisible } from "../components/DeferUntilVisible";
import { Expertise } from "../components/Expertise";
import { Faq } from "../components/Faq";
import { FeaturedRemotionPlayer } from "../components/FeaturedRemotionPlayer";
import { FeaturedVideoSection } from "../components/FeaturedVideoSection";
import { Footer } from "../components/Footer";
import FooterBg from "../components/FooterBg";
import { Hero } from "../components/Hero";
import { HeroDualCTARail } from "../components/hero/HeroDualCTARail";
import { HeroGlassOverlay } from "../components/hero/HeroGlassOverlay";
import { HeroPillNav } from "../components/hero/HeroPillNav";
import { NavDualCTARail } from "../components/hero/NavDualCTARail";
import { NavGlassOverlay } from "../components/hero/NavGlassOverlay";
import { NavPillNav } from "../components/hero/NavPillNav";
import { HeroVariant } from "../components/HeroVariant";
import HomeRoofInspection from "../components/HomeRoofInspection";
import { Mission } from "../components/Mission";
import { Nav } from "../components/Nav";
import { NavVariant } from "../components/NavVariant";
import { GoogleLogo } from "../components/reviews/google-logo";
import { GoogleReviews } from "../components/reviews/google-reviews";
import { MarqueeRow } from "../components/reviews/marquee-row";
import { ReviewCard } from "../components/reviews/review-card";
import { ReviewModal } from "../components/reviews/review-modal";
import { Avatar, GoogleMark, Stars } from "../components/reviews/review-parts";
import { reviews } from "../components/reviews/reviews-data";
import { RoofInspection } from "../components/RoofInspection";
import { CHAPTERS, VIEWS } from "../components/RoofInspection/data";
import ScrollVelocity from "../components/ScrollText";
import { SeoStructuredData } from "../components/SeoStructuredData";
import { ServiceAreaMap } from "../components/ServiceAreaMap";
import { Services } from "../components/Services";
import ServicesAlt from "../components/ServicesAlt";
import { ServicesVariant } from "../components/ServicesVariant";
import { SitePageChrome } from "../components/SitePageChrome";
import { SocialShareBar } from "../components/SocialShareBar";
import { Stats } from "../components/Stats";
import { Testimonials } from "../components/Testimonials";
import TexasFlag from "../components/TexasFlag";
import { PlayPauseButton } from "../components/videocontrols/PlayPauseButton";
import { SeekBar } from "../components/videocontrols/SeekBar";
import { VideoControls } from "../components/videocontrols/VideoControls";
import { VideoPoster } from "../components/videocontrols/VideoPoster";
import { AdDashboardPage } from "../pages/AdDashboardPage";
import { ArticlePage } from "../pages/ArticlePage";
import { ArticlesIndexPage } from "../pages/ArticlesIndexPage";
import { CookiePolicyPage } from "../pages/CookiePolicyPage";
import { FeatureBuilderPage } from "../pages/FeatureBuilderPage";
import { Home } from "../pages/Home";
import { LegalLayout } from "../pages/LegalLayout";
import { MarketingAgentPage } from "../pages/MarketingAgentPage";
import { PrivacyPolicyPage } from "../pages/PrivacyPolicyPage";
import { SeoDashboardPage } from "../pages/SeoDashboardPage";
import { TermsOfServicePage } from "../pages/TermsOfServicePage";
import { defaultTandraIntroContent } from "../remotion/tandraIntroContent";
import { mockArticlePost } from "./a11yMocks";
import { renderWithRouter, renderWithSiteProviders } from "./renderWithProviders";

export type A11yCase = {
  name: string;
  render: () => RenderResult;
};

const sampleReview = reviews[0]!;
const roofChapters = CHAPTERS.filter((chapter) => chapter.position3d);

const renderPlain = (ui: ReactElement): RenderResult => render(ui);
const renderRouted = (ui: ReactElement, route = "/"): RenderResult => renderWithRouter(ui, route);
const renderSite = (ui: ReactElement, route = "/"): RenderResult =>
  renderWithSiteProviders(ui, { route });

export const a11yCases: A11yCase[] = [
  // ── Core marketing sections ───────────────────────────────────────────────
  { name: "About", render: () => renderPlain(<About />) },
  {
    name: "BeforeAfterSlider",
    render: () =>
      renderPlain(
        <BeforeAfterSlider
          imagePairs={[
            {
              id: "pair-1",
              title: "Roof repair",
              beforeImage: "/roof.jpeg",
              afterImage: "/roof.jpeg",
              description: "Before and after roof work.",
            },
          ]}
        />,
      ),
  },
  { name: "Band", render: () => renderPlain(<Band />) },
  { name: "BirdCreekLogo", render: () => renderPlain(<BirdCreekLogo />) },
  { name: "CallButton", render: () => renderPlain(<CallButton />) },
  { name: "Certifications", render: () => renderPlain(<Certifications />) },
  { name: "Contact", render: () => renderPlain(<Contact />) },
  { name: "ContactSmall", render: () => renderPlain(<ContactSmall />) },
  {
    name: "DeferUntilVisible",
    render: () =>
      renderPlain(
        <DeferUntilVisible>
          <p>Deferred section content</p>
        </DeferUntilVisible>,
      ),
  },
  { name: "Expertise", render: () => renderPlain(<Expertise />) },
  { name: "Faq", render: () => renderPlain(<Faq />) },
  { name: "Footer", render: () => renderPlain(<Footer />) },
  { name: "Mission", render: () => renderPlain(<Mission />) },
  { name: "Services", render: () => renderPlain(<Services />) },
  { name: "ServicesAlt", render: () => renderPlain(<ServicesAlt />) },
  { name: "ServicesVariant", render: () => renderPlain(<ServicesVariant />) },
  {
    name: "SocialShareBar",
    render: () =>
      renderRouted(<SocialShareBar heading="Roof inspection guide" />, "/articles/test-article"),
  },
  { name: "Stats", render: () => renderPlain(<Stats />) },
  { name: "Testimonials", render: () => renderPlain(<Testimonials />) },
  { name: "TexasFlag", render: () => renderPlain(<TexasFlag />) },
  {
    name: "ScrollVelocity",
    render: () => renderPlain(<ScrollVelocity text="Birdcreek Roofing" />),
  },

  // ── Hero & navigation variants ────────────────────────────────────────────
  { name: "Hero", render: () => renderRouted(<Hero />) },
  { name: "HeroVariant", render: () => renderRouted(<HeroVariant />) },
  {
    name: "HeroGlassOverlay",
    render: () => renderRouted(<HeroGlassOverlay />),
  },
  { name: "HeroDualCTARail", render: () => renderRouted(<HeroDualCTARail />) },
  { name: "HeroPillNav", render: () => renderRouted(<HeroPillNav />) },
  { name: "Nav", render: () => renderRouted(<Nav />) },
  { name: "NavVariant", render: () => renderRouted(<NavVariant />) },
  { name: "NavGlassOverlay", render: () => renderRouted(<NavGlassOverlay />) },
  { name: "NavDualCTARail", render: () => renderRouted(<NavDualCTARail />) },
  { name: "NavPillNav", render: () => renderRouted(<NavPillNav />) },

  // ── Articles & map ────────────────────────────────────────────────────────
  {
    name: "ArticlesTeaser",
    render: () => renderRouted(<ArticlesTeaser posts={[]} />),
  },
  {
    name: "ArticleGridCard",
    render: () => renderRouted(<ArticleGridCard post={mockArticlePost} cardIndex={0} />),
  },
  {
    name: "ArticleCardSharedStyles",
    render: () => renderPlain(<ArticleCardSharedStyles />),
  },
  {
    name: "ArticleRichTextLinkStyles",
    render: () => renderPlain(<ArticleRichTextLinkStyles />),
  },
  {
    name: "ArticleJsonLd",
    render: () =>
      renderPlain(<ArticleJsonLd post={mockArticlePost} path="/articles/test-article" />),
  },
  {
    name: "SeoStructuredData",
    render: () => renderSite(<SeoStructuredData />),
  },
  {
    name: "FooterBg",
    render: () => renderPlain(<FooterBg style={{ height: 120 }} />),
  },
  {
    name: "AdImagePicker",
    render: () =>
      renderPlain(
        <AdImagePicker
          images={[]}
          loading={false}
          error={null}
          selectedImageUrl={null}
          onRefresh={() => {}}
          onSelect={() => {}}
        />,
      ),
  },
  {
    name: "ServiceAreaMap",
    render: () => renderPlain(<ServiceAreaMap areas={[]} />),
  },

  // ── Reviews ───────────────────────────────────────────────────────────────
  { name: "GoogleReviews", render: () => renderPlain(<GoogleReviews />) },
  { name: "GoogleLogo", render: () => renderPlain(<GoogleLogo />) },
  {
    name: "MarqueeRow",
    render: () => renderPlain(<MarqueeRow reviews={reviews.slice(0, 4)} />),
  },
  {
    name: "ReviewCard",
    render: () => renderPlain(<ReviewCard review={sampleReview} />),
  },
  {
    name: "ReviewModal",
    render: () => renderPlain(<ReviewModal review={sampleReview} isOpen onClose={() => {}} />),
  },
  { name: "ReviewStars", render: () => renderPlain(<Stars rating={5} />) },
  {
    name: "ReviewAvatar",
    render: () => renderPlain(<Avatar review={sampleReview} />),
  },
  { name: "ReviewGoogleMark", render: () => renderPlain(<GoogleMark />) },

  // ── Video ─────────────────────────────────────────────────────────────────
  {
    name: "FeaturedRemotionPlayer",
    render: () =>
      renderPlain(
        <FeaturedRemotionPlayer
          content={defaultTandraIntroContent}
          posterUrl="/roof.jpeg"
          showCaptions={false}
        />,
      ),
  },
  {
    name: "FeaturedVideoSection",
    render: () =>
      renderPlain(
        <FeaturedVideoSection posterUrl="/roof.jpeg" introContent={defaultTandraIntroContent} />,
      ),
  },
  {
    name: "VideoPoster",
    render: () => renderPlain(<VideoPoster posterUrl="/roof.jpeg" onPress={() => {}} />),
  },
  {
    name: "PlayPauseButton",
    render: () => renderPlain(<PlayPauseButton isPlaying={false} isVisible onPress={() => {}} />),
  },
  {
    name: "SeekBar",
    render: () =>
      renderPlain(
        <SeekBar
          progress={0.1}
          progressPercent={10}
          isDragging={false}
          trackRef={{ current: null }}
          onPointerDown={() => {}}
          onPointerMove={() => {}}
          onPointerUp={() => {}}
          onKeyDown={() => {}}
        />,
      ),
  },
  {
    name: "VideoControls",
    render: () => {
      const videoRef = { current: document.createElement("video") };
      const playerRef = { current: null };
      return renderPlain(
        <VideoControls
          videoRef={videoRef}
          playerRef={playerRef}
          isRemotion={false}
          isVisible
          posterUrl="/roof.jpeg"
          captionsVisible={false}
        />,
      );
    },
  },

  // ── Roof inspection ───────────────────────────────────────────────────────
  {
    name: "RoofInspectionRail",
    render: () =>
      renderPlain(
        <RoofInspection chapters={CHAPTERS} views={VIEWS}>
          <RoofInspection.Rail
            kicker="Roof basics"
            title={
              <>
                The <em>Inspection.</em>
              </>
            }
            lede="Seven things I check on every roof."
          />
        </RoofInspection>,
      ),
  },
  {
    name: "RoofInspectionToolbar",
    render: () =>
      renderPlain(
        <RoofInspection chapters={CHAPTERS} views={VIEWS}>
          <RoofInspection.Canvas>
            <RoofInspection.Toolbar />
          </RoofInspection.Canvas>
        </RoofInspection>,
      ),
  },
  {
    name: "HomeRoofInspection",
    render: () =>
      renderPlain(
        <HomeRoofInspection
          chapters={roofChapters}
          roofInspection={{
            kicker: "Roof basics",
            lede: "Seven things I check on every roof.",
          }}
        />,
      ),
  },

  // ── AI / agent UI primitives ──────────────────────────────────────────────
  {
    name: "Conversation",
    render: () =>
      renderPlain(
        <Conversation>
          <ConversationContent>
            <ConversationEmptyState title="Start a chat" description="Ask a question to begin." />
          </ConversationContent>
        </Conversation>,
      ),
  },
  {
    name: "Message",
    render: () =>
      renderPlain(
        <Message from="assistant">
          <MessageContent>
            <MessageResponse>Here is a sample assistant reply.</MessageResponse>
          </MessageContent>
        </Message>,
      ),
  },
  {
    name: "PromptInput",
    render: () =>
      renderPlain(
        <PromptInput onSubmit={() => {}}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ask a question…" />
          </PromptInputBody>
          <PromptInputFooter />
        </PromptInput>,
      ),
  },
  {
    name: "Suggestions",
    render: () =>
      renderPlain(
        <Suggestions>
          <Suggestion suggestion="Audit my homepage" onClick={() => {}} />
          <Suggestion suggestion="Plan a FAQ section" onClick={() => {}} />
        </Suggestions>,
      ),
  },
  {
    name: "Shimmer",
    render: () => renderPlain(<Shimmer>Loading response…</Shimmer>),
  },
  {
    name: "Reasoning",
    render: () =>
      renderPlain(
        <Reasoning isStreaming={false} defaultOpen>
          <ReasoningTrigger />
          <ReasoningContent>Checked the live Sanity schema first.</ReasoningContent>
        </Reasoning>,
      ),
  },

  // ── Layout & pages ────────────────────────────────────────────────────────
  {
    name: "SitePageChrome",
    render: () =>
      renderSite(
        <SitePageChrome>
          <main>
            <h1>Page content</h1>
          </main>
        </SitePageChrome>,
      ),
  },
  {
    name: "LegalLayout",
    render: () =>
      renderSite(
        <LegalLayout title="Accessibility test">
          <p>Sample legal copy for accessibility testing.</p>
        </LegalLayout>,
      ),
  },
  { name: "Home", render: () => renderSite(<Home />) },
  {
    name: "ArticlesIndexPage",
    render: () => renderSite(<ArticlesIndexPage />, "/articles"),
  },
  {
    name: "ArticlePage",
    render: () => renderSite(<ArticlePage />, "/articles/test-article"),
  },
  {
    name: "PrivacyPolicyPage",
    render: () => renderSite(<PrivacyPolicyPage />, "/privacy"),
  },
  {
    name: "TermsOfServicePage",
    render: () => renderSite(<TermsOfServicePage />, "/terms"),
  },
  {
    name: "CookiePolicyPage",
    render: () => renderSite(<CookiePolicyPage />, "/cookies"),
  },
  {
    name: "FeatureBuilderPage",
    render: () => renderSite(<FeatureBuilderPage />, "/agent"),
  },
  {
    name: "MarketingAgentPage",
    render: () => renderSite(<MarketingAgentPage />, "/marketing"),
  },
  {
    name: "SeoDashboardPage",
    render: () => renderSite(<SeoDashboardPage />, "/seo"),
  },
  {
    name: "AdDashboardPage",
    render: () => renderSite(<AdDashboardPage />, "/ads"),
  },
];
