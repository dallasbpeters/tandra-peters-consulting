import { useCallback, useSyncExternalStore } from "react";

const getServerSnapshot = () => false;

export function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${breakpoint}px)`;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onStoreChange);
      return () => mediaQuery.removeEventListener("change", onStoreChange);
    },
    [query]
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
