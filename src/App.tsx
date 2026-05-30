import { Suspense, lazy } from "react";
import { Outlet, createBrowserRouter, RouterProvider } from "react-router-dom";
import { RouteScrollManager } from "./components/RouteScrollManager";
import { GoogleAuthGateProvider } from "./components/GoogleAuthGate";
import { SanityVisualEditing } from "./components/SanityVisualEditing";
import { SanityContentProvider } from "./context/SanitySiteContext";
import { Home } from "./pages/Home";
import { ArticlesIndexPage } from "./pages/ArticlesIndexPage";
import { ArticlePage } from "./pages/ArticlePage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { TermsOfServicePage } from "./pages/TermsOfServicePage";
import { CookiePolicyPage } from "./pages/CookiePolicyPage";
import { Analytics } from "@vercel/analytics/react";

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
      { path: "articles", element: <ArticlesIndexPage /> },
      { path: "articles/:slug", element: <ArticlePage /> },
      {
        path: "seo",
        element: (
          <Suspense fallback={null}>
            <SeoDashboardPage />
          </Suspense>
        ),
      },
      { path: "privacy", element: <PrivacyPolicyPage /> },
      { path: "terms", element: <TermsOfServicePage /> },
      { path: "cookies", element: <CookiePolicyPage /> },
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
