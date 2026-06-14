import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./src/remotion/index.ts");

// The 3D RoofScene composition renders a three.js / WebGL scene (the roof.glb).
// Headless Chromium needs a software OpenGL backend or the canvas renders blank
// (the roof never appears) — this only affects CLI renders (`remotion render` /
// `remotion still`). The Vercel Sandbox render path sets `chromiumOptions.gl`
// directly in api/render-tandra-intro.ts since remotion.config.ts does not apply
// to renderMediaOnVercel.
Config.setChromiumOpenGlRenderer("angle");
