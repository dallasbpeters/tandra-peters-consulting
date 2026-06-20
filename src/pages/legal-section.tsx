import type { CSSProperties } from "react";

import { theme } from "../theme";

const pStyle: CSSProperties = {
  marginBottom: theme.spacing.lg,
};

const h2Style: CSSProperties = {
  color: theme.colors.evergladeMuted,
  fontFamily: theme.fonts.headline,
  fontSize: "0.75rem",
  fontWeight: 800,
  letterSpacing: "0.2em",
  marginBottom: theme.spacing.md,
  marginTop: theme.spacing.xxxxl,
  textTransform: "uppercase",
};

export const legalSection = (
  key: string,
  heading: string,
  paragraphs: string[]
) => (
  <section aria-labelledby={`legal-${key}`} key={key}>
    <h2 id={`legal-${key}`} style={h2Style}>
      {heading}
    </h2>
    {paragraphs.map((text) => (
      <p key={text.slice(0, 40)} style={pStyle}>
        {text}
      </p>
    ))}
  </section>
);
