import { lazy, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { useSanitySite } from "../context/useSanitySite";
import { getMainRouteClass } from "../lib/mainRouteClass";
import { mapFooterProps } from "../sanity/mapSanityHome";
import { resolveStableNavProps } from "../sanity/stableNavProps";
import type { HeroProps, NavItem } from "../types";
import { NavVariant } from "./NavVariant";

const Footer = lazy(async () => {
  const module = await import("./Footer");
  return { default: module.Footer };
});

const AGENT_PATHS = new Set([
  "/agent",
  "/marketing",
  "/ads",
  "/advertising",
  "/response",
  "/emails",
]);

const agentNavItems: NavItem[] = [
  { name: "Feature Agent", href: "/agent" },
  { name: "Marketing Agent", href: "/marketing" },
  { name: "Response Agent", href: "/response" },
  { name: "Ad Builder", href: "/ads" },
  { name: "Email Builder", href: "/emails" },
];

const resolveHeroStyle = (
  pathname: string,
  home: Record<string, unknown> | null | undefined
): HeroProps["heroStyle"] | undefined => {
  if (pathname !== "/") {
    return;
  }

  const hero = home?.hero as { heroStyle?: HeroProps["heroStyle"] } | undefined;
  return hero?.heroStyle;
};

/**
 * Persistent site chrome — nav and <main> stay mounted across routes so
 * view-transition-name targets are stable and animations can run.
 */
export const SiteShell = () => {
  const location = useLocation();
  const { data } = useSanitySite();
  const site = data?.site as Record<string, unknown> | null | undefined;
  const navProps = resolveStableNavProps(site);
  const heroStyle = resolveHeroStyle(location.pathname, data?.home);
  const isAgentRoute = AGENT_PATHS.has(location.pathname);
  const isHome = location.pathname === "/";

  const outlet = (
    <Suspense
      fallback={
        isHome ? null : <div aria-hidden style={{ minHeight: "60vh" }} />
      }
    >
      <Outlet />
    </Suspense>
  );

  return (
    <>
      {navProps && (
        <NavVariant
          {...navProps}
          heroStyle={isAgentRoute ? undefined : heroStyle}
          navItems={isAgentRoute ? agentNavItems : navProps.navItems}
        />
      )}

      {isHome ? (
        outlet
      ) : (
        <main
          className={`${getMainRouteClass(location.pathname)} site-main-route`}
        >
          {outlet}
        </main>
      )}

      {isAgentRoute ? null : (
        <Suspense fallback={null}>
          <Footer {...mapFooterProps(site)} />
        </Suspense>
      )}
    </>
  );
};
