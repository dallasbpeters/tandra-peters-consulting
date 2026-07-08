import { describe, expect, it } from "vitest";

import { plainTextFromRich } from "./plain-text";

describe(plainTextFromRich, () => {
  it("removes invisible metadata characters from share text", () => {
    expect(plainTextFromRich("Roof\u200B inspection\u2060 guide\uFEFF")).toBe(
      "Roof inspection guide"
    );
  });
});
