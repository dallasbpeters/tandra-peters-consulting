import { useMemo, type CSSProperties, type ReactNode } from "react";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import { coercePortableTextInput } from "./value";

export type RichTextValue = PortableTextBlock[] | string | undefined | null;

export type RichTextProps = {
  value: RichTextValue;
  /**
   * `heading`: block nodes render as `div`/`span` flows (no `<p>`), for use inside
   * `role="heading"` regions or tight card layouts.
   */
  flow?: "default" | "heading";
  /** Applied to normal paragraphs (and string fallback). */
  paragraphStyle?: CSSProperties;
  heading2Style?: CSSProperties;
  heading3Style?: CSSProperties;
  blockquoteStyle?: CSSProperties;
  listStyle?: CSSProperties;
  linkStyle?: CSSProperties;
  className?: string;
};

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
        normal: ({ children }) =>
          isHeadingFlow ? (
            <div style={{ margin: "0 0 0.5rem", ...paragraphStyle }}>
              {children}
            </div>
          ) : (
            <p style={{ margin: "0 0 1rem", ...paragraphStyle }}>{children}</p>
          ),
        h2: ({ children }) =>
          isHeadingFlow ? (
            <div style={{ margin: "0 0 0.5rem", ...heading2Style }}>
              {children}
            </div>
          ) : (
            <h2 style={{ margin: "0 0 0.75rem", ...heading2Style }}>
              {children}
            </h2>
          ),
        h3: ({ children }) =>
          isHeadingFlow ? (
            <div style={{ margin: "0 0 0.5rem", ...heading3Style }}>
              {children}
            </div>
          ) : (
            <h3 style={{ margin: "0 0 0.5rem", ...heading3Style }}>
              {children}
            </h3>
          ),
        blockquote: ({ children }) =>
          isHeadingFlow ? (
            <div
              style={{
                margin: "0 0 0.75rem",
                paddingLeft: "1rem",
                borderLeft: "3px solid currentColor",
                opacity: 0.9,
                ...blockquoteStyle,
              }}
            >
              {children}
            </div>
          ) : (
            <blockquote
              style={{
                margin: "0 0 1rem",
                paddingLeft: "1rem",
                borderLeft: "3px solid currentColor",
                opacity: 0.9,
                ...blockquoteStyle,
              }}
            >
              {children}
            </blockquote>
          ),
      },
      list: {
        bullet: ({ children }) => (
          <ul
            style={{
              margin: "0 0 1rem",
              paddingLeft: "1.25rem",
              ...listStyle,
            }}
          >
            {children}
          </ul>
        ),
        number: ({ children }) => (
          <ol
            style={{
              margin: "0 0 1rem",
              paddingLeft: "1.25rem",
              ...listStyle,
            }}
          >
            {children}
          </ol>
        ),
      },
      listItem: {
        bullet: ({ children }) => (
          <li style={{ marginBottom: "0.35rem" }}>{children}</li>
        ),
        number: ({ children }) => (
          <li style={{ marginBottom: "0.35rem" }}>{children}</li>
        ),
      },
      marks: {
        strong: ({ children }) => <strong>{children}</strong>,
        em: ({ children }) => <em>{children}</em>,
        link: ({ value: linkValue, children }) => {
          const href = linkValue?.href;
          if (!href) {
            return <>{children}</>;
          }
          const isExternal = /^https?:\/\//i.test(href);
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
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {children}
            </a>
          );
        },
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
    ],
  );

  if (value == null) {
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
        {normalized}
      </StringTag>
    );
  }

  if (normalized.length === 0) {
    return null;
  }

  return (
    <div className={className} style={{ overflowWrap: "anywhere" }}>
      <PortableText value={normalized} components={components} />
    </div>
  );
};
