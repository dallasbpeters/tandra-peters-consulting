import { forwardRef, useSyncExternalStore } from "react";
import { Link, useLocation, useResolvedPath, type LinkProps } from "react-router-dom";

const subscribeReducedMotion = (onStoreChange: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
};

const getReducedMotionSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * SPA link with View Transitions when pathname/search change.
 *
 * Delegates to React Router's data-router `viewTransition` flag so navigation
 * finishes rendering before the browser captures the "new" snapshot.
 */
export const TransitionLink = forwardRef<HTMLAnchorElement, LinkProps>(function TransitionLink(
  { to, viewTransition: viewTransitionProp, relative, ...rest },
  ref,
) {
  const location = useLocation();
  const resolved = useResolvedPath(to, { relative });

  const pathOrSearchChanged =
    resolved.pathname !== location.pathname || resolved.search !== location.search;

  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  const wantVt = viewTransitionProp !== false && !prefersReducedMotion && pathOrSearchChanged;

  return <Link ref={ref} {...rest} to={to} relative={relative} viewTransition={wantVt} />;
});

TransitionLink.displayName = "TransitionLink";
