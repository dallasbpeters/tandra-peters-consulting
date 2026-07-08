import { createDownload } from "ai";
import type { Experimental_DownloadFunction } from "ai";

const httpDownload = createDownload();

/** Decode screenshot data URLs; delegate http/https to the default AI SDK downloader. */
export const downloadVisionAssets: Experimental_DownloadFunction = async (
  items
) =>
  Promise.all(
    items.map((item) => {
      if (item.url.protocol === "data:") {
        const { href } = item.url;
        const [meta = "", payload = ""] = href.slice(5).split(",", 2);
        const mediaType = meta.split(";")[0] || undefined;
        const data = meta.includes(";base64")
          ? Uint8Array.from(Buffer.from(payload, "base64"))
          : new TextEncoder().encode(decodeURIComponent(payload));

        return { data, mediaType };
      }

      if (item.isUrlSupportedByModel) {
        return null;
      }

      return httpDownload(item);
    })
  );
