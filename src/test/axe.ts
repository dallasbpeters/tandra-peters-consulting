import axeCore from "axe-core";
import { axe, type AxeResults, type RunOptions } from "jest-axe";

export type AxeCheckTarget = Element | Document | string;

/** Run axe against a rendered container; fails the test when violations exist. */
export const runAxe = async (
  container: AxeCheckTarget,
  options?: RunOptions,
): Promise<AxeResults> => {
  const results = await axe(container, {
    rules: {
      // jsdom has no browsing context for same-page hash links in isolated renders
      "link-in-text-block": { enabled: false },
    },
    ...options,
  });

  return results;
};

export { axe, axeCore };
