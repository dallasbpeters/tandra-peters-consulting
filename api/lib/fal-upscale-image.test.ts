import { beforeEach, describe, expect, it, vi } from "vitest";

const subscribe = vi.fn<
  (
    endpoint: string,
    options: unknown
  ) => Promise<{
    data: { image: { url: string } };
    requestId: string;
  }>
>();

vi.mock(import("@fal-ai/client"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    createFalClient: (() => ({
      storage: { upload: vi.fn<() => Promise<string>>() },
      subscribe,
    })) as unknown as typeof original.createFalClient,
  };
});

const { handler } = await import("./fal-upscale-image.js");

const runRequest = async (model: string) => {
  const request = new Request("http://localhost/api/fal/upscale-image", {
    body: JSON.stringify({
      face: true,
      imageUrl: "https://example.com/source.png",
      model,
      outputFormat: "png",
      scale: 4,
      tile: 200,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  return handler(request);
};

describe("fal upscale image", () => {
  beforeEach(() => {
    process.env.FAL_KEY = "test-key";
    subscribe.mockReset();
    subscribe.mockResolvedValue({
      data: { image: { url: "https://example.com/result.png" } },
      requestId: "request-id",
    });
  });

  it("routes Topaz models to the Topaz endpoint and input schema", async () => {
    const response = await runRequest("Wonder 3");

    expect(response.status).toBe(200);
    expect(subscribe).toHaveBeenCalledWith(
      "fal-ai/topaz/upscale/image",
      expect.objectContaining({
        input: {
          face_enhancement: true,
          image_url: "https://example.com/source.png",
          model: "Wonder 3",
          output_format: "png",
          upscale_factor: 4,
        },
      })
    );
    await expect(response.json()).resolves.toMatchObject({
      model: "Wonder 3",
      provider: "topaz",
    });
  });

  it("keeps ESRGAN models on the ESRGAN endpoint and input schema", async () => {
    const response = await runRequest("RealESRGAN_x4plus");

    expect(response.status).toBe(200);
    expect(subscribe).toHaveBeenCalledWith(
      "fal-ai/esrgan",
      expect.objectContaining({
        input: {
          face: true,
          image_url: "https://example.com/source.png",
          model: "RealESRGAN_x4plus",
          output_format: "png",
          scale: 4,
          tile: 200,
        },
      })
    );
    await expect(response.json()).resolves.toMatchObject({
      model: "RealESRGAN_x4plus",
      provider: "esrgan",
    });
  });
});
