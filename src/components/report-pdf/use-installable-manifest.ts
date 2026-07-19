import { useEffect } from "react";

/**
 * Scope the installable-app metadata to the /report route only. We deliberately
 * do NOT register a service worker (the public marketing site, Sanity
 * Presentation, and the PostHog proxy must stay untouched) and we do NOT put a
 * manifest in the shared index.html (that would brand the whole site as the
 * report tool). Tags are injected on mount and removed on unmount so "Add to
 * Home Screen" only offers the Photo Report app while the tool is open.
 */
export const useInstallableManifest = (): void => {
  useEffect(() => {
    const nodes: HTMLElement[] = [];

    const addMeta = (name: string, content: string) => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", name);
      meta.setAttribute("content", content);
      document.head.append(meta);
      nodes.push(meta);
    };

    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = "/report.webmanifest";
    document.head.append(manifest);
    nodes.push(manifest);

    addMeta("apple-mobile-web-app-capable", "yes");
    addMeta("mobile-web-app-capable", "yes");
    addMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    addMeta("apple-mobile-web-app-title", "Photo Report");

    return () => {
      for (const node of nodes) {
        node.remove();
      }
    };
  }, []);
};
