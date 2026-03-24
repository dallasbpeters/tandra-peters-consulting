import { toPlainText } from "@portabletext/toolkit";
import type { PortableTextBlock } from "@portabletext/types";
import { coercePortableTextInput } from "./value.js";

/** Flatten Portable Text or pass through plain strings (share URLs, JSON-LD, etc.). */
export const plainTextFromRich = (
  value: PortableTextBlock[] | string | undefined | null | unknown,
): string => {
  if (value == null) {
    return "";
  }
  const coerced = coercePortableTextInput(value);
  if (typeof coerced === "string") {
    return coerced;
  }
  if (coerced && coerced.length > 0) {
    return toPlainText(coerced);
  }
  return "";
};
