import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AnnotationScene,
  TextAnnotation,
} from "../../../lib/report-pdf/types";
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
      // Deterministic width so hit-testing math in tests is predictable.
      measureText: vi.fn<(text: string) => { width: number }>((text) => ({
        width: text.length * 10,
      })),
      lineTo: vi.fn<() => void>(),
      moveTo: vi.fn<() => void>(),
      quadraticCurveTo: vi.fn<() => void>(),
      restore: vi.fn<() => void>(),
      save: vi.fn<() => void>(),
      setLineDash: vi.fn<() => void>(),
      setTransform: vi.fn<() => void>(),
      stroke: vi.fn<() => void>(),
      strokeRect: vi.fn<() => void>(),
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
    // A tap releases immediately; leaving the pointer "down" would make the
    // next pointerDown look like a second finger (pinch) instead of a tap.
    fireEvent.pointerUp(canvas, { clientX: 100, clientY: 80, pointerId: 1 });
    const input = screen.getByPlaceholderText("Type…");
    fireEvent.change(input, { target: { value: text } });
    fireEvent.keyDown(input, { key: "Enter" });
  };

  const getFontSizeSlider = () =>
    screen.getByRole("slider", { name: "Font size" });

  const saveAndGetScene = () => {
    fireEvent.click(screen.getByRole("button", { name: /done/i }));
    return onSave.mock.calls.at(-1)?.[0] as AnnotationScene;
  };

  it("places a pen stroke from a single-pointer drag", async () => {
    const canvas = await renderAnnotator();

    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 50, clientY: 50, pointerId: 1 });

    const scene = saveAndGetScene();
    expect(scene.items).toHaveLength(1);
    expect(scene.items[0].kind).toBe("pen");
  });

  it("shows a font size slider once the text tool is active", async () => {
    await renderAnnotator();

    expect(
      screen.queryByRole("slider", { name: "Font size" })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Text" }));

    expect(getFontSizeSlider()).toBeInTheDocument();
  });

  it("lets the user change text size and applies it to placed text", async () => {
    const canvas = await renderAnnotator();

    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    // small preset for a 1000px-wide image (5) * the 1.4 text multiplier.
    fireEvent.change(getFontSizeSlider(), { target: { value: "7" } });
    placeText(canvas, "Small note");

    const scene = saveAndGetScene();
    expect(scene.items).toHaveLength(1);
    expect(scene.items[0]).toMatchObject({ kind: "text", text: "Small note" });
    expect((scene.items[0] as TextAnnotation).size).toBe(7);
  });

  it("applies a larger font size when the slider is raised", async () => {
    const canvas = await renderAnnotator();

    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    fireEvent.change(getFontSizeSlider(), { target: { value: "30" } });
    placeText(canvas, "Big note");

    const scene = saveAndGetScene();
    expect((scene.items[0] as TextAnnotation).size).toBe(30);
  });

  it("does not resize text when the pen tool's width presets are clicked", async () => {
    const canvas = await renderAnnotator();

    // Width presets belong to the pen tool by default; they must not leak
    // into the text size used once the user switches tools.
    fireEvent.click(screen.getByRole("button", { name: /large width/i }));
    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    placeText(canvas, "Default size note");

    const scene = saveAndGetScene();
    // Falls back to the default text size (large preset * 1.4), unaffected
    // by the pen-width click.
    expect((scene.items[0] as TextAnnotation).size).toBeCloseTo(19.6);
  });

  it("drags an existing text item to reposition it", async () => {
    const canvas = await renderAnnotator();

    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    placeText(canvas, "Move me");

    // Grab the just-placed text (still under the original placement point)
    // and drag it 100 natural px to the right (80 client px at scale 0.8).
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 80, pointerId: 2 });
    fireEvent.pointerMove(canvas, { clientX: 180, clientY: 80, pointerId: 2 });
    fireEvent.pointerUp(canvas, { clientX: 180, clientY: 80, pointerId: 2 });

    const scene = saveAndGetScene();
    expect(scene.items).toHaveLength(1);
    const moved = scene.items[0] as TextAnnotation;
    expect(moved.x).toBeCloseTo(225);
    expect(moved.y).toBeCloseTo(100);
  });

  it("edits the content of a selected text item", async () => {
    const canvas = await renderAnnotator();

    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    placeText(canvas, "Original");

    fireEvent.click(screen.getByRole("button", { name: "Edit text" }));
    const input = screen.getByPlaceholderText("Type…");
    expect(input).toHaveValue("Original");
    fireEvent.change(input, { target: { value: "Updated" } });
    fireEvent.keyDown(input, { key: "Enter" });

    const scene = saveAndGetScene();
    expect(scene.items).toHaveLength(1);
    expect(scene.items[0]).toMatchObject({ kind: "text", text: "Updated" });
  });

  it("deletes the selected text item", async () => {
    const canvas = await renderAnnotator();

    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    placeText(canvas, "Remove me");
    fireEvent.click(screen.getByRole("button", { name: "Delete text" }));

    const scene = saveAndGetScene();
    expect(scene.items).toHaveLength(0);
  });

  const drawPenStroke = (canvas: HTMLCanvasElement) => {
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 50, clientY: 50, pointerId: 1 });
  };

  it("starts with undo/redo disabled and enables undo after drawing", async () => {
    const canvas = await renderAnnotator();

    const undoButton = screen.getByRole("button", { name: "Undo" });
    const redoButton = screen.getByRole("button", { name: "Redo" });
    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();

    drawPenStroke(canvas);

    expect(undoButton).toBeEnabled();
    expect(redoButton).toBeDisabled();
  });

  it("undo removes the last stroke and redo brings it back", async () => {
    const canvas = await renderAnnotator();
    drawPenStroke(canvas);

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(saveAndGetScene().items).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(saveAndGetScene().items).toHaveLength(1);
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

    const scene = saveAndGetScene();
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
