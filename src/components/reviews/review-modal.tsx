import { Xmark } from "iconoir-react";
import { type MouseEvent, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { theme } from "../../theme";
import { Avatar, GoogleMark, Stars } from "./review-parts";
import { formatReviewDate } from "./review-utils";
import type { Review } from "./reviews-data";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: Review;
}

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
    // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop — click/Escape outside to dismiss
    <div
      className="review-modal__backdrop"
      onClick={handleBackdropClick}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          handleBackdropClick();
        }
      }}
      role="presentation"
    >
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: stops click propagation to backdrop */}
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="review-modal"
        onClick={handleDialogClick}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="Close review"
          className="review-modal__close"
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <Xmark height={20} strokeWidth={2} width={20} />
        </button>

        <div className="review-modal__body">
          <header className="review-modal__header">
            <Avatar review={review} size={52} />
            <div className="review-modal__meta">
              <h2 className="review-modal__name" id={titleId}>
                {review.name}
              </h2>
              <p className="review-modal__date">
                {formatReviewDate(review.date)}
              </p>
            </div>
            <GoogleMark size={24} />
          </header>

          <Stars rating={review.rating} size={18} />

          <p className="review-modal__text">{review.text}</p>

          <p className="review-modal__source">
            Review from{" "}
            <span style={{ color: theme.colors.everglade, fontWeight: 700 }}>
              Google
            </span>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
