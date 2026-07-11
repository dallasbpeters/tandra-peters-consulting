import { lazy, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { useSanitySite } from "../context/use-sanity-site";
import {
  backendNavItems,
  isBackendRoutePath,
  isWalkRoutePath,
} from "../lib/backend-routes";
import { isElectronDesktopApp } from "../lib/desktop-shell";
import { getMainRouteClass } from "../lib/main-route-class";
import { mapFooterProps } from "../sanity/map-sanity-home";
import { resolveStableNavProps } from "../sanity/stable-nav-props";
import type { HeroProps } from "../types";
import { NavVariant } from "./nav-variant";

const Footer = lazy(async () => {
  const module = await import("./footer");
  return { default: module.Footer };
});

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
  const isBackendRoute = isBackendRoutePath(location.pathname);
  // Walk routes are full-screen field views — the nav is hidden entirely so
  // the pull-up home-detail sheet and map controls are never obstructed.
  const isWalkRoute = isWalkRoutePath(location.pathname);
  const isDesktopApp = isElectronDesktopApp();
  const isHome = location.pathname === "/";
  const mainRouteClassName = [
    getMainRouteClass(location.pathname),
    "site-main-route",
    isDesktopApp ? "site-main-route--desktop-shell" : null,
  ]
    .filter(Boolean)
    .join(" ");

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
      {!(isDesktopApp || isWalkRoute) && navProps && (
        <NavVariant
          {...navProps}
          heroStyle={isBackendRoute ? undefined : heroStyle}
          hideCta={isBackendRoute}
          navItems={isBackendRoute ? backendNavItems : navProps.navItems}
        />
      )}

      {isHome ? outlet : <main className={mainRouteClassName}>{outlet}</main>}

      {isBackendRoute ? null : (
        <Suspense fallback={null}>
          <Footer {...mapFooterProps(site)} />
        </Suspense>
      )}
    </>
  );
};
