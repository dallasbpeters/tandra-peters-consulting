import "../test/a11y-mocks";
import { describe, expect, it } from "vitest";

import { a11yCases } from "../test/a11y-catalog";
import { runAxe } from "../test/axe";

describe("accessibility (axe-core)", () => {
  it.each(a11yCases)("$name has no axe violations", async ({ render }) => {
    const { container } = render();
    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });
});
