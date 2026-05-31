import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv, type PluginOption } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import { viteFalDevApi } from "./plugins/viteFalDevApi";
import { ogImageComposite } from "./plugins/ogImageComposite";
import { viteAgentDevApi } from "./plugins/viteAgentDevApi";
import { viteSanityImageApi } from "./plugins/viteSanityImageApi";
import { viteSitemapApi } from "./plugins/viteSitemapApi";
import { viteSeoDashboardApi } from "./plugins/viteSeoDashboardApi";
import { viteUnsplashApi } from "./plugins/viteUnsplashApi";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const defaultSiteUrl =
    mode === "development" ? "http://localhost:3001" : "https://www.tandra.me";
  /** Canonical site origin for OG/Twitter meta in `index.html` (`%SITE_URL%`). */
  const siteUrl = (env.VITE_SITE_URL || defaultSiteUrl)
    .trim()
    .replace(/\/$/, "");

  /** Origin only (e.g. https://www.tandra.me). Strips `/api/contact` if pasted by mistake. */
  const contactProxyTarget = (() => {
    const raw = env.VITE_CONTACT_API_URL?.trim().replace(/\/$/, "") ?? "";
    if (!raw) return "";
    return raw.replace(/\/api\/contact$/i, "").replace(/\/api$/i, "");
  })();

  const posthogProxyTarget =
    env.VITE_PUBLIC_POSTHOG_HOST?.trim().replace(/\/$/, "") ?? "";
  const posthogCloudIngestion = /^https:\/\/(us|eu)\.i\.posthog\.com$/i.test(
    posthogProxyTarget,
  );
  const enablePosthogDev =
    env.VITE_ENABLE_POSTHOG_DEV?.trim().toLowerCase() === "true";
  const usePosthogDevProxy =
    mode === "development" &&
    enablePosthogDev &&
    posthogProxyTarget &&
    !posthogCloudIngestion;

  const posthogProxyBase = {
    target: posthogProxyTarget,
    changeOrigin: true,
    secure: true,
  };

  const devProxy: Record<string, typeof posthogProxyBase> = {};
  if (contactProxyTarget) {
    devProxy["/api/contact"] = {
      target: contactProxyTarget,
      changeOrigin: true,
      secure: true,
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
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      ...(Object.keys(devProxy).length > 0 ? { proxy: devProxy } : {}),
    },
  };
});
