import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { PluginOption, ProxyOptions } from "vite";
import { defineConfig, loadEnv } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

import { ogImageComposite } from "./plugins/og-image-composite";
import { viteAdVersionsApi } from "./plugins/vite-ad-versions-api";
import { viteAgentDevApi } from "./plugins/vite-agent-dev-api";
import { viteAnalyticsApi } from "./plugins/vite-analytics-api";
import { viteCalendarAgentApi } from "./plugins/vite-calendar-agent-api";
import { viteContactDevApi } from "./plugins/vite-contact-dev-api";
import { viteContentCalendarApi } from "./plugins/vite-content-calendar-api";
import { viteDeskAreaIntelApi } from "./plugins/vite-desk-area-intel-api";
import { viteDeskBoardApi } from "./plugins/vite-desk-board-api";
import { viteDeskCaptureApi } from "./plugins/vite-desk-capture-api";
import { viteDeskDirectMailApi } from "./plugins/vite-desk-direct-mail-api";
import { viteDeskPlanApi } from "./plugins/vite-desk-plan-api";
import { viteDeskTargetsApi } from "./plugins/vite-desk-targets-api";
import { viteEmailDevApi } from "./plugins/vite-email-dev-api";
import { viteEstimateDevApi } from "./plugins/vite-estimate-dev-api";
import { viteFalDevApi } from "./plugins/vite-fal-dev-api";
import { viteRenderTandraIntroApi } from "./plugins/vite-render-tandra-intro-api";
import { viteSanityImageApi } from "./plugins/vite-sanity-image-api";
import { viteSeoDashboardApi } from "./plugins/vite-seo-dashboard-api";
import { viteSitemapApi } from "./plugins/vite-sitemap-api";
import { viteUnsplashApi } from "./plugins/vite-unsplash-api";
import { viteWhiteboardVoiceoverApi } from "./plugins/vite-whiteboard-voiceover-api";
import { viteWorkflowSaveApi } from "./plugins/vite-workflow-save-api";

