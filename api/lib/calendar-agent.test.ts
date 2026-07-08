import { describe, expect, it } from "vitest";

import { extractJsonPayload } from "./calendar-agent";

describe("extractJsonPayload", () => {
  it("parses a bare JSON array", () => {
    expect(extractJsonPayload('[{"title":"a"}]')).toEqual([{ title: "a" }]);
  });

  it("strips markdown fences", () => {
    const text = '```json\n[{"title":"a"}]\n```';
    expect(extractJsonPayload(text)).toEqual([{ title: "a" }]);
  });

  it("recovers an array embedded in prose", () => {
    const text = 'Here is your plan:\n[{"title":"a"}]\nLet me know!';
    expect(extractJsonPayload(text)).toEqual([{ title: "a" }]);
  });

  it("recovers a wrapped object", () => {
    const text = 'Sure: {"proposals":[{"title":"a"}]} done';
    expect(extractJsonPayload(text)).toEqual({ proposals: [{ title: "a" }] });
  });

  it("returns null for unparseable text", () => {
    expect(extractJsonPayload("no json here")).toBeNull();
    expect(extractJsonPayload("")).toBeNull();
  });
});
