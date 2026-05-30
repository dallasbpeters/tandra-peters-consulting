/* StrictMode disabled: double-mounting breaks Presentation ↔ visual-editing comlink in dev. */
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/site-layout.css";
import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";
import {
  isPosthogEnabled,
  resolvePosthogClientOptions,
} from "./posthogClientConfig";

const posthogToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();

if (posthogToken && isPosthogEnabled()) {
  posthog.init(posthogToken, {
    ...resolvePosthogClientOptions(),
    defaults: "2026-01-30",
  });
}

createRoot(document.getElementById("root")!).render(
  <PostHogProvider client={posthog}>
    <App />
  </PostHogProvider>,
);
