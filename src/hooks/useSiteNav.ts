import { useCallback, type MouseEvent } from "react";
import { useLocation } from "react-router-dom";

/** In-page section anchor on the homepage (smooth-scroll), not a routed path. */
export const isInPageHashHref = (href: string) => href.startsWith("#");

/** Hash and in-page nav behavior shared across all nav variants. */
export const useSiteNav = () => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  const resolveNavTo = useCallback((href: string) => {
    if (href.startsWith("#")) {
      return { pathname: "/" as const, hash: href };
    }
    return href;
  }, []);

  const handleSectionNavClick = useCallback(
    (href: string, onAfterNavigate?: () => void) => (event: MouseEvent<HTMLAnchorElement>) => {
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
            document.getElementById(id)?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
            window.history.replaceState(null, "", href);
          },
          onAfterNavigate ? 200 : 0,
        );
        return;
      }
      onAfterNavigate?.();
    },
    [isHome],
  );

  return { isHome, resolveNavTo, handleSectionNavClick };
};
