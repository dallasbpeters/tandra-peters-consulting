import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { processPhotoFile } from "../image-pipeline";

const heic2any = vi.fn<(args: unknown) => Promise<Blob>>();
vi.mock(import("heic2any"), () => ({
  default: (args: unknown) => heic2any(args),
}));

const drawImage =
  vi.fn<
    (
      image: unknown,
      dx: number,
      dy: number,
      dWidth: number,
      dHeight: number
    ) => void
  >();

const makeBitmap = (width: number, height: number) => ({
  close: vi.fn<() => void>(),
  height,
  width,
});

describe(processPhotoFile, () => {
  beforeEach(() => {
    drawImage.mockClear();
    heic2any.mockReset();
    heic2any.mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));

    vi.stubGlobal(
      "createImageBitmap",
      vi.fn<() => Promise<unknown>>().mockResolvedValue(makeBitmap(4000, 3000))
    );

    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback: BlobCallback) => {
        callback(new Blob(["out"], { type: "image/jpeg" }));
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("bakes EXIF orientation via createImageBitmap", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    await processPhotoFile(file);

    expect(createImageBitmap).toHaveBeenCalledWith(file, {
      imageOrientation: "from-image",
    });
  });

  it("downscales the longest edge to the 2000px cap", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const result = await processPhotoFile(file);

    // 4000×3000 → 2000×1500 (longest edge clamped to 2000).
    expect(result.width).toBe(2000);
    expect(result.height).toBe(1500);
    const { 3: drawWidth, 4: drawHeight } = drawImage.mock.calls[0];
    expect(drawWidth).toBe(2000);
    expect(drawHeight).toBe(1500);
  });

  it("routes HEIC files through heic2any before decoding", async () => {
    const file = new File(["data"], "IMG_0001.HEIC", { type: "image/heic" });
    await processPhotoFile(file);

    expect(heic2any).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ toType: "image/jpeg" })
    );
  });

  it("does not invoke heic2any for regular JPEGs", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    await processPhotoFile(file);
    expect(heic2any).not.toHaveBeenCalled();
  });

  it("throws a friendly error when the image cannot be decoded", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi
        .fn<() => Promise<unknown>>()
        .mockRejectedValue(new Error("decode failed"))
    );
    const file = new File(["data"], "broken.jpg", { type: "image/jpeg" });
    await expect(processPhotoFile(file)).rejects.toThrow(
      /not a readable image/i
    );
  });
});
