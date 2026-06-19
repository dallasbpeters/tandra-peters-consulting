import type { CSSProperties } from "react";

import { theme } from "../theme";

const pStyle: CSSProperties = {
  marginBottom: theme.spacing.lg,
};

const h2Style: CSSProperties = {
  fontFamily: theme.fonts.headline,
  fontWeight: 800,
  fontSize: "0.75rem",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  marginTop: theme.spacing.xxxxl,
  marginBottom: theme.spacing.md,
  color: theme.colors.evergladeMuted,
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
