import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(repoRoot, "dist");
const studioTempDir = path.join(repoRoot, ".studio-dist");
const studioDir = path.join(repoRoot, "studio-tandra-peters");

const run = (command, args, cwd = repoRoot) => {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
};

rmSync(distDir, { recursive: true, force: true });
rmSync(studioTempDir, { recursive: true, force: true });

run("pnpm", ["exec", "vite", "build"]);

if (!existsSync(path.join(studioDir, "node_modules", "styled-components"))) {
  run("pnpm", ["--dir", "studio-tandra-peters", "install", "--frozen-lockfile"]);
}

run("pnpm", ["--dir", "studio-tandra-peters", "exec", "sanity", "build", "../.studio-dist", "-y"]);

mkdirSync(path.join(distDir, "studio"), { recursive: true });

cpSync(path.join(studioTempDir, "index.html"), path.join(distDir, "studio", "index.html"));

if (existsSync(path.join(studioTempDir, "static"))) {
  cpSync(path.join(studioTempDir, "static"), path.join(distDir, "static"), { recursive: true });
}

if (existsSync(path.join(studioTempDir, "vendor"))) {
  cpSync(path.join(studioTempDir, "vendor"), path.join(distDir, "vendor"), { recursive: true });
}

rmSync(studioTempDir, { recursive: true, force: true });
