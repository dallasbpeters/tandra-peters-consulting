import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    env: {
      NODE_ENV: "test",
    },
    environment: "jsdom",
    environmentOptions: {
      jsdom: { url: "http://localhost:3000" },
    },
    globals: true,
    // The full jsdom + axe suite runs many heavy renders in parallel; under
    // load, individual cases can exceed Vitest's 5s default and flake as
    // timeouts rather than real failures. Give tests and setup hooks a
    // realistic budget so the suite reflects genuine regressions.
    hookTimeout: 20_000,
    setupFiles: ["./src/test/setup.tsx"],
    testTimeout: 20_000,
  },
});
