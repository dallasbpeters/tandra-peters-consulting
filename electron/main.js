import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFalClient } from "@fal-ai/client";
import { config as loadDotenv } from "dotenv";
import { app, BrowserWindow } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FAL_ENDPOINT = "fal-ai/esrgan";
let mainWindow = null;
const DATA_URL_REGEX = /^data:([^;,]+);base64,(.+)$/i;
const STRIP_EXTENSION_REGEX = /\.[^.]+$/;
const APP_ICON_PATH = path.join(
  app.getAppPath(),
  "electron",
  "assets",
  "app-icon.png"
);

const loadDesktopEnv = () => {
  const roots = [
    process.cwd(),
    app.getAppPath(),
    typeof process.resourcesPath === "string" ? process.resourcesPath : "",
    path.dirname(process.execPath),
    app.getPath("userData"),
  ];

  for (const root of roots) {
    if (!root) {
      continue;
    }
    for (const filename of [".env.local", ".env"]) {
      const envPath = path.join(root, filename);
      if (existsSync(envPath)) {
        loadDotenv({ override: false, path: envPath });
      }
    }
  }
};

const MODEL_OPTIONS = new Set([
  "RealESRGAN_x4plus",
  "RealESRGAN_x2plus",
  "RealESRGAN_x4plus_anime_6B",
  "RealESRGAN_x4_v3",
  "RealESRGAN_x4_wdn_v3",
  "RealESRGAN_x4_anime_v3",
]);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const parseDataUrl = (value) => {
  const match = DATA_URL_REGEX.exec(String(value ?? "").trim());
  if (!match) {
    return null;
  }
  const [, mimeType, base64] = match;
  return {
    buffer: Buffer.from(base64, "base64"),
    mimeType,
  };
};

const toNumber = (value, fallback, min, max) => {
  let numeric = Number.NaN;
  if (typeof value === "number") {
    numeric = value;
  } else if (typeof value === "string" && value.trim()) {
    numeric = Number(value);
  }
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(numeric)));
};

const stripFileExtension = (value) => value.replace(STRIP_EXTENSION_REGEX, "");

const sendJson = (res, statusCode, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
};

const _readRequestBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
};

const sendText = (
  res,
  statusCode,
  body,
  contentType = "text/plain; charset=utf-8"
) => {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  res.writeHead(statusCode, {
    "Content-Length": buffer.length,
    "Content-Type": contentType,
  });
  res.end(buffer);
};

const serveStaticFile = async (res, staticDir, pathname) => {
  const normalizedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(staticDir, normalizedPath));
  if (!filePath.startsWith(staticDir)) {
    sendText(res, 403, "Forbidden");
    return true;
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Length": data.length,
      "Content-Type": MIME_TYPES[ext] ?? "application/octet-stream",
    });
    res.end(data);
    return true;
  } catch {
    return false;
  }
};

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
};

const handleFalUpscaleRequest = async (req, res, falKey) => {
  if (!falKey) {
    sendJson(res, 500, {
      error: "Fal API is not configured. Set FAL_KEY.",
    });
    return true;
  }

  try {
    const body = await readJsonBody(req);
    const imageUrl =
      typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    const dataUrl =
      typeof body.imageDataUrl === "string" ? body.imageDataUrl.trim() : "";
    const parsed = dataUrl ? parseDataUrl(dataUrl) : null;

    if (!(imageUrl || parsed)) {
      sendJson(res, 400, {
        error: "imageDataUrl or imageUrl is required.",
      });
      return true;
    }

    const client = createFalClient({ credentials: falKey });
    const sourceUrl =
      imageUrl ||
      (await client.storage.upload(
        new Blob([parsed.buffer], { type: parsed.mimeType })
      ));
    const model = MODEL_OPTIONS.has(body.model)
      ? body.model
      : "RealESRGAN_x4plus";
    const outputFormat = body.outputFormat === "jpeg" ? "jpeg" : "png";
    const scale = toNumber(body.scale, 4, 2, 16);
    const tile = toNumber(body.tile, 0, 0, 800);
    const face = Boolean(body.face);

    const result = await client.subscribe(FAL_ENDPOINT, {
      input: {
        face,
        image_url: sourceUrl,
        model,
        output_format: outputFormat,
        scale,
        tile,
      },
      logs: false,
      mode: "polling",
      pollInterval: 500,
      startTimeout: 60,
    });

    const image = result.data?.image;
    if (!image?.url) {
      throw new Error("Fal returned no upscaled image.");
    }

    sendJson(res, 200, {
      face,
      image: {
        content_type: image.content_type ?? "image/png",
        file_name:
          image.file_name ??
          `${typeof body.fileName === "string" && body.fileName.trim() ? stripFileExtension(body.fileName.trim()) : "fal-upscale"}-${scale}x.${outputFormat}`,
        file_size: image.file_size,
        height: image.height,
        url: image.url,
        width: image.width,
      },
      model,
      outputFormat,
      requestId: result.requestId,
      scale,
      sourceUrl,
      tile,
    });
  } catch (error) {
    sendJson(res, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Unexpected Fal upscale error.",
    });
  }

  return true;
};

const handleDesktopRequest = async (req, res, staticDir, falKey) => {
  const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");

  if (
    req.method === "POST" &&
    requestUrl.pathname === "/api/fal/upscale-image"
  ) {
    await handleFalUpscaleRequest(req, res, falKey);
    return;
  }

  const served = await serveStaticFile(res, staticDir, requestUrl.pathname);
  if (served) {
    return;
  }

  const indexPath = path.join(staticDir, "index.html");
  try {
    const html = await readFile(indexPath);
    res.writeHead(200, {
      "Content-Length": html.length,
      "Content-Type": "text/html; charset=utf-8",
    });
    res.end(html);
  } catch (error) {
    sendJson(res, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Unable to load desktop app shell.",
    });
  }
};

const startDesktopServer = async () => {
  loadDesktopEnv();
  const falKey = process.env.FAL_KEY?.trim();
  const staticDir = path.join(app.getAppPath(), "dist");

  const server = createServer((req, res) => {
    handleDesktopRequest(req, res, staticDir, falKey).catch(() => undefined);
  });

  const port = await new Promise((resolve) => {
    const listener = server.listen(0, "127.0.0.1", () => {
      const address = listener.address();
      if (address && typeof address === "object") {
        resolve(address.port);
        return;
      }
      resolve(0);
    });
  });

  mainWindow = new BrowserWindow({
    width: 1560,
    height: 1040,
    minWidth: 1180,
    minHeight: 820,
    icon: APP_ICON_PATH,
    title: "Fal Upscaler",
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  await mainWindow.loadURL(`http://127.0.0.1:${port}/upscaler`);
};

const createWindow = async () => {
  const devUrl = process.env.ELECTRON_START_URL?.trim();
  if (devUrl) {
    mainWindow = new BrowserWindow({
      width: 1560,
      height: 1040,
      minWidth: 1180,
      minHeight: 820,
      icon: APP_ICON_PATH,
      title: "Fal Upscaler",
    });
    mainWindow.on("closed", () => {
      mainWindow = null;
    });
    await mainWindow.loadURL(devUrl);
    return;
  }

  await startDesktopServer();
};

app.whenReady().then(() => createWindow());

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch(() => undefined);
  }
});
