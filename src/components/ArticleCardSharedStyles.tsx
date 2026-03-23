/** Shared grid + card hover rules for home teaser and /articles index. */
export const ArticleCardSharedStyles = () => (
  <style>{`
    @media (min-width: 768px) {
      .articles-teaser-md-row { flex-direction: row !important; }
      .articles-cards-grid {
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr)) !important;
      }
      .articles-cards-grid-item { grid-column: span 1 !important; }
    }
    .articles-teaser-card,
    .articles-cards-grid-item {
      opacity: 1 !important;
    }
    .articles-teaser-card:hover .articles-teaser-card-overlay { opacity: 0.82 !important; }
    .articles-teaser-card:hover .articles-teaser-card-bg img {
      transform: scale(1.08) !important;
    }
    .articles-teaser-card .articles-teaser-card-bg img {
      transform: scale(1);
      transform-origin: center center;
      transition: transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .articles-teaser-card:hover {
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1) !important;
    }
    @media (prefers-reduced-motion: reduce) {
      .articles-teaser-card:hover .articles-teaser-card-bg img { transform: none !important; }
      .articles-teaser-card .articles-teaser-card-bg img { transition: none; }
    }
  `}</style>
);
