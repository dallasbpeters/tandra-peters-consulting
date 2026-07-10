import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Vercel Blob boundary so no network is hit. The mock echoes the
// pathname into the returned URL so tests can assert the key/extension.
const { putMock } = vi.hoisted(() => ({
  putMock: vi.fn<typeof import("@vercel/blob").put>(),
}));
vi.mock(import("@vercel/blob"), () => ({ put: putMock }));

import {
  hostHtmlReference,
  hostImageReference,
  isHttpUrl,
} from "./desk-creative-host.js";

const BLOB_HOST = "https://store.public.blob.vercel-storage.com";

// A distinct 1x1 PNG per test avoids the module-level content-hash cache
// bleeding across cases.
const pngDataUri = (marker: string): string =>
  `data:image/png;base64,${Buffer.from(`png-${marker}`).toString("base64")}`;

describe("desk-creative-host", () => {
  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = "blob-test-token";
    putMock.mockReset();
    putMock.mockImplementation((pathname: string) =>
      Promise.resolve({
        cacheControl: "public, max-age=2592000",
        contentDisposition: `inline; filename="${pathname}"`,
        contentType: "application/octet-stream",
        downloadUrl: `${BLOB_HOST}/${pathname}?download=1`,
        etag: "test-etag",
        pathname,
        uploadedAt: new Date(0),
        url: `${BLOB_HOST}/${pathname}`,
      })
    );
  });

  afterEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  describe(isHttpUrl, () => {
    it("accepts http(s) and rejects data URIs / relative paths", () => {
      expect(isHttpUrl("https://x/y.png")).toBeTruthy();
      expect(isHttpUrl("http://x/y.png")).toBeTruthy();
      expect(isHttpUrl("data:image/png;base64,AAAA")).toBeFalsy();
      expect(isHttpUrl("/ad-templates/hero.png")).toBeFalsy();
    });
  });

  describe(hostImageReference, () => {
    it("passes through an existing http(s) URL without uploading", async () => {
      const ref = await hostImageReference("https://cdn.example/hero.png");
      expect(ref).toStrictEqual({
        ok: true,
        url: "https://cdn.example/hero.png",
      });
      expect(putMock).not.toHaveBeenCalled();
    });

    it("uploads a base64 data-URI to a blob under the content-hash key", async () => {
      const ref = await hostImageReference(pngDataUri("upload"));

      expect(ref.ok).toBeTruthy();
      expect(ref.url?.startsWith(BLOB_HOST)).toBeTruthy();
      expect(putMock).toHaveBeenCalledOnce();
      const [pathname, body] = putMock.mock.calls[0];
      // Content-hash key under the desk-creatives dir, with the real extension.
      expect(pathname).toMatch(/^desk-creatives\/[a-f0-9]{64}\.png$/);
      expect(Buffer.isBuffer(body)).toBeTruthy();
    });

    it("uploads with public access, correct content-type, and idempotent options", async () => {
      await hostImageReference(pngDataUri("options"));

      const options = putMock.mock.calls[0][2];
      // Public + correct content-type so Lob/Stannp/PostGrid can fetch it.
      expect(options.access).toBe("public");
      expect(options.contentType).toBe("image/png");
      expect(options.addRandomSuffix).toBeFalsy();
      expect(options.allowOverwrite).toBeTruthy();
      expect(options.token).toBe("blob-test-token");
    });

    it("dedupes identical bytes within a process (uploads once)", async () => {
      const data = pngDataUri("dedupe");
      const first = await hostImageReference(data);
      const second = await hostImageReference(data);

      expect(first.url).toBe(second.url);
      // Second call is served from the per-process content-hash cache.
      expect(putMock).toHaveBeenCalledOnce();
    });

    it("rejects a value that is neither a URL nor a data-URI", async () => {
      const ref = await hostImageReference("not-a-url");
      expect(ref.ok).toBeFalsy();
      expect(putMock).not.toHaveBeenCalled();
    });

    it("fails clearly when BLOB_READ_WRITE_TOKEN is missing (never uploads)", async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      const ref = await hostImageReference(pngDataUri("no-token"));

      expect(ref.ok).toBeFalsy();
      expect(ref.error).toContain("BLOB_READ_WRITE_TOKEN");
      expect(putMock).not.toHaveBeenCalled();
    });

    it("surfaces a Blob upload error instead of throwing", async () => {
      putMock.mockRejectedValueOnce(new Error("network down"));
      const ref = await hostImageReference(pngDataUri("error"));

      expect(ref.ok).toBeFalsy();
      expect(ref.error).toContain("network down");
    });
  });

  describe(hostHtmlReference, () => {
    it("uploads HTML as a public text/html blob and returns the URL", async () => {
      const ref = await hostHtmlReference("<!doctype html><body>hi</body>");

      expect(ref.ok).toBeTruthy();
      const [pathname, , options] = putMock.mock.calls[0];
      expect(pathname).toMatch(/^desk-creatives\/[a-f0-9]{64}\.html$/);
      expect(options.access).toBe("public");
      expect(options.contentType).toBe("text/html");
    });
  });
});
