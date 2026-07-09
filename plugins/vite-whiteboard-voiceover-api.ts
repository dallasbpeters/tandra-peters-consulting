/**
 * Dev-only Vite middleware that serves the whiteboard voiceover and
 * ElevenLabs agent endpoints without `vercel dev`.
 *
 * Handles:
 *   POST /api/whiteboard-voiceover
 *   GET  /api/elevenlabs-agent
 *   POST /api/elevenlabs-agent
 */
import type { IncomingMessage, ServerResponse } from "node:http";

import type { Plugin } from "vite";

import { readRequestBody } from "./request-body";

const VOICEOVER_PATH = "/api/whiteboard-voiceover";
const AGENT_PATH = "/api/elevenlabs-agent";
const HANDLED_PATHS = new Set([VOICEOVER_PATH, AGENT_PATH]);

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

const parseJson = (buffer: Buffer): Record<string, unknown> => {
  if (!buffer.length) {
    return {};
  }
  try {
    return JSON.parse(buffer.toString("utf-8")) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const sendJson = (res: ServerResponse, data: unknown, status = 200): void => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  res.statusCode = status;
  res.end(JSON.stringify(data));
};

const ENV_KEYS = [
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_DEFAULT_VOICE_ID",
  "ELEVENLABS_TANDRA_VOICE_ID",
  "ELEVENLABS_AGENT_ID",
  "BLOB_READ_WRITE_TOKEN",
  "ANTHROPIC_API_KEY",
] as const;

export const viteWhiteboardVoiceoverApi = (
  env: Record<string, string>
): Plugin => ({
  configureServer(server) {
    for (const key of ENV_KEYS) {
      if (!process.env[key] && env[key]) {
        process.env[key] = env[key];
      }
    }

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex middleware
    server.middlewares.use(
      async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const pathname = pathnameOnly(req.url);
        if (!HANDLED_PATHS.has(pathname)) {
          next();
          return;
        }

        if (req.method === "OPTIONS") {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization"
          );
          res.statusCode = 204;
          res.end();
          return;
        }

        try {
          const bodyBuf = await readRequestBody(
            req as Parameters<typeof readRequestBody>[0]
          );
          const body = parseJson(bodyBuf);
          const query = Object.fromEntries(
            new URL(req.url ?? "", "http://localhost").searchParams.entries()
          );

          const mockReq = {
            body,
            method: req.method,
            query,
            url: req.url,
          };

          const mockRes = {
            _body: "",
            _headers: {} as Record<string, string>,
            _status: 200,
            end: () => mockRes,
            getHeader: (k: string) => mockRes._headers[k],
            json: (data: unknown) => {
              mockRes._body = JSON.stringify(data);
              return mockRes;
            },
            send: (data: string) => {
              mockRes._body = data;
              return mockRes;
            },
            setHeader: (k: string, v: string) => {
              mockRes._headers[k] = v;
              return mockRes;
            },
            status: (code: number) => {
              mockRes._status = code;
              return mockRes;
            },
          };

          const { default: handler } =
            pathname === VOICEOVER_PATH
              ? await import("../api/whiteboard-voiceover.js")
              : await import("../api/elevenlabs-agent.js");
          await handler(
            mockReq as unknown as Parameters<typeof handler>[0],
            mockRes as unknown as Parameters<typeof handler>[1]
          );

          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Content-Type", "application/json");
          res.statusCode = mockRes._status;
          res.end(mockRes._body);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          sendJson(res, { error: message, ok: false }, 500);
        }
      }
    );
  },
  name: "vite-whiteboard-voiceover-api",
});
