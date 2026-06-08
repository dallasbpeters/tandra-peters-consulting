import type { ReactElement, ReactNode } from "react";

import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { GoogleAuthGateProvider } from "../components/GoogleAuthGate";
import { SanitySiteContext, type SanitySiteContextValue } from "../context/sanitySiteContextValue";

export const mockSanitySiteValue: SanitySiteContextValue = {
  data: {
    home: { hero: {} },
    site: {},
    latestPosts: [],
  },
  loading: false,
  error: null,
  refetch: async () => {},
};

type SiteProviderOptions = {
  route?: string;
  sanity?: SanitySiteContextValue;
};

const createSiteWrapper = ({ route = "/", sanity = mockSanitySiteValue }: SiteProviderOptions) => {
  const SiteTestWrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>
      <GoogleAuthGateProvider>
        <SanitySiteContext.Provider value={sanity}>{children}</SanitySiteContext.Provider>
      </GoogleAuthGateProvider>
    </MemoryRouter>
  );
  SiteTestWrapper.displayName = "SiteTestWrapper";

  return SiteTestWrapper;
};

export const renderWithRouter = (
  ui: ReactElement,
  route = "/",
  options?: Omit<RenderOptions, "wrapper">,
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
  }: SiteProviderOptions & RenderOptions = {},
) => render(ui, { wrapper: createSiteWrapper({ route, sanity }), ...options });
