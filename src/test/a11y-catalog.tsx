import type { RenderResult } from "@testing-library/react";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

import { About } from "../components/about";
import { AdImagePicker } from "../components/ad-image-picker";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "../components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "../components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTextarea,
} from "../components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "../components/ai-elements/reasoning";
import { Shimmer } from "../components/ai-elements/shimmer";
import { Suggestion, Suggestions } from "../components/ai-elements/suggestion";
import { ArticleCardSharedStyles } from "../components/article-card-shared-styles";
import { ArticleGridCard } from "../components/article-grid-card";
import { ArticleJsonLd } from "../components/article-json-ld";
import { ArticleRichTextLinkStyles } from "../components/article-rich-text-link-styles";
import { ArticlesTeaser } from "../components/articles-teaser";
import Band from "../components/band";
import { BeforeAfterSlider } from "../components/before-after-slider";
import BirdCreekLogo from "../components/bird-creek-logo";
import { CallButton } from "../components/call-button";
import { Certifications } from "../components/certifications";
import { Contact } from "../components/contact";
import { ContactSmall } from "../components/contact-small";
import { DeferUntilVisible } from "../components/defer-until-visible";
import { Expertise } from "../components/expertise";
import { Faq } from "../components/faq";
import { FeaturedRemotionPlayer } from "../components/featured-remotion-player";
import { FeaturedVideoSection } from "../components/featured-video-section";
import { Footer } from "../components/footer";
import FooterBg from "../components/footer-bg";
import { Hero } from "../components/hero";
import { HeroVariant } from "../components/hero-variant";
import { HeroDualCTARail } from "../components/hero/hero-dual-cta-rail";
import { HeroGlassOverlay } from "../components/hero/hero-glass-overlay";
import { HeroPillNav } from "../components/hero/hero-pill-nav";
import { NavDualCTARail } from "../components/hero/nav-dual-cta-rail";
import { NavGlassOverlay } from "../components/hero/nav-glass-overlay";
import { NavPillNav } from "../components/hero/nav-pill-nav";
import HomeRoofInspection from "../components/home-roof-inspection";
import { Mission } from "../components/mission";
import { Nav } from "../components/nav";
import { NavVariant } from "../components/nav-variant";
import { GoogleLogo } from "../components/reviews/google-logo";
import { GoogleReviews } from "../components/reviews/google-reviews";
import { MarqueeRow } from "../components/reviews/marquee-row";
import { ReviewCard } from "../components/reviews/review-card";
import { ReviewModal } from "../components/reviews/review-modal";
import { Avatar, GoogleMark, Stars } from "../components/reviews/review-parts";
import { reviews } from "../components/reviews/reviews-data";
import { RoofInspection } from "../components/RoofInspection";
import { CHAPTERS, VIEWS } from "../components/RoofInspection/data";
import ScrollVelocity from "../components/scroll-text";
import { SeoStructuredData } from "../components/seo-structured-data";
import { ServiceAreaMap } from "../components/service-area-map";
import { Services } from "../components/services";
import ServicesAlt from "../components/services-alt";
import { ServicesVariant } from "../components/services-variant";
import { SitePageChrome } from "../components/site-page-chrome";
import { SocialShareBar } from "../components/social-share-bar";
import { Stats } from "../components/stats";
import { Testimonials } from "../components/testimonials";
import TexasFlag from "../components/texas-flag";
import { PlayPauseButton } from "../components/videocontrols/play-pause-button";
import { SeekBar } from "../components/videocontrols/seek-bar";
import { VideoControls } from "../components/videocontrols/video-controls";
import { VideoPoster } from "../components/videocontrols/video-poster";
import { AdDashboardPage } from "../pages/ad-dashboard-page";
import { ArticlePage } from "../pages/article-page";
import { ArticlesIndexPage } from "../pages/articles-index-page";
import { CookiePolicyPage } from "../pages/cookie-policy-page";
import { FeatureBuilderPage } from "../pages/feature-builder-page";
import { Home } from "../pages/home";
import { LegalLayout } from "../pages/legal-layout";
import { MarketingAgentPage } from "../pages/marketing-agent-page";
import { PrivacyPolicyPage } from "../pages/privacy-policy-page";
import { SeoDashboardPage } from "../pages/seo-dashboard-page";
import { TermsOfServicePage } from "../pages/terms-of-service-page";
import { defaultTandraIntroContent } from "../remotion/tandra-intro-content";
import { mockArticlePost } from "./a11y-mocks";
import {
  renderWithRouter,
  renderWithSiteProviders,
} from "./render-with-providers";

export interface A11yCase {
  name: string;
  render: () => RenderResult;
}

const sampleReview = reviews.at(0);
const roofChapters = CHAPTERS.filter((chapter) => chapter.position3d);

const renderPlain = (ui: ReactElement): RenderResult => render(ui);
const renderRouted = (ui: ReactElement, route = "/"): RenderResult =>
  renderWithRouter(ui, route);
const renderSite = (ui: ReactElement, route = "/"): RenderResult =>
  renderWithSiteProviders(ui, { route });

