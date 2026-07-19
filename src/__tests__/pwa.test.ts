import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { useInstallableManifest } from "../components/report-pdf/use-installable-manifest";

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/report.webmanifest"), "utf-8")
) as {
  display: string;
  icons: { purpose: string; sizes: string; src: string; type: string }[];
  scope: string;
  start_url: string;
};

describe("report.webmanifest", () => {
  it("is scoped to /report and launches standalone", () => {
    expect(manifest.start_url).toBe("/report");
    expect(manifest.scope).toBe("/report");
    expect(manifest.display).toBe("standalone");
  });

  it("references PNG icons including a 512px maskable icon", () => {
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    expect(
      manifest.icons.every((icon) => icon.type === "image/png")
    ).toBeTruthy();
    expect(
      manifest.icons.some(
        (icon) => icon.sizes === "512x512" && icon.purpose === "maskable"
      )
    ).toBeTruthy();
  });
});

const Harness = () => {
  useInstallableManifest();
  return null;
};

describe(useInstallableManifest, () => {
  it("injects the manifest + iOS full-screen tags and cleans them up on unmount", () => {
    const { unmount } = render(createElement(Harness));

    expect(document.head.querySelector('link[rel="manifest"]')).not.toBeNull();
    expect(
      document.head.querySelector('meta[name="apple-mobile-web-app-capable"]')
    ).not.toBeNull();

    unmount();

    expect(document.head.querySelector('link[rel="manifest"]')).toBeNull();
    expect(
      document.head.querySelector('meta[name="apple-mobile-web-app-capable"]')
    ).toBeNull();
  });
});
