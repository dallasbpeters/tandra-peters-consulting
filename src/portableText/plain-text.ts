import { toPlainText } from "@portabletext/toolkit";
import type { PortableTextBlock } from "@portabletext/types";
import { stegaClean } from "@sanity/client/stega";

import { coercePortableTextInput } from "./value.js";

const INVISIBLE_TEXT_RE = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/gu;

const cleanPlainText = (value: string): string =>
  stegaClean(value).replace(INVISIBLE_TEXT_RE, "");

/** Flatten Portable Text or pass through plain strings (share URLs, JSON-LD, etc.). */
export const plainTextFromRich = (
  value: PortableTextBlock[] | string | undefined | null | unknown
): string => {
  if (value === null) {
    return "";
  }
  const coerced = coercePortableTextInput(value);
  if (typeof coerced === "string") {
    return cleanPlainText(coerced);
  }
  if (coerced && coerced.length > 0) {
    return cleanPlainText(toPlainText(coerced));
  }
  return "";
};
