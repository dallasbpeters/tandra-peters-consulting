import type { MouseEvent } from "react";
import { useCallback } from "react";
import { useLocation } from "react-router-dom";

/** In-page section anchor on the homepage (smooth-scroll), not a routed path. */
export const isInPageHashHref = (href: string) => href.startsWith("#");

/** Hash and in-page nav behavior shared across all nav variants. */
export const useSiteNav = () => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  const resolveNavTo = useCallback((href: string) => {
    if (href.startsWith("#")) {
      return { hash: href, pathname: "/" as const };
    }
    return href;
  }, []);

  const handleSectionNavClick = useCallback(
    (href: string, onAfterNavigate?: () => void) =>
      (event: MouseEvent<HTMLAnchorElement>) => {
        if (!isHome) {
          onAfterNavigate?.();
          return;
        }
        if (href.startsWith("#") && href !== "#") {
          event.preventDefault();
          onAfterNavigate?.();
          const id = href.slice(1);
          window.setTimeout(
            () => {
              document.querySelector(`#${id}`)?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
              window.history.replaceState(null, "", href);
            },
            onAfterNavigate ? 200 : 0
          );
          return;
        }
        onAfterNavigate?.();
      },
    [isHome]
  );

  return { handleSectionNavClick, isHome, resolveNavTo };
};
