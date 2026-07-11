import { describe, expect, it } from "vitest";

import { isBackendRoutePath, isWalkRoutePath } from "./backend-routes";

describe(isWalkRoutePath, () => {
  it("matches a walk session route with a target id", () => {
    expect(isWalkRoutePath("/desk/walk/abc123")).toBeTruthy();
  });

  it("matches the walk base and tolerates a trailing slash", () => {
    expect(isWalkRoutePath("/desk/walk")).toBeTruthy();
    expect(isWalkRoutePath("/desk/walk/")).toBeTruthy();
  });

  it("does not match the desk root or other desk sub-routes", () => {
    expect(isWalkRoutePath("/desk")).toBeFalsy();
    expect(isWalkRoutePath("/desk/walkthrough")).toBeFalsy();
    expect(isWalkRoutePath("/desk/area")).toBeFalsy();
  });

  it("does not match non-walk routes", () => {
    expect(isWalkRoutePath("/")).toBeFalsy();
    expect(isWalkRoutePath("/seo")).toBeFalsy();
  });
});

describe(isBackendRoutePath, () => {
  it("treats walk routes as backend routes", () => {
    expect(isBackendRoutePath("/desk/walk/abc123")).toBeTruthy();
  });

  it("does not match the marketing home route", () => {
    expect(isBackendRoutePath("/")).toBeFalsy();
  });
});
