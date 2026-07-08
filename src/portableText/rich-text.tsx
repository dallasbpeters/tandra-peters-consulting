import { PortableText } from "@portabletext/react";
import type { PortableTextComponents } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import { useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";

import { theme } from "../theme";
import { coercePortableTextInput } from "./value";

/** Strip zero-width and invisible unicode chars that pollute SplitText word splitting. */
const cleanText = (text: string): string =>
  text.replaceAll(/[\u200B-\u200D\uFEFF\u2060-\u206F]/g, "");

const EXTERNAL_LINK_RE = /^https?:\/\//i;

/** Deep-clean all text spans in a PortableText block array. */
const sanitizeBlocks = (blocks: PortableTextBlock[]): PortableTextBlock[] =>
  blocks.map((block) => ({
    ...block,
    children: block.children.map((child) => ({
      ...child,
      text: cleanText(child.text ?? ""),
    })),
  }));

export type RichTextValue = PortableTextBlock[] | string | undefined | null;

export interface RichTextProps {
  blockquoteStyle?: CSSProperties;
  className?: string;
  /**
   * `heading`: block nodes render as `div`/`span` flows (no `<p>`), for use inside
   * `role="heading"` regions or tight card layouts.
   */
  flow?: "default" | "heading";
  heading2Style?: CSSProperties;
  heading3Style?: CSSProperties;
  linkStyle?: CSSProperties;
  listStyle?: CSSProperties;
  /** Applied to normal paragraphs (and string fallback). */
  paragraphStyle?: CSSProperties;
  value: RichTextValue;
}

export const RichText = ({
  value,
  flow = "default",
  paragraphStyle,
  heading2Style,
  heading3Style,
  blockquoteStyle,
  listStyle,
  linkStyle,
  className,
}: RichTextProps): ReactNode => {
  const isHeadingFlow = flow === "heading";

  const components = useMemo<PortableTextComponents>(
    () => ({
      block: {
        blockquote: ({ children }) =>
          isHeadingFlow ? (
            <div
              style={{
                borderLeft: "3px solid currentColor",
                margin: `0 0 ${theme.spacing.md}`,
                opacity: 0.9,
                paddingLeft: theme.spacing.lg,
                ...blockquoteStyle,
              }}
            >
              {children}
            </div>
          ) : (
            <blockquote
              style={{
                borderLeft: "3px solid currentColor",
                margin: `0 0 ${theme.spacing.lg}`,
                opacity: 0.9,
                paddingLeft: theme.spacing.lg,
                ...blockquoteStyle,
              }}
            >
              {children}
            </blockquote>
          ),
        h2: ({ children }) =>
          isHeadingFlow ? (
            <div
              style={{ margin: `0 0 ${theme.spacing.sm}`, ...heading2Style }}
            >
              {children}
            </div>
          ) : (
            <h2 style={{ margin: `0 0 ${theme.spacing.md}`, ...heading2Style }}>
              {children}
            </h2>
          ),
        h3: ({ children }) =>
          isHeadingFlow ? (
            <div
              style={{ margin: `0 0 ${theme.spacing.sm}`, ...heading3Style }}
            >
              {children}
            </div>
          ) : (
            <h3 style={{ margin: `0 0 ${theme.spacing.sm}`, ...heading3Style }}>
              {children}
            </h3>
          ),
        normal: ({ children }) =>
          isHeadingFlow ? (
            <div
              style={{ margin: `0 0 ${theme.spacing.sm}`, ...paragraphStyle }}
            >
              {children}
            </div>
          ) : (
            <p style={{ margin: `0 0 ${theme.spacing.lg}`, ...paragraphStyle }}>
              {children}
            </p>
          ),
      },
      list: {
        bullet: ({ children }) => (
          <ul
            style={{
              margin: `0 0 ${theme.spacing.lg}`,
              paddingLeft: theme.spacing.xl,
              ...listStyle,
            }}
          >
            {children}
          </ul>
        ),
        number: ({ children }) => (
          <ol
            style={{
              margin: `0 0 ${theme.spacing.lg}`,
              paddingLeft: theme.spacing.xl,
              ...listStyle,
            }}
          >
            {children}
          </ol>
        ),
      },
      listItem: {
        bullet: ({ children }) => (
          <li style={{ marginBottom: theme.spacing.sm }}>{children}</li>
        ),
        number: ({ children }) => (
          <li style={{ marginBottom: theme.spacing.sm }}>{children}</li>
        ),
      },
      marks: {
        em: ({ children }) => <em>{cleanText(String(children))}</em>,
        link: ({ value: linkValue, children }) => {
          const href = linkValue?.href;
          if (!href) {
            return <>{cleanText(String(children))}</>;
          }
          const isExternal = EXTERNAL_LINK_RE.test(href);
          return (
            <a
              href={href}
              style={{
                color: "inherit",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
                ...linkStyle,
              }}
              {...(isExternal
                ? { rel: "noopener noreferrer", target: "_blank" }
                : {})}
            >
              {cleanText(String(children))}
            </a>
          );
        },
        strong: ({ children }) => (
          <strong>{cleanText(String(children))}</strong>
        ),
        /** Catch-all for plain text spans (no marks) — also cleans zero-width chars. */
        text: ({ children }) => cleanText(String(children)),
      },
    }),
    [
      isHeadingFlow,
      paragraphStyle,
      heading2Style,
      heading3Style,
      blockquoteStyle,
      listStyle,
      linkStyle,
    ]
  );

  if (value === null) {
    return null;
  }

  const normalized = coercePortableTextInput(value);
  if (normalized === undefined) {
    return null;
  }

  if (typeof normalized === "string") {
    const stringMargin = isHeadingFlow ? "0 0 0.5rem" : "0 0 1rem";
    const StringTag = isHeadingFlow ? "div" : "p";
    return (
      <StringTag
        className={className}
        style={{ margin: stringMargin, ...paragraphStyle }}
      >
        {cleanText(normalized)}
      </StringTag>
    );
  }

  if (normalized.length === 0) {
    return null;
  }

  const sanitized = sanitizeBlocks(normalized);

  return (
    <div className={className} style={{ overflowWrap: "anywhere" }}>
      <PortableText components={components} value={sanitized} />
    </div>
  );
};
