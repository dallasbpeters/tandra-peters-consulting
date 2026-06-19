import css from "@eslint/css";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginReact from "eslint-plugin-react";
import { reactRefresh } from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

const jsFiles = ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"];
const reactRefreshViteConfig = reactRefresh.configs.vite();

export default defineConfig([
  {
    ignores: [
      ".config/**",
      ".remotion/**",
      "dist/**",
      "node_modules/**",
      "public/**",
      ".agents/**",
      ".claude/**",
      "studio-tandra-peters/**",
    ],
  },
  {
    ...reactRefreshViteConfig,
    files: ["src/**/*.{jsx,tsx}"],
    ignores: ["src/components/ai-elements/**"],
  },
  {
    files: jsFiles,
    ignores: [".config/**", "public/**"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs}"],
    languageOptions: { globals: globals.node },
  },
  tseslint.configs.recommended,
  { files: jsFiles, ...pluginReact.configs.flat.recommended },
  { files: jsFiles, ...pluginReact.configs.flat["jsx-runtime"] },
  { files: jsFiles, settings: { react: { version: "19" } } },
  {
    files: jsFiles,
    plugins: { "jsx-a11y": jsxA11y },
    rules: {
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "jsx-a11y/alt-text": [
        "warn",
        {
          elements: ["img"],
        },
      ],
      "jsx-a11y/aria-props": "warn",
      "jsx-a11y/aria-proptypes": "warn",
      "jsx-a11y/aria-unsupported-elements": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
      "jsx-a11y/role-supports-aria-props": "warn",
      "react/no-unknown-property": "off",
    },
  },
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: ["css/recommended"],
    rules: {
      // Theme tokens live in theme-variables.css (imported at build time, not inlined per file).
      "css/no-invalid-properties": ["error", { allowUnknownVariables: true }],
    },
  },
]);
