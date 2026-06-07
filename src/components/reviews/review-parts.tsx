import { useState, type CSSProperties } from "react";

import type { Review } from "./reviews-data";

import { theme } from "../../theme";

const STAR_FILLED = "#FBBC05";
const STAR_EMPTY = theme.palette.paper["300"];

const starStyles = {
  stars: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
  },
  star: {
    width: "16px",
    height: "16px",
  },
} satisfies Record<string, CSSProperties>;

export const Stars = ({ rating, size = 16 }: { rating: number; size?: number }) => (
  <div role="img" style={starStyles.stars} aria-label={`${rating} out of 5 stars`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <svg
        key={i}
        viewBox="0 0 24 24"
        style={{ ...starStyles.star, width: size, height: size }}
        fill={i < rating ? STAR_FILLED : STAR_EMPTY}
        aria-hidden="true"
      >
        <path d="M12 2l2.95 6.36 6.99.78-5.2 4.72 1.42 6.86L12 17.77l-6.16 3.95 1.42-6.86-5.2-4.72 6.99-.78L12 2z" />
      </svg>
    ))}
  </div>
);

const avatarStyles = {
  avatar: {
    width: "44px",
    height: "44px",
    borderRadius: "9999px",
    objectFit: "cover",
    flexShrink: 0,
    backgroundColor: theme.colors.paperDim,
  },
  avatarFallback: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    borderRadius: "9999px",
    flexShrink: 0,
    backgroundColor: theme.palette.everglade["100"],
    color: theme.colors.everglade,
    fontFamily: theme.fonts.headline,
    fontSize: "0.875rem",
    fontWeight: 700,
  },
} satisfies Record<string, CSSProperties>;

export const Avatar = ({ review, size = 44 }: { review: Review; size?: number }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = review.name.trim().charAt(0).toUpperCase() || "?";
  const dimension = `${size}px`;

  if (!review.avatar || imageFailed) {
    return (
      <div
        style={{
          ...avatarStyles.avatarFallback,
          width: dimension,
          height: dimension,
        }}
        aria-hidden="true"
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={review.avatar}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      style={{ ...avatarStyles.avatar, width: dimension, height: dimension }}
      onError={() => setImageFailed(true)}
    />
  );
};

export const GoogleMark = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" style={{ width: size, height: size, flexShrink: 0 }} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
    />
  </svg>
);
