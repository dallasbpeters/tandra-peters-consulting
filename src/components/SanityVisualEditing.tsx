import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { VisualEditing } from "@sanity/visual-editing/react";
import type {
  HistoryAdapter,
  HistoryAdapterNavigate,
  HistoryRefresh,
  HistoryUpdate,
} from "@sanity/visual-editing";
import { useSanitySite } from "../context/SanitySiteContext";

/** Strip origin when Presentation sends absolute preview URLs. */
const toRouterPath = (url: string): string => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const u = new URL(url);
      return `${u.pathname}${u.search}${u.hash}`;
    } catch {
      return url;
    }
  }
  return url;
};

/**
 * Renders Sanity overlays via `<VisualEditing />` (same as official React integration).
 * Avoids `enableVisualEditing()` / `renderVisualEditing`, which wrap the tree in
 * `StrictMode` and can break the Presentation ↔ comlink handshake in dev.
 */
export const SanityVisualEditing = () => {
  const { refetch } = useSanitySite();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const [onHistoryNavigate, setOnHistoryNavigate] = useState<
    HistoryAdapterNavigate | undefined
  >();

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const history = useMemo<HistoryAdapter>(
    () => ({
      subscribe: (handler: HistoryAdapterNavigate) => {
        setOnHistoryNavigate(() => handler);
        return () => setOnHistoryNavigate(undefined);
      },
      update: (update: HistoryUpdate) => {
        if (update.type === "push" || update.type === "replace") {
          navigateRef.current(toRouterPath(update.url), {
            replace: update.type === "replace",
          });
          return;
        }
        if (update.type === "pop") {
          navigateRef.current(-1);
        }
      },
    }),
    [],
  );

  /**
   * Re-run the site GROQ fetch after Studio edits. We do not use Sanity’s live
   * content loader (`listen` / `defineLive`), so we must not return `false` when
   * `livePreviewEnabled` — that would skip refetch and leave preview stale.
   */
  const refresh = useCallback(
    (_payload: HistoryRefresh) => refetch(),
    [refetch],
  );

  const location = useLocation();
  useEffect(() => {
    if (!onHistoryNavigate) {
      return;
    }
    onHistoryNavigate({
      type: "push",
      url: `${location.pathname}${location.search}${location.hash}`,
    });
  }, [location.hash, location.pathname, location.search, onHistoryNavigate]);

  return (
    <VisualEditing
      portal
      history={history}
      refresh={refresh}
    />
  );
};
