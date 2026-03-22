import { Outlet, createBrowserRouter, RouterProvider } from "react-router-dom";
import { RouteScrollManager } from "./components/RouteScrollManager";
import { SanityVisualEditing } from "./components/SanityVisualEditing";
import { SanityContentProvider } from "./context/SanitySiteContext";
import { Home } from "./pages/Home";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { TermsOfServicePage } from "./pages/TermsOfServicePage";
import { CookiePolicyPage } from "./pages/CookiePolicyPage";

const RootLayout = () => (
  <>
    <RouteScrollManager />
    <SanityContentProvider>
      <SanityVisualEditing />
      <Outlet />
    </SanityContentProvider>
  </>
);

const appRouter = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "privacy", element: <PrivacyPolicyPage /> },
      { path: "terms", element: <TermsOfServicePage /> },
      { path: "cookies", element: <CookiePolicyPage /> },
    ],
  },
]);

const App = () => <RouterProvider router={appRouter} />;

export default App;
