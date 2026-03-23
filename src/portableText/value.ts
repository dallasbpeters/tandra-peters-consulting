import type { PortableTextBlock } from "@portabletext/types";

const isBlockObject = (v: unknown): v is PortableTextBlock =>
  typeof v === "object" &&
  v !== null &&
  (v as { _type?: string })._type === "block";

export const isPortableTextBlocks = (v: unknown): v is PortableTextBlock[] =>
  Array.isArray(v) &&
  v.length > 0 &&
  typeof v[0] === "object" &&
  v[0] !== null &&
  (v[0] as { _type?: string })._type === "block";

/**
 * Accept strings, block arrays, a single block object, or arrays that only contain
 * some valid blocks (Studio/API edge cases after schema changes).
 */
export const coercePortableTextInput = (
  value: unknown,
): PortableTextBlock[] | string | undefined => {
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 ? t : undefined;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return undefined;
    }
    if (isPortableTextBlocks(value)) {
      return value;
    }
    const blocks = value.filter(isBlockObject);
    if (blocks.length > 0) {
      return blocks;
    }
    return undefined;
  }
  if (isBlockObject(value)) {
    return [value];
  }
  return undefined;
};

/** True when the value will render non-empty rich text. */
export const hasPortableTextContent = (value: unknown): boolean =>
  coercePortableTextInput(value) !== undefined;

const legacyParagraphBlock = (_key: string, text: string): PortableTextBlock => ({
  _type: "block",
  _key,
  style: "normal",
  markDefs: [],
  children: [
    {
      _type: "span",
      _key: `${_key}-s`,
      marks: [],
      text,
    },
  ],
});

/**
 * Normalize CMS values: plain string, Portable Text, or legacy `about.paragraphs[]`.
 */
export const asRichTextValue = (
  value: unknown,
  legacyParagraphs?: unknown,
): PortableTextBlock[] | string | undefined => {
  const direct = coercePortableTextInput(value);
  if (direct) {
    return direct;
  }
  if (Array.isArray(legacyParagraphs) && legacyParagraphs.length > 0) {
    const strings = legacyParagraphs.filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0,
    );
    if (strings.length > 0) {
      return strings.map((text, i) => legacyParagraphBlock(`legacy-${i}`, text));
    }
  }
  return undefined;
};

/** String or Portable Text blocks (no legacy `paragraphs` merge). */
export const asOptionalRichText = (value: unknown): PortableTextBlock[] | string | undefined =>
  coercePortableTextInput(value);
