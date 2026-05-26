import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { useSanitySite } from "../context/SanitySiteContext";
import { mapFooterProps, mapNavProps } from "../sanity/mapSanityHome";
import type { NavItem } from "../types";
import {
  GoogleAuthGate,
} from "../components/GoogleAuthGate";

type SitePageChromeProps = {
  children: ReactNode;
};

export const SitePageChrome = ({ children }: SitePageChromeProps) => {
  const location = useLocation();
  const { data } = useSanitySite();
  const site = data?.site as Record<string, unknown> | null | undefined;
  const navProps = mapNavProps(site);
  const isAgentRoute =
    location.pathname === "/agent" || location.pathname === "/marketing";
  const agentNavItems: NavItem[] = [
    { name: "Feature Agent", href: "/agent" },
    { name: "Marketing Agent", href: "/marketing" },
  ];

  return (
    <>
    <GoogleAuthGate>
      <Nav
        {...navProps}
        navItems={isAgentRoute ? agentNavItems : navProps.navItems}
      />  </GoogleAuthGate>
      {children}
      <Footer {...mapFooterProps(site)} />
    </>
  );
};
