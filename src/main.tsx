/* StrictMode disabled: double-mounting breaks Presentation ↔ visual-editing comlink in dev. */
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";
import { resolvePosthogClientOptions } from "./posthogClientConfig";

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN, {
  ...resolvePosthogClientOptions(),
  defaults: "2026-01-30",
});

createRoot(document.getElementById("root")!).render(
  <PostHogProvider client={posthog}>
    <App />
  </PostHogProvider>,
);
