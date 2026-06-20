import type { RenderOptions } from "@testing-library/react";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

import { GoogleAuthGateProvider } from "../components/google-auth-gate";
import type { SanitySiteContextValue } from "../context/sanity-site-context-value";
import { SanitySiteContext } from "../context/sanity-site-context-value";

export const mockSanitySiteValue: SanitySiteContextValue = {
  data: {
    home: { hero: {} },
    latestPosts: [],
    site: {},
  },
  error: null,
  loading: false,
  refetch: async () => {
    /* noop */
  },
};

interface SiteProviderOptions {
  route?: string;
  sanity?: SanitySiteContextValue;
}

const createSiteWrapper = ({
  route = "/",
  sanity = mockSanitySiteValue,
}: SiteProviderOptions) => {
  const SiteTestWrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>
      <GoogleAuthGateProvider>
        <SanitySiteContext.Provider value={sanity}>
          {children}
        </SanitySiteContext.Provider>
      </GoogleAuthGateProvider>
    </MemoryRouter>
  );
  SiteTestWrapper.displayName = "SiteTestWrapper";

  return SiteTestWrapper;
};

export const renderWithRouter = (
  ui: ReactElement,
  route = "/",
  options?: Omit<RenderOptions, "wrapper">
) => {
  const RouterTestWrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>
      <GoogleAuthGateProvider>{children}</GoogleAuthGateProvider>
    </MemoryRouter>
  );
  RouterTestWrapper.displayName = "RouterTestWrapper";

  return render(ui, {
    wrapper: RouterTestWrapper,
    ...options,
  });
};

export const renderWithSiteProviders = (
  ui: ReactElement,
  {
    route = "/",
    sanity = mockSanitySiteValue,
    ...options
  }: SiteProviderOptions & RenderOptions = {}
) => render(ui, { wrapper: createSiteWrapper({ route, sanity }), ...options });
