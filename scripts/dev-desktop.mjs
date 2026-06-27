import { spawn } from "node:child_process";

const waitForUrl = async (url) => {
  const timeoutAt = Date.now() + 60_000;
  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // Keep waiting for Vite to boot.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for ${url}`);
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