// oxlint-disable-next-line require-unicode-regexp
const TRAILING_SLASH_RE = /\/$/;
// oxlint-disable-next-line require-unicode-regexp
const CONTACT_API_PATH_RE = /\/api\/contact$/i;
// oxlint-disable-next-line require-unicode-regexp
const API_PATH_RE = /\/api$/i;
// oxlint-disable-next-line prefer-named-capture-group require-unicode-regexp
const POSTHOG_CLOUD_RE = /^https:\/\/(us|eu)\.i\.posthog\.com$/i;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const defaultSiteUrl =
    mode === "development" ? "http://localhost:3001" : "https://www.tandra.me";
  /** Canonical site origin for OG/Twitter meta in `index.html` (`%SITE_URL%`). */
  const siteUrl = (env.VITE_SITE_URL || defaultSiteUrl)
    .trim()
    .replace(TRAILING_SLASH_RE, "");

  /**
   * Origin only (e.g. https://www.tandra.me). Strips `/api/contact` if pasted by
   * mistake. When set, `/api/contact` is proxied to this remote target instead
   * of being handled locally by `viteContactDevApi` — use it only to test a
   * deployed endpoint. By default (unset) the form runs the real handler locally
   * against `.env.local` (Resend email + Sanity upsert).
   */
  const contactProxyTarget = (() => {
    const raw =
      env.VITE_CONTACT_API_URL?.trim().replace(TRAILING_SLASH_RE, "") ?? "";
    if (!raw) {
      return "";
    }
    return raw.replace(CONTACT_API_PATH_RE, "").replace(API_PATH_RE, "");
  })();
  const useLocalContactApi = !contactProxyTarget;

  const posthogProxyTarget =
    env.VITE_PUBLIC_POSTHOG_HOST?.trim().replace(TRAILING_SLASH_RE, "") ?? "";
  const posthogCloudIngestion = POSTHOG_CLOUD_RE.test(posthogProxyTarget);
  const enablePosthogDev =
    env.VITE_ENABLE_POSTHOG_DEV?.trim().toLowerCase() === "true";
  const usePosthogDevProxy =
    mode === "development" &&
    enablePosthogDev &&
    posthogProxyTarget &&
    !posthogCloudIngestion;

  const posthogProxyBase = {
    changeOrigin: true,
    secure: true,
    target: posthogProxyTarget,
  };

  const devProxy: Record<string, ProxyOptions> = {};
  if (contactProxyTarget) {
    // oxlint-disable-next-line sort-keys
    devProxy["/api/contact"] = {
      target: contactProxyTarget,
      changeOrigin: true,
      secure: true,
      // The deployed /api/contact enforces ALLOWED_ORIGINS against the Origin
      // header. The browser sends http://localhost:3001 (not in production's
      // allowlist → 403). This hop is server-to-server, so rewrite Origin to the
      // proxy target to test the live endpoint locally without weakening prod.
      configure: (proxy) => {
        proxy.on("proxyReq", (proxyReq) => {
          proxyReq.setHeader("origin", contactProxyTarget);
        });
      },
    };
  }
  if (usePosthogDevProxy) {
    // Path prefixes must not match app routes. Broad patterns like `^/s` proxy
    // `/src/*` (Vite modules) to PostHog and break Presentation preview + dev.
    for (const key of [
      "^/e/",
      "^/batch",
      "^/decide",
      "^/flags",
      "^/s/",
      "^/i/",
      "^/static/",
      "^/array/",
      "^/api/(?!contact(?:$|/))",
    ]) {
      devProxy[key] = { ...posthogProxyBase };
    }
  }

  const plugins: PluginOption[] = [
    viteAgentDevApi(env) as unknown as PluginOption,
    viteFalDevApi(env) as unknown as PluginOption,
    viteSanityImageApi() as unknown as PluginOption,
    viteUnsplashApi(env) as unknown as PluginOption,
    viteSitemapApi(env) as unknown as PluginOption,
    viteSeoDashboardApi(env) as unknown as PluginOption,
    viteWorkflowSaveApi(env) as unknown as PluginOption,
    viteAdVersionsApi(env) as unknown as PluginOption,
    viteDeskAreaIntelApi(env) as unknown as PluginOption,
    viteDeskBoardApi(env) as unknown as PluginOption,
    viteDeskCaptureApi(env) as unknown as PluginOption,
    viteDeskDirectMailApi(env) as unknown as PluginOption,
    viteDeskPlanApi(env) as unknown as PluginOption,
    viteDeskTargetsApi(env) as unknown as PluginOption,
    viteContentCalendarApi(env) as unknown as PluginOption,
    viteCalendarAgentApi(env) as unknown as PluginOption,
    viteEmailDevApi(env) as unknown as PluginOption,
    viteEstimateDevApi(env) as unknown as PluginOption,
    viteRenderTandraIntroApi(env) as unknown as PluginOption,
    viteAnalyticsApi(env) as unknown as PluginOption,
    viteWhiteboardVoiceoverApi(env) as unknown as PluginOption,
    ...(useLocalContactApi
      ? [viteContactDevApi(env) as unknown as PluginOption]
      : []),
    tailwindcss() as unknown as PluginOption,
    react() as unknown as PluginOption,
    {
      name: "html-site-url",
      transformIndexHtml(html) {
        return html.replaceAll("%SITE_URL%", siteUrl);
      },
    } satisfies PluginOption,
    ViteImageOptimizer({
      avif: { quality: 70 },
      /** Base OG PNG + roofline SVG are composited later; do not recompress the base PNG here. */
      exclude: ["roofline.svg"],
      jpeg: { quality: 75 },
      png: { quality: 80 },
      svg: {
        plugins: [{ name: "removeViewBox" }, { name: "sortAttrs" }],
      },
      webp: { quality: 80 },
    }) as unknown as PluginOption,
    ogImageComposite() as unknown as PluginOption,
  ];

  return {
    css: {
      // Map compiled CSS back to source (theme files, estimator.css, etc.) in dev.
      devSourcemap: true,
    },
    optimizeDeps: {
      exclude: ["@awesome.me/webawesome"],
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "."),
      },
      dedupe: ["three"],
    },
    // oxlint-disable-next-line sort-keys
    server: {
      port: 3001,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      watch: {
        // Sanity Studio runs its own Vite on :3333 — don't cross-trigger site reloads/HMR.
        ignored: ["**/studio-tandra-peters/**"],
      },
      ...(Object.keys(devProxy).length > 0 ? { proxy: devProxy } : {}),
    },
  };
});
