import { describe, expect, it, vi } from "vitest";

import { preventFocusScroll } from "./prevent-focus-scroll";
import type { ScrollableView } from "./prevent-focus-scroll";

const makeView = (x: number, y: number) => {
  const view: ScrollableView = {
    scrollTo: vi.fn<(nextX: number, nextY: number) => void>((nextX, nextY) => {
      view.scrollX = nextX;
      view.scrollY = nextY;
    }),
    scrollX: x,
    scrollY: y,
  };
  return view;
};

describe(preventFocusScroll, () => {
  it("restores the pre-focus scroll offset when the element is focused (pointerdown)", () => {
    const view = makeView(0, 500);
    const element = document.createElement("div");
    preventFocusScroll(element, view);

    // The instant before focus, the page sits at y=500.
    element.dispatchEvent(new Event("pointerdown"));
    // The browser's focus scroll then jumps the page down to y=900…
    view.scrollY = 900;
    element.dispatchEvent(new Event("focus"));

    // …and we snap it right back so the click never scrolled the page.
    expect(view.scrollTo).toHaveBeenCalledWith(0, 500);
    expect(view.scrollY).toBe(500);
  });

  it("also snapshots on mousedown (non-pointer browsers)", () => {
    const view = makeView(10, 320);
    const element = document.createElement("div");
    preventFocusScroll(element, view);

    element.dispatchEvent(new Event("mousedown"));
    view.scrollY = 800;
    element.dispatchEvent(new Event("focus"));

    expect(view.scrollTo).toHaveBeenCalledWith(10, 320);
  });

  it("stops restoring scroll after teardown", () => {
    const view = makeView(0, 200);
    const element = document.createElement("div");
    const teardown = preventFocusScroll(element, view);

    teardown();
    element.dispatchEvent(new Event("pointerdown"));
    element.dispatchEvent(new Event("focus"));

    expect(view.scrollTo).not.toHaveBeenCalled();
  });
});
