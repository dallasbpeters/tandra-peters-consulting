import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv, type PluginOption, type ProxyOptions } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

import { ogImageComposite } from "./plugins/ogImageComposite";
import { viteAdVersionsApi } from "./plugins/viteAdVersionsApi";
import { viteAgentDevApi } from "./plugins/viteAgentDevApi";
import { viteAnalyticsApi } from "./plugins/viteAnalyticsApi";
import { viteContactDevApi } from "./plugins/viteContactDevApi";
import { viteEmailDevApi } from "./plugins/viteEmailDevApi";
import { viteEstimateDevApi } from "./plugins/viteEstimateDevApi";
import { viteFalDevApi } from "./plugins/viteFalDevApi";
import { viteSanityImageApi } from "./plugins/viteSanityImageApi";
import { viteSeoDashboardApi } from "./plugins/viteSeoDashboardApi";
import { viteSitemapApi } from "./plugins/viteSitemapApi";
import { viteUnsplashApi } from "./plugins/viteUnsplashApi";
import { viteWorkflowSaveApi } from "./plugins/viteWorkflowSaveApi";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const defaultSiteUrl = mode === "development" ? "http://localhost:3001" : "https://www.tandra.me";
  /** Canonical site origin for OG/Twitter meta in `index.html` (`%SITE_URL%`). */
  const siteUrl = (env.VITE_SITE_URL || defaultSiteUrl).trim().replace(/\/$/, "");

  /**
   * Origin only (e.g. https://www.tandra.me). Strips `/api/contact` if pasted by
   * mistake. When set, `/api/contact` is proxied to this remote target instead
   * of being handled locally by `viteContactDevApi` — use it only to test a
   * deployed endpoint. By default (unset) the form runs the real handler locally
   * against `.env.local` (Resend email + Sanity upsert).
   */
  const contactProxyTarget = (() => {
    const raw = env.VITE_CONTACT_API_URL?.trim().replace(/\/$/, "") ?? "";
    if (!raw) return "";
    return raw.replace(/\/api\/contact$/i, "").replace(/\/api$/i, "");
  })();
  const useLocalContactApi = !contactProxyTarget;

  const posthogProxyTarget = env.VITE_PUBLIC_POSTHOG_HOST?.trim().replace(/\/$/, "") ?? "";
  const posthogCloudIngestion = /^https:\/\/(us|eu)\.i\.posthog\.com$/i.test(posthogProxyTarget);
  const enablePosthogDev = env.VITE_ENABLE_POSTHOG_DEV?.trim().toLowerCase() === "true";
  const usePosthogDevProxy =
    mode === "development" && enablePosthogDev && posthogProxyTarget && !posthogCloudIngestion;

  const posthogProxyBase = {
    target: posthogProxyTarget,
    changeOrigin: true,
    secure: true,
  };

  const devProxy: Record<string, ProxyOptions> = {};
  if (contactProxyTarget) {
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
    viteEmailDevApi(env) as unknown as PluginOption,
    viteEstimateDevApi(env) as unknown as PluginOption,
    viteAnalyticsApi(env) as unknown as PluginOption,
    ...(useLocalContactApi ? [viteContactDevApi(env) as unknown as PluginOption] : []),
    tailwindcss() as unknown as PluginOption,
    react() as unknown as PluginOption,
    {
      name: "html-site-url",
      transformIndexHtml(html) {
        return html.replaceAll("%SITE_URL%", siteUrl);
      },
    } satisfies PluginOption,
    ViteImageOptimizer({
      /** Base OG PNG + roofline SVG are composited later; do not recompress the base PNG here. */
      exclude: ["roofline.svg"],
      png: { quality: 80 },
      jpeg: { quality: 75 },
      webp: { quality: 80 },
      avif: { quality: 70 },
      svg: {
        plugins: [{ name: "removeViewBox" }, { name: "sortAttrs" }],
      },
    }) as unknown as PluginOption,
    ogImageComposite() as unknown as PluginOption,
  ];

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
      dedupe: ["three"],
    },
    optimizeDeps: {
      exclude: ["@awesome.me/webawesome"],
    },
    css: {
      // Map compiled CSS back to source (theme files, estimator.css, etc.) in dev.
      devSourcemap: true,
    },
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
