#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * POST /api/render-tandra-intro on production by default.
 *
 * Usage:
 *   pnpm video:render:vercel
 *   pnpm video:render:vercel -- --url https://www.tandra.me
 */
import { config as loadEnv } from "dotenv";

const repoRoot = path.dirname(import.meta.dirname);
loadEnv({ path: path.join(repoRoot, ".env.local") });

const args = process.argv.slice(2);
const urlFlagIndex = args.indexOf("--url");
const baseUrl =
  urlFlagIndex === -1
    ? process.env.VITE_RENDER_SITE_URL?.trim() || "https://www.tandra.me"
    : args[urlFlagIndex + 1];

const secret = process.env.RENDER_VIDEO_SECRET?.trim();
const endpoint = `${baseUrl.replace(/\/$/, "")}/api/render-tandra-intro`;

console.log(`[video:render:vercel] POST ${endpoint}`);

const headers = { "Content-Type": "application/json" };
if (secret) {
  headers.Authorization = `Bearer ${secret}`;
}

const started = Date.now();
const response = await fetch(endpoint, { headers, method: "POST" });
const body = await response.text();

let payload;
try {
  payload = JSON.parse(body);
} catch {
  payload = body;
}

if (!response.ok) {
  console.error(
    `[video:render:vercel] Failed (${response.status}) after ${Math.round((Date.now() - started) / 1000)}s:`,
    payload
  );
  process.exit(1);
}

console.log(
  `[video:render:vercel] Done in ${Math.round((Date.now() - started) / 1000)}s`
);
console.log(JSON.stringify(payload, null, 2));
