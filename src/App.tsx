import { Analytics } from "@vercel/analytics/react";
import { lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { GoogleAuthGateProvider } from "./components/GoogleAuthGate";
import { RouteScrollManager } from "./components/RouteScrollManager";
import { SanityVisualEditing } from "./components/SanityVisualEditing";
import { SiteShell } from "./components/SiteShell";
import { SanityContentProvider } from "./context/SanitySiteContext";
import { Home } from "./pages/Home";

const ArticlePage = lazy(async () => {
  const module = await import("./pages/ArticlePage");
  return { default: module.ArticlePage };
});

const ArticlesIndexPage = lazy(async () => {
  const module = await import("./pages/ArticlesIndexPage");
  return { default: module.ArticlesIndexPage };
});

const WorkflowPage = lazy(async () => {
  const module = await import("./pages/WorkflowPage");
  return { default: module.WorkflowPage };
});

const InsuranceFaqsPage = lazy(async () => {
  const module = await import("./pages/InsuranceFaqsPage");
  return { default: module.InsuranceFaqsPage };
});
const RoofInspections = lazy(async () => {
  const module = await import("./pages/RoofInspections");
  return { default: module.RoofInspections };
});

const PrivacyPolicyPage = lazy(async () => {
  const module = await import("./pages/PrivacyPolicyPage");
  return { default: module.PrivacyPolicyPage };
});

const TermsOfServicePage = lazy(async () => {
  const module = await import("./pages/TermsOfServicePage");
  return { default: module.TermsOfServicePage };
});

const CookiePolicyPage = lazy(async () => {
  const module = await import("./pages/CookiePolicyPage");
  return { default: module.CookiePolicyPage };
});

const SeoDashboardPage = lazy(async () => {
  const module = await import("./pages/SeoDashboardPage");
  return { default: module.SeoDashboardPage };
});

const FeatureBuilderPage = lazy(async () => {
  const module = await import("./pages/FeatureBuilderPage");
  return { default: module.FeatureBuilderPage };
});
const ResponseAgentPage = lazy(async () => {
  const module = await import("./pages/ResponseAgentPage");
  return { default: module.ResponseAgentPage };
});

const MarketingAgentPage = lazy(async () => {
  const module = await import("./pages/MarketingAgentPage");
  return { default: module.MarketingAgentPage };
});

const AdDashboardPage = lazy(async () => {
  const module = await import("./pages/AdDashboardPage");
  return { default: module.AdDashboardPage };
});

const EmailComposerPage = lazy(async () => {
  const module = await import("./pages/EmailComposerPage");
  return { default: module.EmailComposerPage };
});

const RootLayout = () => (
  <>
    <RouteScrollManager />
    <GoogleAuthGateProvider>
      <SanityContentProvider>
        <SanityVisualEditing />
        <SiteShell />
        <Analytics />
      </SanityContentProvider>
    </GoogleAuthGateProvider>
  </>
);

const appRouter = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "articles", element: <ArticlesIndexPage /> },
      { path: "articles/:slug", element: <ArticlePage /> },
      { path: "seo", element: <SeoDashboardPage /> },
      { path: "privacy", element: <PrivacyPolicyPage /> },
      { path: "terms", element: <TermsOfServicePage /> },
      { path: "cookies", element: <CookiePolicyPage /> },
      { path: "workflow", element: <WorkflowPage /> },
      { path: "insurance-faqs", element: <InsuranceFaqsPage /> },
      { path: "roof-inspection", element: <RoofInspections /> },
      { path: "roof-inspections", element: <RoofInspections /> },
      { path: "agent", element: <FeatureBuilderPage /> },
      { path: "marketing", element: <MarketingAgentPage /> },
      { path: "ads", element: <AdDashboardPage /> },
      { path: "advertising", element: <AdDashboardPage /> },
      { path: "response", element: <ResponseAgentPage /> },
      { path: "emails", element: <EmailComposerPage /> },
      { path: "email", element: <EmailComposerPage /> },
    ],
  },
]);

const App = () => <RouterProvider router={appRouter} />;

export default App;
