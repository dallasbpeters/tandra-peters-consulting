import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "../test/setup";
import { useStreetView } from "./use-street-view";

const STREETVIEW_PATH = "*/api/desk-streetview";
const AUSTIN = { address: "100 Oak St", lat: 30.31, lng: -97.71 };

interface StreetViewApiBody {
  available?: boolean;
  embedUrl?: string;
  ok?: boolean;
  reason?: string;
}

const respondWith = (body: StreetViewApiBody, status = 200): void => {
  server.use(
    http.get(STREETVIEW_PATH, () => HttpResponse.json(body, { status }))
  );
};

describe(useStreetView, () => {
  it("stays idle (and never fetches) when disabled", () => {
    const { result } = renderHook(() =>
      useStreetView({ ...AUSTIN, authHeader: null, enabled: false })
    );
    expect(result.current.status).toBe("idle");
    expect(result.current.embedUrl).toBeNull();
  });

  it("is unavailable (and never fetches) with no coordinates or address", () => {
    const { result } = renderHook(() =>
      useStreetView({ authHeader: null, enabled: true, lat: null, lng: null })
    );
    expect(result.current.status).toBe("unavailable");
  });

  it("becomes ready with the server-provided embed URL", async () => {
    respondWith({
      available: true,
      embedUrl: "https://embed.example/sv",
      ok: true,
    });
    const { result } = renderHook(() =>
      useStreetView({ ...AUSTIN, authHeader: null, enabled: true })
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.embedUrl).toBe("https://embed.example/sv");
  });

  it("stays unavailable when the server omits the embed URL", async () => {
    respondWith({ available: true, ok: true });
    const { result } = renderHook(() =>
      useStreetView({ ...AUSTIN, authHeader: null, enabled: true })
    );
    await waitFor(() => expect(result.current.status).toBe("unavailable"));
    expect(result.current.embedUrl).toBeNull();
  });

  it("surfaces a missing server key as misconfigured and warns once", async () => {
    const warn = vi.spyOn(console, "warn").mockReturnValue();
    respondWith({ available: false, ok: true, reason: "missing-key" });
    const { result } = renderHook(() =>
      useStreetView({ ...AUSTIN, authHeader: null, enabled: true })
    );
    await waitFor(() => expect(result.current.status).toBe("misconfigured"));
    expect(result.current.embedUrl).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("GOOGLE_STREETVIEW_API_KEY")
    );
    warn.mockRestore();
  });

  it("is unavailable when imagery does not exist", async () => {
    respondWith({ available: false, ok: true, reason: "no-imagery" });
    const { result } = renderHook(() =>
      useStreetView({ ...AUSTIN, authHeader: null, enabled: true })
    );
    await waitFor(() => expect(result.current.status).toBe("unavailable"));
  });
});
