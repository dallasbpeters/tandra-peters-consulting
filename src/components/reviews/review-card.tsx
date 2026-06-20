import type { CSSProperties } from "react";
import { useLayoutEffect, useRef, useState } from "react";

import { theme } from "../../theme";
import { ReviewModal } from "./review-modal";
import { Avatar, GoogleMark, Stars } from "./review-parts";
import { formatReviewDate } from "./review-utils";
import type { Review } from "./reviews-data";

const styles = {
  card: {
    backgroundColor: theme.colors.white,
    border: `1px solid ${theme.colors.paperDark}`,
    borderRadius: theme.radius.large,
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    gap: theme.spacing.lg,
    padding: theme.spacing.xxl,
    width: "20rem",
  },
  date: {
    color: theme.colors.legalMuted,
    fontFamily: theme.fonts.headline,
    fontSize: "0.75rem",
    margin: `${theme.spacing.hairline} 0 0`,
  },
  footer: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.md,
    marginTop: "auto",
  },
  header: {
    alignItems: "center",
    display: "flex",
    gap: theme.spacing.md,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: theme.colors.everglade,
    fontFamily: theme.fonts.headline,
    fontSize: "0.875rem",
    fontWeight: 700,
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
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
  }, []);

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
          <p className="review-card__text" ref={textRef}>
            {review.text}
          </p>
          {showViewMore ? (
            <button
              aria-haspopup="dialog"
              className="review-card__view-more"
              onClick={handleOpenModal}
              type="button"
            >
              View more
            </button>
          ) : null}
        </div>
      </article>

      <ReviewModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        review={review}
      />
    </>
  );
};
