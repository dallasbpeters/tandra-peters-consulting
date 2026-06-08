import { mix, theme } from "../theme";

/** Hover/focus for links inside article body portable text only (`RichText` with `className="article-rich-text"`). */
export const ArticleRichTextLinkStyles = () => (
  <style>{`
    @property --color-start {
  syntax: '<color>';
  inherits: false;
  initial-value: #703afa;
}

@property --color-end {
  syntax: '<color>';
  inherits: false;
  initial-value: #feb47b;
}
    .article-rich-text a {
    text-decoration: none !important;
    position: relative;
    background-color: transparent !important;
    border-radius: ${theme.radius.small};
    background-color: ${theme.palette.blue["100"]} !important;
    contain: paint;
    transition: background-color 0.3s ease;
    }
    .article-rich-text a::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(to right, var(--color-start), var(--color-end));
    transition:  --color-start 0.5s ease, --color-end 0.5s ease;
    z-index: 2;

    }
    .article-rich-text a:hover {
    background-color: ${mix(theme.palette.blue["100"], 50)} !important;
      &::after {
      --color-start: ${theme.palette.coral["600"]};
    --color-end: ${theme.palette.blue["200"]};
      }
    }
    .article-rich-text a:focus-visible {
      outline: 2px solid ${theme.palette.blue["600"]};
      outline-offset: 2px;
      border-radius: ${theme.radius.small};
    }
  `}</style>
);
