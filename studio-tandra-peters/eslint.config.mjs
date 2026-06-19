import studio from "@sanity/eslint-config-studio";
import sanityLint from "@sanity-labs/eslint-plugin";

export default [...studio, ...sanityLint.configs.recommended];
