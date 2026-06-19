/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { Heading, Link, Text } from "@react-email/components";
import { type CSSProperties, Fragment, type ReactNode } from "react";

import type { PortableTextBlock, PortableTextSpan } from "./types.js";

const paragraph: CSSProperties = {
  fontSize: "15px",
  lineHeight: "26px",
  color: "#1a2b22",
  margin: "0 0 16px",
};

const heading: CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#0f1f18",
  margin: "24px 0 8px",
};

const quote: CSSProperties = {
  ...paragraph,
  borderLeft: "3px solid #d8dedb",
  paddingLeft: "14px",
  fontStyle: "italic",
  color: "#46554d",
};

const renderSpan = (
  span: PortableTextSpan,
  block: PortableTextBlock
): ReactNode => {
  let node: ReactNode = span.text ?? "";
  const marks = span.marks ?? [];

  for (const mark of marks) {
    if (mark === "strong") {
      node = <strong>{node}</strong>;
    } else if (mark === "em") {
      node = <em>{node}</em>;
    } else {
      const def = block.markDefs?.find((m) => m._key === mark);
      if (def?.href) {
        node = (
          <Link
            href={def.href}
            style={{ color: "#3a7d5d", textDecoration: "underline" }}
          >
            {node}
          </Link>
        );
      }
    }
  }

  return <Fragment key={span._key}>{node}</Fragment>;
};

const renderChildren = (block: PortableTextBlock): ReactNode =>
  (block.children ?? []).map((span) => renderSpan(span, block));

/** Render Portable Text blocks as email-safe React Email elements. */
export const PortableTextToEmail = ({
  blocks,
}: {
  blocks?: PortableTextBlock[];
}): ReactNode => {
  if (!blocks?.length) {
    return null;
  }

  let orderedIndex = 0;

  return blocks.map((block, i) => {
    if (block._type !== "block") {
      orderedIndex = 0;
      return null;
    }

    const children = renderChildren(block);

    if (block.listItem) {
      let marker = "•";
      if (block.listItem === "number") {
        const prev = blocks[i - 1];
        orderedIndex =
          prev && prev._type === "block" && prev.listItem === "number"
            ? orderedIndex + 1
            : 1;
        marker = `${orderedIndex}.`;
      } else {
        orderedIndex = 0;
      }
      return (
        <Text
          key={block._key}
          style={{ ...paragraph, margin: "0 0 8px", paddingLeft: "12px" }}
        >
          {marker} {children}
        </Text>
      );
    }

    orderedIndex = 0;

    if (block.style === "h2" || block.style === "h3") {
      return (
        <Heading as={block.style} key={block._key} style={heading}>
          {children}
        </Heading>
      );
    }

    if (block.style === "blockquote") {
      return (
        <Text key={block._key} style={quote}>
          {children}
        </Text>
      );
    }

    return (
      <Text key={block._key} style={paragraph}>
        {children}
      </Text>
    );
  });
};
