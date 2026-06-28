import { useGSAP } from "@gsap/react";
import { PostHogProvider } from "@posthog/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitText from "gsap/SplitText";
import posthog from "posthog-js";

// Register all GSAP plugins once at app boot — never inside component files.
// Re-registering on every HMR reload breaks Vite HMR.
gsap.registerPlugin(ScrollTrigger, useGSAP, SplitText);

import "./styles/fonts.css";
import "@awesome.me/webawesome/dist/styles/utilities.css";
import "./index.css";
import "./styles/site-layout.css";
/* StrictMode disabled: double-mounting breaks Presentation ↔ visual-editing comlink in dev. */
import { createRoot } from "react-dom/client";

import App from "./app.tsx";
import { isElectronDesktopApp } from "./lib/desktop-shell";
import {
  isPosthogEnabled,
  resolvePosthogClientOptions,
} from "./posthog-client-config";

/**
 * After a deploy, tabs opened on the previous build request lazy-route chunks
 * by their old hashed filenames, which 404 on Vercel (e.g. clicking the
 * Privacy Policy link dies silently). Vite fires `vite:preloadError` when a
 * dynamic-import preload fails — reload once so the tab picks up the new
 * build. The sessionStorage guard prevents a reload loop if the chunk is
 * genuinely broken.
 */
window.addEventListener("vite:preloadError", (event) => {
  const RELOAD_AT_KEY = "vite-preload-error-reloaded-at";
  const lastReloadAt = Number(
    window.sessionStorage.getItem(RELOAD_AT_KEY) ?? 0
  );
  if (Date.now() - lastReloadAt < 30_000) {
    return;
  }
  window.sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()));
  event.preventDefault();
  window.location.reload();
});

const posthogToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();

if (posthogToken && isPosthogEnabled()) {
  const posthogOptions = resolvePosthogClientOptions();

  posthog.init(posthogToken, {
    ...posthogOptions,
    defaults: "2026-01-30",
    // Do not pass `bootstrap.featureFlags: {}` — an empty object makes
    // useFeatureFlagVariantKey return undefined before /flags loads, which
    // flashes the control nav on off-home routes.
    loaded: () => {
      if (
        import.meta.env.DEV &&
        import.meta.env.VITE_ENABLE_POSTHOG_DEV === "true"
      ) {
        const toolbarReady = posthog.toolbar?.maybeLoadToolbar?.() ?? false;
        console.info("[PostHog] SDK ready", {
          api_host: posthog.config.api_host,
          toolbar_external_deps:
            !posthog.config.disable_external_dependency_loading,
          toolbar_launch_detected: toolbarReady,
          ui_host: posthog.config.ui_host,
        });
        if (!toolbarReady) {
          console.info(
            "[PostHog] Toolbar: use Launch toolbar in PostHog for http://localhost:3001 (authorized URL must match this port)."
          );
        }
      }
    },
  });
}

const rootEl = document.querySelector("#root");
if (!rootEl) {
  throw new Error("Root element #root not found in document.");
}

if (isElectronDesktopApp()) {
  document.documentElement.classList.add("desktop-app");
}

createRoot(rootEl).render(
  <PostHogProvider client={posthog}>
    <App />
  </PostHogProvider>
);
