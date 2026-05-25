import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";

const jsFiles = ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"];

export default defineConfig([
  {
    ignores: [
      ".config/**",
      "dist/**",
      "node_modules/**",
      "public/**",
      ".agents/**",
      ".claude/**",
      "studio-tandra-peters/**",
    ],
  },
  { files: jsFiles, ignores: [".config/**", "public/**"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
  tseslint.configs.recommended,
  { files: jsFiles, ...pluginReact.configs.flat.recommended },
  { files: jsFiles, ...pluginReact.configs.flat['jsx-runtime'] },
  { files: jsFiles, settings: { react: { version: "19" } } },
  {
    files: jsFiles,
    rules: {
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": ["error", {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },
  { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"] },
]);
