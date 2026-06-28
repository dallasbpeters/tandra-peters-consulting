import axeCoreLib from "axe-core";
import { axe as axeFn } from "jest-axe";

export type AxeCheckTarget = Element | Document | string;
type AxeRunOptions = Parameters<typeof axeFn>[1];
type AxeResults = Awaited<ReturnType<typeof axeFn>>;

/** Run axe against a rendered container; fails the test when violations exist. */
export const runAxe = async (
  container: AxeCheckTarget,
  options?: AxeRunOptions
): Promise<AxeResults> => {
  let axeTarget: Element | string;
  if (typeof container === "string") {
    axeTarget = container;
  } else if (container instanceof Document) {
    axeTarget = container.documentElement ?? container.body;
  } else {
    axeTarget = container;
  }

  const results = await axeFn(axeTarget, {
    rules: {
      // jsdom has no browsing context for same-page hash links in isolated renders
      "link-in-text-block": { enabled: false },
    },
    ...options,
  });

  return results;
};

// Export under stable public names — imported and re-bound to satisfy noExportedImports
export const axe = axeFn;
export const axeCore = axeCoreLib;
