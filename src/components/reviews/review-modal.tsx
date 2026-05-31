import { Xmark } from "iconoir-react";
import { useEffect, useId, useRef, type MouseEvent } from "react";
import { createPortal } from "react-dom";

import type { Review } from "./reviews-data";

import { theme } from "../../theme";
import { Avatar, GoogleMark, Stars } from "./review-parts";
import { formatReviewDate } from "./review-utils";

type ReviewModalProps = {
  review: Review;
  isOpen: boolean;
  onClose: () => void;
};

export const ReviewModal = ({ review, isOpen, onClose }: ReviewModalProps) => {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const handleBackdropClick = () => {
    onClose();
  };

  const handleDialogClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return createPortal(
    <div className="review-modal__backdrop" role="presentation" onClick={handleBackdropClick}>
      <div
        className="review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={handleDialogClick}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="review-modal__close"
          aria-label="Close review"
          onClick={onClose}
        >
          <Xmark width={20} height={20} strokeWidth={2} />
        </button>

        <div className="review-modal__body">
          <header className="review-modal__header">
            <Avatar review={review} size={52} />
            <div className="review-modal__meta">
              <h2 id={titleId} className="review-modal__name">
                {review.name}
              </h2>
              <p className="review-modal__date">{formatReviewDate(review.date)}</p>
            </div>
            <GoogleMark size={24} />
          </header>

          <Stars rating={review.rating} size={18} />

          <p className="review-modal__text">{review.text}</p>

          <p className="review-modal__source">
            Review from{" "}
            <span style={{ color: theme.colors.everglade, fontWeight: 700 }}>Google</span>
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
};
