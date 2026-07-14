import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useBodyScrollLock } from "./use-body-scroll-lock";

describe(useBodyScrollLock, () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("locks body scroll while locked and restores the previous value on unlock", () => {
    document.body.style.overflow = "auto";

    const { rerender, unmount } = renderHook(
      ({ locked }) => useBodyScrollLock(locked),
      { initialProps: { locked: true } }
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender({ locked: false });
    expect(document.body.style.overflow).toBe("auto");

    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("does not touch body overflow when never locked", () => {
    document.body.style.overflow = "scroll";
    renderHook(() => useBodyScrollLock(false));
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("restores the previous overflow on unmount while still locked", () => {
    document.body.style.overflow = "auto";
    const { unmount } = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });
});
