import { Heading, Link, Text } from "@react-email/components";
import { Fragment } from "react";
import { jsx, jsxs } from "react/jsx-runtime";

const paragraph = {
  fontSize: "15px",
  lineHeight: "26px",
  color: "#1a2b22",
  margin: "0 0 16px",
};

const heading = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#0f1f18",
  margin: "24px 0 8px",
};

const quote = {
  ...paragraph,
  borderLeft: "3px solid #d8dedb",
  paddingLeft: "14px",
  fontStyle: "italic",
  color: "#46554d",
};

const renderSpan = (span, block) => {
  let node = span.text ?? "";
  const marks = span.marks ?? [];

  for (const mark of marks) {
    if (mark === "strong") {
      node = jsx("strong", { children: node });
    } else if (mark === "em") {
      node = jsx("em", { children: node });
    } else {
      const def = block.markDefs?.find((m) => m._key === mark);
      if (def?.href) {
        node = jsx(Link, {
          href: def.href,
          style: { color: "#3a7d5d", textDecoration: "underline" },
          children: node,
        });
      }
    }
  }

  return jsx(Fragment, { children: node }, span._key);
};

const renderChildren = (block) =>
  (block.children ?? []).map((span) => renderSpan(span, block));

export const PortableTextToEmail = ({ blocks }) => {
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
      let marker = "\u2022";
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

      return jsxs(
        Text,
        {
          style: { ...paragraph, margin: "0 0 8px", paddingLeft: "12px" },
          children: [marker, " ", children],
        },
        block._key
      );
    }

    orderedIndex = 0;

    if (block.style === "h2" || block.style === "h3") {
      return jsx(
        Heading,
        { as: block.style, style: heading, children },
        block._key
      );
    }

    if (block.style === "blockquote") {
      return jsx(Text, { style: quote, children }, block._key);
    }

    return jsx(Text, { style: paragraph, children }, block._key);
  });
};
