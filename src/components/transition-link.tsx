import { forwardRef, useSyncExternalStore } from "react";
import type { LinkProps } from "react-router-dom";
import { Link, useLocation, useResolvedPath } from "react-router-dom";

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
export const TransitionLink = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, viewTransition: viewTransitionProp, relative, ...rest }, ref) => {
    const location = useLocation();
    const resolved = useResolvedPath(to, { relative });

    const pathOrSearchChanged =
      resolved.pathname !== location.pathname ||
      resolved.search !== location.search;

    const prefersReducedMotion = useSyncExternalStore(
      subscribeReducedMotion,
      getReducedMotionSnapshot,
      () => false
    );

    const wantVt =
      viewTransitionProp !== false &&
      !prefersReducedMotion &&
      pathOrSearchChanged;

    return (
      <Link
        ref={ref}
        {...rest}
        relative={relative}
        to={to}
        viewTransition={wantVt}
      />
    );
  }
);

TransitionLink.displayName = "transition-link";
