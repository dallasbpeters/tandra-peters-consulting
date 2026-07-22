import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AnnotationScene } from "../../../lib/report-pdf/types";
import { PhotoAnnotator } from "../photo-annotator";

const STAGE_SIZE = 800;

const makeBitmap = (width: number, height: number) =>
  ({
    close: vi.fn<() => void>(),
    height,
    width,
  }) as unknown as ImageBitmap;

const setRect = (
  el: Element,
  rect: { height: number; left: number; top: number; width: number }
) => {
  Object.defineProperty(el, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      bottom: rect.top + rect.height,
      height: rect.height,
      left: rect.left,
      right: rect.left + rect.width,
      top: rect.top,
      width: rect.width,
      x: rect.left,
      y: rect.top,
    }),
  });
};

describe(PhotoAnnotator, () => {
  const onCancel = vi.fn<() => void>();
  const onSave = vi.fn<(scene: AnnotationScene) => void>();

  beforeEach(() => {
    onCancel.mockClear();
    onSave.mockClear();

    vi.stubGlobal(
      "createImageBitmap",
      vi.fn<() => Promise<unknown>>().mockResolvedValue(makeBitmap(1000, 800))
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      beginPath: vi.fn<() => void>(),
      clearRect: vi.fn<() => void>(),
      drawImage: vi.fn<() => void>(),
      ellipse: vi.fn<() => void>(),
      fillText: vi.fn<() => void>(),
      lineTo: vi.fn<() => void>(),
      moveTo: vi.fn<() => void>(),
      quadraticCurveTo: vi.fn<() => void>(),
      restore: vi.fn<() => void>(),
      save: vi.fn<() => void>(),
      setTransform: vi.fn<() => void>(),
      stroke: vi.fn<() => void>(),
    } as unknown as CanvasRenderingContext2D);

    // The fit-to-stage effect needs a nonzero stage size to compute a scale.
    Object.defineProperty(HTMLDivElement.prototype, "clientWidth", {
      configurable: true,
      value: STAGE_SIZE,
    });
    Object.defineProperty(HTMLDivElement.prototype, "clientHeight", {
      configurable: true,
      value: STAGE_SIZE,
    });

    // jsdom doesn't implement the Pointer Events capture API at all, so a
    // real (non-mock) stub is required before it can be spied on.
    for (const method of [
      "setPointerCapture",
      "releasePointerCapture",
      "hasPointerCapture",
    ] as const) {
      if (typeof HTMLCanvasElement.prototype[method] !== "function") {
        HTMLCanvasElement.prototype[method] = () => false;
      }
    }
    vi.spyOn(
      HTMLCanvasElement.prototype,
      "setPointerCapture"
    ).mockImplementation(vi.fn<() => void>());
    vi.spyOn(
      HTMLCanvasElement.prototype,
      "releasePointerCapture"
    ).mockImplementation(vi.fn<() => void>());
    vi.spyOn(
      HTMLCanvasElement.prototype,
      "hasPointerCapture"
    ).mockImplementation(vi.fn<() => boolean>(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const renderAnnotator = async () => {
    render(
      <PhotoAnnotator
        image={new Blob(["x"], { type: "image/jpeg" })}
        initialScene={null}
        onCancel={onCancel}
        onSave={onSave}
      />
    );
    const canvas = document.querySelector(
      ".photo-annotator__canvas"
    ) as HTMLCanvasElement;
    await waitFor(() => expect(canvas.style.width).not.toBe(""));
    setRect(canvas, {
      height: Number.parseFloat(canvas.style.height),
      left: 0,
      top: 0,
      width: Number.parseFloat(canvas.style.width),
    });
    return canvas;
  };

  const placeText = (canvas: HTMLCanvasElement, text: string) => {
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 80, pointerId: 1 });
    const input = screen.getByPlaceholderText("Type…");
    fireEvent.change(input, { target: { value: text } });
    fireEvent.keyDown(input, { key: "Enter" });
  };

  it("places a pen stroke from a single-pointer drag", async () => {
    const canvas = await renderAnnotator();

    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 50, clientY: 50, pointerId: 1 });

    fireEvent.click(screen.getByRole("button", { name: /done/i }));

    expect(onSave).toHaveBeenCalledOnce();
    const scene = onSave.mock.calls[0][0] as AnnotationScene;
    expect(scene.items).toHaveLength(1);
    expect(scene.items[0].kind).toBe("pen");
  });

  it("lets the user change text size and applies it to placed text", async () => {
    const canvas = await renderAnnotator();

    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    fireEvent.click(screen.getByRole("button", { name: /small text size/i }));
    placeText(canvas, "Small note");
    fireEvent.click(screen.getByRole("button", { name: /done/i }));

    expect(onSave).toHaveBeenCalledOnce();
    const scene = onSave.mock.calls[0][0] as AnnotationScene;
    expect(scene.items).toHaveLength(1);
    expect(scene.items[0]).toMatchObject({ kind: "text", text: "Small note" });
    // small preset for a 1000px-wide image (5) * the 1.4 text multiplier.
    expect((scene.items[0] as { size: number }).size).toBeCloseTo(7);
  });

  it("applies a larger font size when the large text preset is selected", async () => {
    const canvas = await renderAnnotator();

    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    fireEvent.click(screen.getByRole("button", { name: /large text size/i }));
    placeText(canvas, "Big note");
    fireEvent.click(screen.getByRole("button", { name: /done/i }));

    const scene = onSave.mock.calls[0][0] as AnnotationScene;
    // large preset for a 1000px-wide image (14) * the 1.4 text multiplier.
    expect((scene.items[0] as { size: number }).size).toBeCloseTo(19.6);
  });

  it("does not resize text when the pen tool's width presets are clicked", async () => {
    const canvas = await renderAnnotator();

    // Width presets belong to the pen tool by default; they must not leak
    // into the text size used once the user switches tools.
    fireEvent.click(screen.getByRole("button", { name: /large width/i }));
    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    placeText(canvas, "Default size note");
    fireEvent.click(screen.getByRole("button", { name: /done/i }));

    const scene = onSave.mock.calls[0][0] as AnnotationScene;
    // Falls back to the default text size (large preset * 1.4), unaffected
    // by the pen-width click.
    expect((scene.items[0] as { size: number }).size).toBeCloseTo(19.6);
  });

  it("pinch-zooms the canvas without drawing a stroke", async () => {
    const canvas = await renderAnnotator();
    const wrap = document.querySelector(
      ".photo-annotator__canvas-wrap"
    ) as HTMLDivElement;

    expect(wrap.style.transform).toBe("translate(0px, 0px) scale(1)");

    // Two fingers land 100px apart...
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerDown(canvas, { clientX: 200, clientY: 100, pointerId: 2 });

    // ...and spread apart to 200px, centered on the same midpoint.
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 250, clientY: 100, pointerId: 2 });

    expect(wrap.style.transform).toBe("translate(0px, 0px) scale(2)");

    fireEvent.pointerUp(canvas, { clientX: 50, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 250, clientY: 100, pointerId: 2 });

    fireEvent.click(screen.getByRole("button", { name: /done/i }));

    expect(onSave).toHaveBeenCalledOnce();
    const scene = onSave.mock.calls[0][0] as AnnotationScene;
    expect(scene.items).toHaveLength(0);
  });

  it("clamps zoom to the configured maximum", async () => {
    const canvas = await renderAnnotator();
    const wrap = document.querySelector(
      ".photo-annotator__canvas-wrap"
    ) as HTMLDivElement;

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerDown(canvas, { clientX: 110, clientY: 100, pointerId: 2 });

    // Spread far apart — a 50x jump — which should clamp to the max zoom.
    fireEvent.pointerMove(canvas, { clientX: 0, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, {
      clientX: 500,
      clientY: 100,
      pointerId: 2,
    });

    expect(wrap.style.transform).toContain("scale(4)");
  });
});
