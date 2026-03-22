import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Ensures footer / in-app navigations land at a sensible scroll position:
 * - Non-home routes: always scroll to top.
 * - Home with a hash: scroll target section into view (after layout; double rAF so
 *   DOM is ready when coming from another route or a view transition).
 * - Home without a hash: scroll to top.
 */
export const RouteScrollManager = () => {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    const id = hash?.replace(/^#/, "").trim() ?? "";

    if (pathname === "/") {
      if (id) {
        const run = () => {
          const el = document.getElementById(id);
          if (el) {
            el.scrollIntoView({
              behavior: prefersReducedMotion() ? "auto" : "smooth",
              block: "start",
            });
          } else {
            window.scrollTo(0, 0);
          }
        };
        requestAnimationFrame(() => {
          requestAnimationFrame(run);
        });
      } else {
        window.scrollTo(0, 0);
      }
      return;
    }

    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
};
