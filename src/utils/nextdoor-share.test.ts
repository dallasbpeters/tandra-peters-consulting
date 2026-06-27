import { describe, expect, it } from "vitest";

import { buildNextdoorShareUrl } from "./nextdoor-share";

const NEXTDOOR_BODY_MATCH_REGEX = /[?&]body=([^&]*)/;

describe("buildNextdoorShareUrl", () => {
  it("uses Nextdoor's supported ShareKit route and parameters", () => {
    const url = new URL(
      buildNextdoorShareUrl("Roof inspection https://www.tandra.me/estimate")
    );

    expect(url.pathname).toBe("/sharekit/");
    expect(url.searchParams.get("source")).toBe("tandra.me");
    expect(url.searchParams.get("body")).toBe(
      "Roof inspection https://www.tandra.me/estimate"
    );
    expect(url.searchParams.get("hashtag")).toBe("roofing");
  });

  it("keeps the encoded body within Nextdoor's 3,500-character limit", () => {
    const url = new URL(buildNextdoorShareUrl("🏠".repeat(1000)));
    const encodedBody = url.search.match(NEXTDOOR_BODY_MATCH_REGEX)?.[1] ?? "";

    expect(encodedBody.length).toBeLessThanOrEqual(3500);
    expect(decodeURIComponent(encodedBody)).not.toContain("�");
  });
});
