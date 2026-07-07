import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const waitForUrl = async (url, timeoutAt = Date.now() + 60_000) => {
  if (Date.now() >= timeoutAt) {
    throw new Error(`Timed out waiting for ${url}`);
  }

  try {
    const response = await fetch(url, { method: "GET" });
    if (response.ok) {
      return;
    }
  } catch {
    // Keep waiting for Vite to boot.
  }

  await delay(1000);
  return waitForUrl(url, timeoutAt);
};

const site = spawn("pnpm", ["dev"], {
  env: {
    ...process.env,
    ELECTRON_START_URL: "http://localhost:3001/upscaler",
  },
  stdio: "inherit",
});

try {
  await waitForUrl("http://localhost:3001");
  const electron = spawn("pnpm", ["exec", "electron", "."], {
    env: {
      ...process.env,
      ELECTRON_START_URL: "http://localhost:3001/upscaler",
    },
    stdio: "inherit",
  });

  electron.on("exit", (code) => {
    site.kill("SIGTERM");
    process.exit(code ?? 0);
  });
} catch (error) {
  site.kill("SIGTERM");
  throw error;
}
