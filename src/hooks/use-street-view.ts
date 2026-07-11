import { useEffect, useState } from "react";

import type { AuthHeader } from "../lib/desk-types";

export type StreetViewStatus =
  | "idle"
  | "loading"
  | "misconfigured"
  | "ready"
  | "unavailable";

export interface StreetViewState {
  /** Ready-to-mount Maps Embed iframe `src` (server-provided), else null. */
  embedUrl: string | null;
  status: StreetViewStatus;
}

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

// Surface a config problem ONCE instead of hiding it behind a silent "no street
// view" placeholder. `missing-key` means GOOGLE_STREETVIEW_API_KEY is absent on
// the server (e.g. not set in the Vercel environment).
let warnedMisconfigured = false;
const warnMisconfigured = (): void => {
  if (warnedMisconfigured) {
    return;
  }
  warnedMisconfigured = true;
  console.warn(
    "[street-view] Server reported a missing key. Set GOOGLE_STREETVIEW_API_KEY in Vercel (Production + Preview) and enable the Maps Embed API + Street View Static API for it. See .env.example."
  );
};

interface StreetViewResponseBody {
  available?: boolean;
  embedUrl?: string;
  reason?: string;
}

const IDLE_STATE: StreetViewState = { embedUrl: null, status: "idle" };

/**
 * Resolve the interactive Street View for one home. Hits the auth-gated,
 * server-keyed proxy which both checks that imagery exists AND returns the
 * fully-formed Maps Embed URL (key embedded server-side) — so the client never
 * depends on a `VITE_` build-time key. Returns `{ status, embedUrl }`: the
 * caller mounts the iframe only when `status === "ready"`. A `missing-key`
 * server reason surfaces as `misconfigured` (+ a one-time console warning)
 * rather than a silent "unavailable". Abortable on unmount / home change.
 */
export const useStreetView = ({
  address,
  authHeader,
  enabled,
  lat,
  lng,
}: UseStreetViewArgs): StreetViewState => {
  const [state, setState] = useState<StreetViewState>(IDLE_STATE);

  useEffect(() => {
    if (!enabled) {
      setState(IDLE_STATE);
      return;
    }
    const params = buildParams(lat, lng, address);
    if (!params) {
      setState({ embedUrl: null, status: "unavailable" });
      return;
    }

    const controller = new AbortController();
    setState({ embedUrl: null, status: "loading" });

    const load = async () => {
      try {
        const response = await fetch(
          `/api/desk-streetview?mode=meta&${params.toString()}`,
          {
            headers: authHeader ?? undefined,
            signal: controller.signal,
          }
        );
        const body = (await response.json()) as StreetViewResponseBody;
        if (controller.signal.aborted) {
          return;
        }
        if (response.ok && body.available && body.embedUrl) {
          setState({ embedUrl: body.embedUrl, status: "ready" });
          return;
        }
        if (body.reason === "missing-key") {
          warnMisconfigured();
          setState({ embedUrl: null, status: "misconfigured" });
          return;
        }
        setState({ embedUrl: null, status: "unavailable" });
      } catch {
        if (!controller.signal.aborted) {
          setState({ embedUrl: null, status: "unavailable" });
        }
      }
    };

    load();
    return () => controller.abort();
  }, [address, authHeader, enabled, lat, lng]);

  return state;
};
