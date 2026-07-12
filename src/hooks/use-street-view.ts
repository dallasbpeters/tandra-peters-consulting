import { useEffect, useState } from "react";

import type { AuthHeader } from "../lib/desk-types";

export type StreetViewStatus = "idle" | "loading" | "ready" | "unavailable";

interface UseStreetViewArgs {
  address?: string;
  authHeader: AuthHeader;
  /** Only check when the drawer is actually open (lazy). */
  enabled: boolean;
  lat: number | null;
  lng: number | null;
}

const buildParams = (
  lat: number | null,
  lng: number | null,
  address: string | undefined
): URLSearchParams | null => {
  const params = new URLSearchParams();
  if (typeof lat === "number" && typeof lng === "number") {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
    return params;
  }
  const trimmed = address?.trim();
  if (trimmed) {
    params.set("address", trimmed);
    return params;
  }
  return null;
};

/**
 * Resolve whether Street View imagery EXISTS for one home (availability gate).
 * Hits the auth-gated, server-keyed metadata proxy so the interactive panorama
 * is only ever mounted when there's real imagery — otherwise the UI shows a
 * graceful placeholder. The request is aborted on unmount / when the home
 * changes. Returns only a `status`; the panorama itself is rendered by the
 * caller with the browser Embed key.
 */
export const useStreetView = ({
  address,
  authHeader,
  enabled,
  lat,
  lng,
}: UseStreetViewArgs): StreetViewStatus => {
  const [status, setStatus] = useState<StreetViewStatus>("idle");

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    const params = buildParams(lat, lng, address);
    if (!params) {
      setStatus("unavailable");
      return;
    }

    const controller = new AbortController();
    setStatus("loading");

    const load = async () => {
      try {
        const response = await fetch(
          `/api/desk-streetview?mode=meta&${params.toString()}`,
          {
            headers: authHeader ?? undefined,
            signal: controller.signal,
          }
        );
        const body = (await response.json()) as { available?: boolean };
        if (controller.signal.aborted) {
          return;
        }
        setStatus(response.ok && body.available ? "ready" : "unavailable");
      } catch {
        if (!controller.signal.aborted) {
          setStatus("unavailable");
        }
      }
    };

    load();
    return () => controller.abort();
  }, [address, authHeader, enabled, lat, lng]);

  return status;
};

/**
 * Fetch the server-proxied Static Street View image as an object URL. Used when
 * no browser Embed key is configured — the image is streamed through the
 * auth-gated `/api/desk-streetview?mode=image` endpoint (so the API key stays on
 * the server) and can't be loaded via a plain `<img src>` because that can't
 * carry the Bearer token. Returns null until (and unless) an image is available;
 * the object URL is revoked on unmount / when the home changes.
 */
export const useStreetViewImage = ({
  address,
  authHeader,
  enabled,
  lat,
  lng,
}: UseStreetViewArgs): string | null => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSrc(null);
      return;
    }
    const params = buildParams(lat, lng, address);
    if (!params) {
      setSrc(null);
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | null = null;

    const load = async () => {
      try {
        const response = await fetch(
          `/api/desk-streetview?mode=image&${params.toString()}`,
          {
            headers: authHeader ?? undefined,
            signal: controller.signal,
          }
        );
        if (!response.ok || controller.signal.aborted) {
          return;
        }
        const blob = await response.blob();
        if (controller.signal.aborted) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        // Leave src null so the caller shows its graceful placeholder.
      }
    };

    load();
    return () => {
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [address, authHeader, enabled, lat, lng]);

  return src;
};
