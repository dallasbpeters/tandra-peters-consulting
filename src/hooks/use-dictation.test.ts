import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the Apple-vs-default mime-type selection and isAppleWebkit
 * detection in useDictation. The helpers are exported for testing only.
 */

describe("isAppleWebkit", () => {
  const setUA = (ua: string) =>
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);

  afterEach(() => vi.restoreAllMocks());

  it("detects iPhone", async () => {
    setUA(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
    );
    const { isAppleWebkit } = await import("./use-dictation");
    expect(isAppleWebkit()).toBeTruthy();
  });

  it("does not match Chrome on Windows", async () => {
    setUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125");
    const { isAppleWebkit } = await import("./use-dictation");
    expect(isAppleWebkit()).toBeFalsy();
  });
});

describe("pickMimeType", () => {
  const setUA = (ua: string) =>
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);

  afterEach(() => vi.restoreAllMocks());

  it("picks audio/mp4 first on iPhone when supported", async () => {
    setUA(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
    );
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: (type: string) =>
        ["audio/mp4", "audio/webm"].includes(type),
    });
    const { pickMimeType } = await import("./use-dictation");
    expect(pickMimeType()).toBe("audio/mp4");
    vi.unstubAllGlobals();
  });

  it("picks audio/webm;codecs=opus first on desktop Chrome", async () => {
    setUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125");
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: (type: string) =>
        ["audio/webm;codecs=opus", "audio/mp4"].includes(type),
    });
    const { pickMimeType } = await import("./use-dictation");
    expect(pickMimeType()).toBe("audio/webm;codecs=opus");
    vi.unstubAllGlobals();
  });

  it("returns undefined when nothing is supported", async () => {
    setUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: () => false,
    });
    const { pickMimeType } = await import("./use-dictation");
    expect(pickMimeType()).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
