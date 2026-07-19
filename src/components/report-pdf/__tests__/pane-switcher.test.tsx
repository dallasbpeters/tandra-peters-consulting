import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PaneSwitcher } from "../pane-switcher";

const setViewport = (isMobile: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    value: vi
      .fn<(query: string) => Partial<MediaQueryList>>()
      .mockImplementation((query: string) => ({
        addEventListener: vi.fn<() => void>(),
        addListener: vi.fn<() => void>(),
        dispatchEvent: vi.fn<() => boolean>(),
        matches: isMobile,
        media: query,
        onchange: null,
        removeEventListener: vi.fn<() => void>(),
        removeListener: vi.fn<() => void>(),
      })),
    writable: true,
  });
};

const renderSwitcher = () =>
  render(
    <PaneSwitcher
      editor={<div>EDITOR CONTENT</div>}
      preview={<div>PREVIEW CONTENT</div>}
    />
  );

describe(PaneSwitcher, () => {
  afterEach(() => {
    setViewport(false);
  });

  it("renders both panes side by side on wide screens with no tablist", () => {
    setViewport(false);
    renderSwitcher();

    expect(screen.getByText("EDITOR CONTENT")).toBeInTheDocument();
    expect(screen.getByText("PREVIEW CONTENT")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("shows an accessible tablist on mobile and toggles on click", () => {
    setViewport(true);
    renderSwitcher();

    const tablist = screen.getByRole("tablist");
    const [editorTab, previewTab] = within(tablist).getAllByRole("tab");

    expect(editorTab).toHaveAttribute("aria-selected", "true");
    expect(previewTab).toHaveAttribute("aria-selected", "false");

    fireEvent.click(previewTab);
    expect(previewTab).toHaveAttribute("aria-selected", "true");
    expect(editorTab).toHaveAttribute("aria-selected", "false");
  });

  it("moves selection with arrow keys on the tablist", () => {
    setViewport(true);
    renderSwitcher();

    const [editorTab, previewTab] = screen.getAllByRole("tab");
    editorTab.focus();
    fireEvent.keyDown(editorTab, { key: "ArrowRight" });
    expect(previewTab).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(previewTab, { key: "ArrowLeft" });
    expect(editorTab).toHaveAttribute("aria-selected", "true");
  });

  it("switches panes on a horizontal swipe", () => {
    setViewport(true);
    const { container } = renderSwitcher();
    const viewport = container.querySelector(".report-panes-viewport");
    expect(viewport).not.toBeNull();

    // Swipe left → advance to preview.
    fireEvent.touchStart(viewport as Element, {
      touches: [{ clientX: 240 }],
    });
    fireEvent.touchEnd(viewport as Element, {
      changedTouches: [{ clientX: 120 }],
    });

    const [editorTab, previewTab] = screen.getAllByRole("tab");
    expect(previewTab).toHaveAttribute("aria-selected", "true");

    // Swipe right → back to editor.
    fireEvent.touchStart(viewport as Element, {
      touches: [{ clientX: 120 }],
    });
    fireEvent.touchEnd(viewport as Element, {
      changedTouches: [{ clientX: 260 }],
    });
    expect(editorTab).toHaveAttribute("aria-selected", "true");
  });
});
