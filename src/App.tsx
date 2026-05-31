import { Suspense, lazy } from "react";
import { Outlet, createBrowserRouter, RouterProvider } from "react-router-dom";
import { RouteScrollManager } from "./components/RouteScrollManager";
import { GoogleAuthGateProvider } from "./components/GoogleAuthGate";
import { SanityVisualEditing } from "./components/SanityVisualEditing";
import { SanityContentProvider } from "./context/SanitySiteContext";
import { Home } from "./pages/Home";
import { Analytics } from "@vercel/analytics/react";

const ArticlesIndexPage = lazy(async () => {
  const module = await import("./pages/ArticlesIndexPage");
  return { default: module.ArticlesIndexPage };
});

const ArticlePage = lazy(async () => {
  const module = await import("./pages/ArticlePage");
  return { default: module.ArticlePage };
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

const MarketingAgentPage = lazy(async () => {
  const module = await import("./pages/MarketingAgentPage");
  return { default: module.MarketingAgentPage };
});

const AdDashboardPage = lazy(async () => {
  const module = await import("./pages/AdDashboardPage");
  return { default: module.AdDashboardPage };
});

const RootLayout = () => (
  <>
    <RouteScrollManager />
    <GoogleAuthGateProvider>
      <SanityContentProvider>
        <SanityVisualEditing />
        <Outlet />
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
      {
        path: "articles",
        element: (
          <Suspense fallback={null}>
            <ArticlesIndexPage />
          </Suspense>
        ),
      },
      {
        path: "articles/:slug",
        element: (
          <Suspense fallback={null}>
            <ArticlePage />
          </Suspense>
        ),
      },
      {
        path: "seo",
        element: (
          <Suspense fallback={null}>
            <SeoDashboardPage />
          </Suspense>
        ),
      },
      {
        path: "privacy",
        element: (
          <Suspense fallback={null}>
            <PrivacyPolicyPage />
          </Suspense>
        ),
      },
      {
        path: "terms",
        element: (
          <Suspense fallback={null}>
            <TermsOfServicePage />
          </Suspense>
        ),
      },
      {
        path: "cookies",
        element: (
          <Suspense fallback={null}>
            <CookiePolicyPage />
          </Suspense>
        ),
      },
      {
        path: "agent",
        element: (
          <Suspense fallback={null}>
            <FeatureBuilderPage />
          </Suspense>
        ),
      },
      {
        path: "marketing",
        element: (
          <Suspense fallback={null}>
            <MarketingAgentPage />
          </Suspense>
        ),
      },
      {
        path: "ads",
        element: (
          <Suspense fallback={null}>
            <AdDashboardPage />
          </Suspense>
        ),
      },
      {
        path: "advertising",
        element: (
          <Suspense fallback={null}>
            <AdDashboardPage />
          </Suspense>
        ),
      },
    ],
  },
]);

const App = () => <RouterProvider router={appRouter} />;

export default App;
