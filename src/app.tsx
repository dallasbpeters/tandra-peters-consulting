import { Analytics } from "@vercel/analytics/react";
import { lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { BackendThemeScope } from "./components/backend-theme-scope";
import { GoogleAuthGateProvider } from "./components/google-auth-gate";
import { RouteScrollManager } from "./components/route-scroll-manager";
import { SanityVisualEditing } from "./components/sanity-visual-editing";
import { SiteShell } from "./components/site-shell";
import { DashboardAuthProvider } from "./context/dashboard-auth-context";
import { SanityContentProvider } from "./context/sanity-site-context";
import { Home } from "./pages/home";
import { layoutClass } from "./styles/layout-classes";

const ArticlePage = lazy(async () => {
  const module = await import("./pages/article-page");
  return { default: module.ArticlePage };
});

const ArticlesIndexPage = lazy(async () => {
  const module = await import("./pages/articles-index-page");
  return { default: module.ArticlesIndexPage };
});

const WorkflowPage = lazy(async () => {
  const module = await import("./pages/workflow-page");
  return { default: module.WorkflowPage };
});

const InsuranceFaqsPage = lazy(async () => {
  const module = await import("./pages/insurance-faqs-page");
  return { default: module.InsuranceFaqsPage };
});
const RoofInspections = lazy(async () => {
  const module = await import("./pages/roof-inspections");
  return { default: module.RoofInspections };
});

const EstimatorPage = lazy(async () => {
  const module = await import("./pages/estimator-page");
  return { default: module.EstimatorPage };
});

const PrivacyPolicyPage = lazy(async () => {
  const module = await import("./pages/privacy-policy-page");
  return { default: module.PrivacyPolicyPage };
});

const TermsOfServicePage = lazy(async () => {
  const module = await import("./pages/terms-of-service-page");
  return { default: module.TermsOfServicePage };
});

const CookiePolicyPage = lazy(async () => {
  const module = await import("./pages/cookie-policy-page");
  return { default: module.CookiePolicyPage };
});

const SeoDashboardPage = lazy(async () => {
  const module = await import("./pages/seo-dashboard-page");
  return { default: module.SeoDashboardPage };
});

const DeskPage = lazy(async () => {
  const module = await import("./pages/desk-page");
  return { default: module.DeskPage };
});

const ContentCalendarPage = lazy(async () => {
  const module = await import("./pages/content-calendar-page");
  return { default: module.ContentCalendarPage };
});

const FeatureBuilderPage = lazy(async () => {
  const module = await import("./pages/feature-builder-page");
  return { default: module.FeatureBuilderPage };
});
const ResponseAgentPage = lazy(async () => {
  const module = await import("./pages/response-agent-page");
  return { default: module.ResponseAgentPage };
});

const MarketingAgentPage = lazy(async () => {
  const module = await import("./pages/marketing-agent-page");
  return { default: module.MarketingAgentPage };
});

const AdDashboardPage = lazy(async () => {
  const module = await import("./pages/ad-dashboard-page");
  return { default: module.AdDashboardPage };
});

const FalUpscalerPage = lazy(async () => {
  const module = await import("./pages/fal-upscaler-page");
  return { default: module.FalUpscalerPage };
});

const EmailComposerPage = lazy(async () => {
  const module = await import("./pages/email-composer-page");
  return { default: module.EmailComposerPage };
});

const RemotionPreviewPage = lazy(async () => {
  const module = await import("./pages/remotion-preview-page");
  return { default: module.RemotionPreviewPage };
});

const HandfontPreviewPage = lazy(async () => {
  const module = await import("./pages/handfont-preview-page");
  return { default: module.HandfontPreviewPage };
});

const HandfontLabPage = lazy(async () => {
  const module = await import("./pages/handfont-lab-page");
  return { default: module.HandfontLabPage };
});

const GlyphEditorPage = lazy(async () => {
  const module = await import("./pages/glyph-editor-page");
  return { default: module.GlyphEditorPage };
});

const VideosPage = lazy(async () => {
  const module = await import("./pages/videos-page");
  return { default: module.VideosPage };
});

const RootLayout = () => (
  <>
    <RouteScrollManager />
    <DashboardAuthProvider>
      <GoogleAuthGateProvider>
        <SanityContentProvider>
          <BackendThemeScope />
          <SanityVisualEditing />
          <SiteShell />
          <Analytics />
        </SanityContentProvider>
      </GoogleAuthGateProvider>
    </DashboardAuthProvider>
  </>
);

const EmailComposerEmbed = () => (
  <DashboardAuthProvider>
    <BackendThemeScope />
    <main className={`${layoutClass.pageMain} site-page-main--backend`}>
      <EmailComposerPage />
    </main>
  </DashboardAuthProvider>
);

const appRouter = createBrowserRouter([
  {
    element: <RemotionPreviewPage />,
    // Standalone, chrome-less Remotion preview embedded by the Sanity Studio
    // "Videos" tool. No SiteShell / nav / providers — just the player.
    path: "remotion-preview",
  },
  {
    element: <HandfontPreviewPage />,
    path: "handfont-preview",
  },
  {
    element: <HandfontLabPage />,
    path: "handfont-lab",
  },
  {
    element: <GlyphEditorPage />,
    path: "glyph-editor",
  },
  {
    element: <EmailComposerEmbed />,
    path: "email-composer",
  },
  {
    children: [
      { element: <Home />, index: true },
      { element: <ArticlesIndexPage />, path: "articles" },
      { element: <ArticlePage />, path: "articles/:slug" },
      { element: <SeoDashboardPage />, path: "seo" },
      { element: <DeskPage />, path: "desk" },
      { element: <ContentCalendarPage />, path: "calendar" },
      { element: <PrivacyPolicyPage />, path: "privacy" },
      { element: <TermsOfServicePage />, path: "terms" },
      { element: <CookiePolicyPage />, path: "cookies" },
      { element: <WorkflowPage />, path: "workflow" },
      { element: <InsuranceFaqsPage />, path: "insurance-faqs" },
      { element: <RoofInspections />, path: "roof-inspection" },
      { element: <RoofInspections />, path: "roof-inspections" },
      { element: <EstimatorPage />, path: "estimate" },
      { element: <FeatureBuilderPage />, path: "agent" },
      { element: <MarketingAgentPage />, path: "marketing" },
      { element: <AdDashboardPage />, path: "ads" },
      { element: <AdDashboardPage />, path: "advertising" },
      { element: <ResponseAgentPage />, path: "response" },
      { element: <EmailComposerPage />, path: "emails" },
      { element: <EmailComposerPage />, path: "email" },
      { element: <FalUpscalerPage />, path: "upscaler" },
      { element: <VideosPage />, path: "videos" },
    ],
    element: <RootLayout />,
  },
]);

const App = () => <RouterProvider router={appRouter} />;

export default App;
