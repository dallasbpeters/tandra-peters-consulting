import { Suspense, lazy, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import type { HeroProps, NavItem } from "../types";

import { GoogleAuthGate } from "../components/GoogleAuthGate";
import { useSanitySite } from "../context/useSanitySite";
import { mapFooterProps, mapNavProps } from "../sanity/mapSanityHome";
import { NavVariant } from "./NavVariant";

const Footer = lazy(async () => {
  const module = await import("./Footer");
  return { default: module.Footer };
});

type SitePageChromeProps = {
  children: ReactNode;
  /** Passed from pages that know the active hero variant (e.g. Home). Forwarded to NavVariant so the nav matches the hero. */
  heroStyle?: HeroProps["heroStyle"];
};

export const SitePageChrome = ({ children, heroStyle }: SitePageChromeProps) => {
  const location = useLocation();
  const { data } = useSanitySite();
  const site = data?.site as Record<string, unknown> | null | undefined;
  const navProps = mapNavProps(site);
  const isAgentRoute =
    location.pathname === "/agent" ||
    location.pathname === "/marketing" ||
    location.pathname === "/ads" ||
    location.pathname === "/advertising";
  const agentNavItems: NavItem[] = [
    { name: "Feature Agent", href: "/agent" },
    { name: "Marketing Agent", href: "/marketing" },
    { name: "Ad Builder", href: "/ads" },
  ];

  return (
    <>
      <GoogleAuthGate>
        <NavVariant
          {...navProps}
          navItems={isAgentRoute ? agentNavItems : navProps.navItems}
          heroStyle={isAgentRoute ? undefined : heroStyle}
        />
      </GoogleAuthGate>
      {children}
      <Suspense fallback={null}>
        <Footer {...mapFooterProps(site)} />
      </Suspense>
    </>
  );
};