export const a11yCases: A11yCase[] = [
  // ── Core marketing sections ───────────────────────────────────────────────
  { name: "about", render: () => renderPlain(<About />) },
  {
    name: "before-after-slider",
    render: () =>
      renderPlain(
        <BeforeAfterSlider
          imagePairs={[
            {
              afterImage: "/roof.jpeg",
              beforeImage: "/roof.jpeg",
              description: "Before and after roof work.",
              id: "pair-1",
              title: "Roof repair",
            },
          ]}
        />
      ),
  },
  { name: "band", render: () => renderPlain(<Band />) },
  { name: "bird-creek-logo", render: () => renderPlain(<BirdCreekLogo />) },
  { name: "call-button", render: () => renderPlain(<CallButton />) },
  { name: "certifications", render: () => renderPlain(<Certifications />) },
  { name: "contact", render: () => renderPlain(<Contact />) },
  { name: "contact-small", render: () => renderPlain(<ContactSmall />) },
  {
    name: "defer-until-visible",
    render: () =>
      renderPlain(
        <DeferUntilVisible>
          <p>Deferred section content</p>
        </DeferUntilVisible>
      ),
  },
  { name: "expertise", render: () => renderPlain(<Expertise />) },
  { name: "faq", render: () => renderPlain(<Faq />) },
  { name: "footer", render: () => renderPlain(<Footer />) },
  { name: "mission", render: () => renderPlain(<Mission />) },
  { name: "services", render: () => renderPlain(<Services />) },
  { name: "services-alt", render: () => renderPlain(<ServicesAlt />) },
  { name: "services-variant", render: () => renderPlain(<ServicesVariant />) },
  {
    name: "social-share-bar",
    render: () =>
      renderRouted(
        <SocialShareBar heading="Roof inspection guide" />,
        "/articles/test-article"
      ),
  },
  { name: "stats", render: () => renderPlain(<Stats />) },
  { name: "testimonials", render: () => renderPlain(<Testimonials />) },
  { name: "texas-flag", render: () => renderPlain(<TexasFlag />) },
  {
    name: "ScrollVelocity",
    render: () => renderPlain(<ScrollVelocity text="Birdcreek Roofing" />),
  },

  // ── Hero & navigation variants ────────────────────────────────────────────
  { name: "hero", render: () => renderRouted(<Hero />) },
  { name: "hero-variant", render: () => renderRouted(<HeroVariant />) },
  {
    name: "hero-glass-overlay",
    render: () => renderRouted(<HeroGlassOverlay />),
  },
  { name: "HeroDualCTARail", render: () => renderRouted(<HeroDualCTARail />) },
  { name: "hero-pill-nav", render: () => renderRouted(<HeroPillNav />) },
  { name: "nav", render: () => renderRouted(<Nav />) },
  { name: "nav-variant", render: () => renderRouted(<NavVariant />) },
  {
    name: "nav-glass-overlay",
    render: () => renderRouted(<NavGlassOverlay />),
  },
  { name: "NavDualCTARail", render: () => renderRouted(<NavDualCTARail />) },
  { name: "nav-pill-nav", render: () => renderRouted(<NavPillNav />) },

  // ── Articles & map ────────────────────────────────────────────────────────
  {
    name: "articles-teaser",
    render: () => renderRouted(<ArticlesTeaser posts={[]} />),
  },
  {
    name: "article-grid-card",
    render: () =>
      renderRouted(<ArticleGridCard cardIndex={0} post={mockArticlePost} />),
  },
  {
    name: "article-card-shared-styles",
    render: () => renderPlain(<ArticleCardSharedStyles />),
  },
  {
    name: "article-rich-text-link-styles",
    render: () => renderPlain(<ArticleRichTextLinkStyles />),
  },
  {
    name: "article-json-ld",
    render: () =>
      renderPlain(
        <ArticleJsonLd path="/articles/test-article" post={mockArticlePost} />
      ),
  },
  {
    name: "seo-structured-data",
    render: () => renderSite(<SeoStructuredData />),
  },
  {
    name: "footer-bg",
    render: () => renderPlain(<FooterBg style={{ height: 120 }} />),
  },
  {
    name: "ad-image-picker",
    render: () =>
      renderPlain(
        <AdImagePicker
          error={null}
          images={[]}
          loading={false}
          onRefresh={() => {
            // noop
          }}
          onSelect={() => {
            // noop
          }}
          selectedImageUrl={null}
        />
      ),
  },
  {
    name: "service-area-map",
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
    render: () =>
      renderPlain(
        <ReviewModal
          isOpen
          onClose={() => {
            // noop
          }}
          review={sampleReview}
        />
      ),
  },
  { name: "ReviewStars", render: () => renderPlain(<Stars rating={5} />) },
  {
    name: "ReviewAvatar",
    render: () => renderPlain(<Avatar review={sampleReview} />),
  },
  { name: "ReviewGoogleMark", render: () => renderPlain(<GoogleMark />) },

  // ── Video ─────────────────────────────────────────────────────────────────
  {
    name: "featured-remotion-player",
    render: () =>
      renderPlain(
        <FeaturedRemotionPlayer
          content={defaultTandraIntroContent}
          posterUrl="/roof.jpeg"
          showCaptions={false}
        />
      ),
  },
  {
    name: "featured-video-section",
    render: () =>
      renderPlain(
        <FeaturedVideoSection
          introContent={defaultTandraIntroContent}
          posterUrl="/roof.jpeg"
        />
      ),
  },
  {
    name: "video-poster",
    render: () =>
      renderPlain(
        <VideoPoster
          onPress={() => {
            // noop
          }}
          posterUrl="/roof.jpeg"
        />
      ),
  },
  {
    name: "play-pause-button",
    render: () =>
      renderPlain(
        <PlayPauseButton
          isPlaying={false}
          isVisible
          onPress={() => {
            // noop
          }}
        />
      ),
  },
  {
    name: "seek-bar",
    render: () =>
      renderPlain(
        <SeekBar
          isDragging={false}
          onKeyDown={() => {
            // noop
          }}
          onPointerDown={() => {
            // noop
          }}
          onPointerMove={() => {
            // noop
          }}
          onPointerUp={() => {
            // noop
          }}
          progress={0.1}
          progressPercent={10}
          trackRef={{ current: null }}
        />
      ),
  },
  {
    name: "video-controls",
    render: () => {
      const videoRef = { current: document.createElement("video") };
      const playerRef = { current: null };
      return renderPlain(
        <VideoControls
          captionsVisible={false}
          isRemotion={false}
          isVisible
          playerRef={playerRef}
          posterUrl="/roof.jpeg"
          videoRef={videoRef}
        />
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
            lede="Seven things I check on every roof."
            title={
              <>
                The <em>Inspection.</em>
              </>
            }
          />
        </RoofInspection>
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
        </RoofInspection>
      ),
  },
  {
    name: "home-roof-inspection",
    render: () =>
      renderPlain(
        <HomeRoofInspection
          chapters={roofChapters}
          roofInspection={{
            kicker: "Roof basics",
            lede: "Seven things I check on every roof.",
          }}
        />
      ),
  },

  // ── AI / agent UI primitives ──────────────────────────────────────────────
  {
    name: "Conversation",
    render: () =>
      renderPlain(
        <Conversation>
          <ConversationContent>
            <ConversationEmptyState
              description="Ask a question to begin."
              title="Start a chat"
            />
          </ConversationContent>
        </Conversation>
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
        </Message>
      ),
  },
  {
    name: "PromptInput",
    render: () =>
      renderPlain(
        <PromptInput
          onSubmit={() => {
            // noop
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ask a question…" />
          </PromptInputBody>
          <PromptInputFooter />
        </PromptInput>
      ),
  },
  {
    name: "Suggestions",
    render: () =>
      renderPlain(
        <Suggestions>
          <Suggestion
            onClick={() => {
              // noop
            }}
            suggestion="Audit my homepage"
          />
          <Suggestion
            onClick={() => {
              // noop
            }}
            suggestion="Plan a FAQ section"
          />
        </Suggestions>
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
        <Reasoning defaultOpen isStreaming={false}>
          <ReasoningTrigger />
          <ReasoningContent>
            Checked the live Sanity schema first.
          </ReasoningContent>
        </Reasoning>
      ),
  },

  // ── Layout & pages ────────────────────────────────────────────────────────
  {
    name: "site-page-chrome",
    render: () =>
      renderSite(
        <SitePageChrome>
          <main>
            <h1>Page content</h1>
          </main>
        </SitePageChrome>
      ),
  },
  {
    name: "legal-layout",
    render: () =>
      renderSite(
        <LegalLayout title="Accessibility test">
          <p>Sample legal copy for accessibility testing.</p>
        </LegalLayout>
      ),
  },
  { name: "home", render: () => renderSite(<Home />) },
  {
    name: "articles-index-page",
    render: () => renderSite(<ArticlesIndexPage />, "/articles"),
  },
  {
    name: "article-page",
    render: () => renderSite(<ArticlePage />, "/articles/test-article"),
  },
  {
    name: "privacy-policy-page",
    render: () => renderSite(<PrivacyPolicyPage />, "/privacy"),
  },
  {
    name: "terms-of-service-page",
    render: () => renderSite(<TermsOfServicePage />, "/terms"),
  },
  {
    name: "cookie-policy-page",
    render: () => renderSite(<CookiePolicyPage />, "/cookies"),
  },
  {
    name: "feature-builder-page",
    render: () => renderSite(<FeatureBuilderPage />, "/agent"),
  },
  {
    name: "marketing-agent-page",
    render: () => renderSite(<MarketingAgentPage />, "/marketing"),
  },
  {
    name: "seo-dashboard-page",
    render: () => renderSite(<SeoDashboardPage />, "/seo"),
  },
  {
    name: "ad-dashboard-page",
    render: () => renderSite(<AdDashboardPage />, "/ads"),
  },
];
