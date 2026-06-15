import sanityLint from "@sanity-labs/eslint-plugin";
import studio from "@sanity/eslint-config-studio";

export default [...studio, ...sanityLint.configs.recommended];
