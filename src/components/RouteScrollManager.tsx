import { useContext, useLayoutEffect } from "react";
import {
  useLocation,
  UNSAFE_ViewTransitionContext as ViewTransitionContext,
} from "react-router";

const LEADING_HASH_RE = /^#/;

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
  const vtContext = useContext(ViewTransitionContext);

  useLayoutEffect(() => {
    if (vtContext?.isTransitioning) {
      return;
    }

    // PostHog toolbar auth lives in location.hash — do not treat it as an in-page anchor.
    if (hash.includes("__posthog") || hash.includes("ph_authorize")) {
      return;
    }

    const id = hash?.replace(LEADING_HASH_RE, "").trim() ?? "";

    const runScroll = () => {
      if (pathname === "/") {
        if (id) {
          const el = document.getElementById(id);
          if (el) {
            el.scrollIntoView({
              behavior: prefersReducedMotion() ? "auto" : "smooth",
              block: "start",
            });
          } else {
            window.scrollTo(0, 0);
          }
          return;
        }

        window.scrollTo(0, 0);
        return;
      }

      window.scrollTo(0, 0);
    };

    runScroll();
  }, [pathname, hash, vtContext?.isTransitioning]);

  return null;
};
