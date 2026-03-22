import { forwardRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import {
  Link,
  useNavigate,
  useLocation,
  useResolvedPath,
  createPath,
  type LinkProps,
} from "react-router-dom";

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
 * React Router's `Link viewTransition` only works with a data router
 * (`createBrowserRouter` / `RouterProvider`). With `BrowserRouter`, `navigate`
 * ignores that flag, so we call `document.startViewTransition` + `flushSync`
 * here (same pattern the data router uses internally).
 */
export const TransitionLink = forwardRef<HTMLAnchorElement, LinkProps>(
  function TransitionLink(
    {
      to,
      onClick,
      viewTransition: viewTransitionProp,
      replace,
      state,
      preventScrollReset,
      relative,
      target,
      ...rest
    },
    ref,
  ) {
    const navigate = useNavigate();
    const location = useLocation();
    const resolved = useResolvedPath(to, { relative });

    const pathOrSearchChanged =
      resolved.pathname !== location.pathname ||
      resolved.search !== location.search;

    const prefersReducedMotion = useSyncExternalStore(
      subscribeReducedMotion,
      getReducedMotionSnapshot,
      () => true,
    );

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) {
        return;
      }

      const wantVt =
        viewTransitionProp !== false &&
        !prefersReducedMotion &&
        pathOrSearchChanged;

      if (!wantVt) {
        return;
      }

      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> };
      };
      if (typeof doc.startViewTransition !== "function") {
        return;
      }

      if (
        e.button !== 0 ||
        e.metaKey ||
        e.altKey ||
        e.ctrlKey ||
        e.shiftKey
      ) {
        return;
      }
      if (target && target !== "_self") {
        return;
      }

      e.preventDefault();

      const shouldReplace =
        replace !== undefined
          ? replace
          : createPath(location) === createPath(resolved);

      doc.startViewTransition(() => {
        flushSync(() => {
          navigate(to, {
            replace: shouldReplace,
            state,
            preventScrollReset,
            relative,
          });
        });
      });
    };

    return (
      <Link
        ref={ref}
        {...rest}
        to={to}
        replace={replace}
        state={state}
        preventScrollReset={preventScrollReset}
        relative={relative}
        target={target}
        onClick={handleClick}
        viewTransition={false}
      />
    );
  },
);

TransitionLink.displayName = "TransitionLink";
