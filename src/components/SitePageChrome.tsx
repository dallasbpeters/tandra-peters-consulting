import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { Nav } from "./Nav";
import { useSanitySite } from "../context/useSanitySite";
import { mapFooterProps, mapNavProps } from "../sanity/mapSanityHome";
import type { NavItem } from "../types";
import { GoogleAuthGate } from "../components/GoogleAuthGate";

const Footer = lazy(async () => {
  const module = await import("./Footer");
  return { default: module.Footer };
});

const useRenderWhenVisible = () => {
  const [canRender, setCanRender] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (canRender) {
      return;
    }

    const render = () => setCanRender(true);
    let frame = 0;
    const check = () => {
      const node = sentinelRef.current;
      if (node && node.getBoundingClientRect().top <= window.innerHeight + 80) {
        render();
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
      }
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(check);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [canRender]);

  return { canRender, sentinelRef };
};

type SitePageChromeProps = {
  children: ReactNode;
};

export const SitePageChrome = ({ children }: SitePageChromeProps) => {
  const location = useLocation();
  const { data } = useSanitySite();
  const { canRender: canRenderFooter, sentinelRef } = useRenderWhenVisible();
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
        <Nav
          {...navProps}
          navItems={isAgentRoute ? agentNavItems : navProps.navItems}
        />
      </GoogleAuthGate>
      {children}
      <div ref={sentinelRef} aria-hidden="true" />
      {canRenderFooter ? (
        <Suspense fallback={null}>
          <Footer {...mapFooterProps(site)} />
        </Suspense>
      ) : null}
    </>
  );
};
