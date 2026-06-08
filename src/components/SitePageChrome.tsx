import type { ReactNode } from "react";

type SitePageChromeProps = {
  children: ReactNode;
};

/** Page content wrapper — nav and footer live in SiteShell (RootLayout). */
export const SitePageChrome = ({ children }: SitePageChromeProps) => children;
