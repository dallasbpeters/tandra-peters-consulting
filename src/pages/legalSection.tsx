import type { CSSProperties } from "react";
import { theme } from "../theme";

const pStyle: CSSProperties = {
  marginBottom: "1rem",
};

const h2Style: CSSProperties = {
  fontFamily: theme.fonts.headline,
  fontWeight: 700,
  fontSize: "0.75rem",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  marginTop: "2rem",
  marginBottom: "0.75rem",
  color: theme.colors.evergladeMuted,
};

export const legalSection = (
  key: string,
  heading: string,
  paragraphs: string[],
) => (
  <section key={key} aria-labelledby={`legal-${key}`}>
    <h2 id={`legal-${key}`} style={h2Style}>
      {heading}
    </h2>
    {paragraphs.map((text, i) => (
      <p key={i} style={pStyle}>
        {text}
      </p>
    ))}
  </section>
);
