import type { ReactNode } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { useSanitySite } from "../context/SanitySiteContext";
import { mapFooterProps, mapNavProps } from "../sanity/mapSanityHome";
import { theme } from "../theme";

type SitePageChromeProps = {
  children: ReactNode;
};

export const SitePageChrome = ({ children }: SitePageChromeProps) => {
  const { data } = useSanitySite();
  const site = data?.site as Record<string, unknown> | null | undefined;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.colors.paper,
        color: theme.colors.everglade,
        fontFamily: theme.fonts.body,
      }}
    >
      <Nav {...mapNavProps(site)} />
      {children}
      <Footer {...mapFooterProps(site)} />
    </div>
  );
};
