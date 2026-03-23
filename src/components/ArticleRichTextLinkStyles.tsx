import { theme } from "../theme";

/** Hover/focus for links inside article body portable text only (`RichText` with `className="article-rich-text"`). */
export const ArticleRichTextLinkStyles = () => (
  <style>{`
    .article-rich-text a {
      transition: background-color 0.2s ease, color 0.2s ease;
    }
    .article-rich-text a:hover {
      background-color: ${theme.palette.blue["200"]} !important;
      color: ${theme.palette.blue["800"]} !important;
    }
    .article-rich-text a:focus-visible {
      outline: 2px solid ${theme.palette.blue["600"]};
      outline-offset: 2px;
      border-radius: 2px;
    }
  `}</style>
);
