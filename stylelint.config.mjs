/** @type {import("stylelint").Config} */
export default {
  extends: ["stylelint-config-standard"],
  rules: {
    "at-rule-no-unknown": [true, { ignoreAtRules: ["theme"] }],
    "import-notation": null,
    "lightness-notation": null,
    "hue-degree-notation": null,
    // Allow BEM modifier (--) and element (__) syntax alongside plain kebab-case
    "selector-class-pattern": [
      "^[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$",
      {
        message: "Expected class selector to follow BEM (kebab-case with __ and -- allowed)",
      },
    ],
  },
};
