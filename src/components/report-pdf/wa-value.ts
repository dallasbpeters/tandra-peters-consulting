import type { SyntheticEvent } from "react";

/** Read the string value from a WebAwesome (or native) input change event. */
export const waValue = (event: SyntheticEvent): string => {
  const { value } = event.target as { value?: string | null };
  return value ?? "";
};
