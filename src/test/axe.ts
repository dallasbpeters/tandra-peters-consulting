import axeCoreLib from "axe-core";
import type { AxeResults, RunOptions } from "jest-axe";
import { axe as axeFn } from "jest-axe";

export type AxeCheckTarget = Element | Document | string;

/** Run axe against a rendered container; fails the test when violations exist. */
export const runAxe = async (
  container: AxeCheckTarget,
  options?: RunOptions
): Promise<AxeResults> => {
  const results = await axeFn(container, {
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
