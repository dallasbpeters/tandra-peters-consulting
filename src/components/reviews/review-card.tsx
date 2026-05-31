import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import type { Review } from "./reviews-data";

import { theme } from "../../theme";
import { ReviewModal } from "./review-modal";
import { Avatar, GoogleMark, Stars } from "./review-parts";
import { formatReviewDate } from "./review-utils";

const styles = {
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "20rem",
    flexShrink: 0,
    borderRadius: "16px",
    border: `1px solid ${theme.colors.paperDark}`,
    backgroundColor: theme.colors.white,
    padding: "1.5rem",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  meta: {
    minWidth: 0,
    flex: 1,
  },
  name: {
    fontFamily: theme.fonts.headline,
    fontSize: "0.875rem",
    fontWeight: 700,
    color: theme.colors.everglade,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    margin: 0,
  },
  date: {
    fontFamily: theme.fonts.headline,
    fontSize: "0.75rem",
    color: theme.colors.legalMuted,
    margin: "0.125rem 0 0",
  },
  footer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginTop: "auto",
  },
} satisfies Record<string, CSSProperties>;

export const ReviewCard = ({ review }: { review: Review }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showViewMore, setShowViewMore] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) {
      return;
    }

    const checkTruncation = () => {
      setShowViewMore(element.scrollHeight > element.clientHeight + 1);
    };

    checkTruncation();

    const observer = new ResizeObserver(checkTruncation);
    observer.observe(element);
    return () => observer.disconnect();
  }, [review.text]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <article style={styles.card}>
        <header style={styles.header}>
          <Avatar review={review} />
          <div style={styles.meta}>
            <p style={styles.name}>{review.name}</p>
            <p style={styles.date}>{formatReviewDate(review.date)}</p>
          </div>
          <GoogleMark />
        </header>

        <Stars rating={review.rating} />

        <div style={styles.footer}>
          <p ref={textRef} className="review-card__text">
            {review.text}
          </p>
          {showViewMore ? (
            <button
              type="button"
              className="review-card__view-more"
              aria-haspopup="dialog"
              onClick={handleOpenModal}
            >
              View more
            </button>
          ) : null}
        </div>
      </article>

      <ReviewModal review={review} isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  );
};
