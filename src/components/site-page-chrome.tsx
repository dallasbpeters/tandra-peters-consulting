import type { ReactNode } from "react";

interface SitePageChromeProps {
  children: ReactNode;
}

/**
 * Page content pass-through — the single <main> landmark (and its
 * route-specific classes) is rendered by SiteShell via getMainRouteClass.
 */
export const SitePageChrome = ({ children }: SitePageChromeProps) => children;
