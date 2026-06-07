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
import "./index.css";
import "./styles/site-layout.css";
/* StrictMode disabled: double-mounting breaks Presentation ↔ visual-editing comlink in dev. */
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import { isPosthogEnabled, resolvePosthogClientOptions } from "./posthogClientConfig";

const posthogToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();

if (posthogToken && isPosthogEnabled()) {
  const posthogOptions = resolvePosthogClientOptions();

  posthog.init(posthogToken, {
    ...posthogOptions,
    defaults: "2026-01-30",
    // Pre-seed an empty flags map so the SDK treats flags as "loaded" immediately.
    // This silences "getFeatureFlag failed — flags didn't load in time" warnings for
    // PostHog's own internal flags (e.g. christmas-override). Our hero-banner-style
    // flag still resolves from /decide as normal.
    bootstrap: { featureFlags: {} },
    loaded: (client) => {
      if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_POSTHOG_DEV === "true") {
        const toolbarReady = client.toolbar?.maybeLoadToolbar?.() ?? false;
        console.info("[PostHog] SDK ready", {
          api_host: client.config.api_host,
          ui_host: client.config.ui_host,
          toolbar_external_deps: !client.config.disable_external_dependency_loading,
          toolbar_launch_detected: toolbarReady,
        });
        if (!toolbarReady) {
          console.info(
            "[PostHog] Toolbar: use Launch toolbar in PostHog for http://localhost:3001 (authorized URL must match this port).",
          );
        }
      }
    },
  });
}

createRoot(document.getElementById("root")!).render(
  <PostHogProvider client={posthog}>
    <App />
  </PostHogProvider>,
);
