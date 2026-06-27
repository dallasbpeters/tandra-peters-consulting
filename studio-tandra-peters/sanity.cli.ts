import { defineCliConfig } from "sanity/cli";

const FAL_TOOL_OPTIMIZED_DEPENDENCIES = [
  "@awesome.me/webawesome/dist/react/button/index.js",
  "@awesome.me/webawesome/dist/react/checkbox/index.js",
  "@awesome.me/webawesome/dist/react/input/index.js",
  "@awesome.me/webawesome/dist/react/number-input/index.js",
  "@awesome.me/webawesome/dist/react/option/index.js",
  "@awesome.me/webawesome/dist/react/select/index.js",
  "@awesome.me/webawesome/dist/react/slider/index.js",
  "@awesome.me/webawesome/dist/react/textarea/index.js",
];

export default defineCliConfig({
  api: {
    projectId: "7irm699i",
    dataset: "production",
  },
  deployment: {
    appId: "on6anif3y43e3t03oiwrgp30",
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
  vite: (config) => ({
    ...config,
    optimizeDeps: {
      ...config.optimizeDeps,
      include: [
        ...(config.optimizeDeps?.include ?? []),
        ...FAL_TOOL_OPTIMIZED_DEPENDENCIES,
      ],
    },
  }),
});
