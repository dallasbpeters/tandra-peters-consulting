import React from "react";
import { ElfsightWidget } from "react-elfsight-widget";
import { layoutClass } from "../styles/layoutClasses";
import { theme } from "../theme";
import type { TestimonialsProps } from "../types";
import { RichText } from "../portableText/RichText";
import { hasPortableTextContent } from "../portableText/value";

/**
 * Elfsight install code looks like:
 * `<div class="elfsight-app-942cf3c9-7b21-4e39-92a1-8c5a2aef07b5" data-elfsight-app-lazy></div>`
 * Put only the UUID in env (with or without `elfsight-app-` — we normalize).
 */
const normalizeElfsightWidgetId = (raw: string) => {
  let id = raw.trim();
  if (!id) return "";
  id = id.replace(/^elfsight-app-/i, "");
  id = id.replace(/^["']|["']$/g, "");
  return id;
};

const envWidgetId = normalizeElfsightWidgetId(
  import.meta.env.VITE_ELFSIGHT_WIDGET_ID ?? "",
);

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * Google reviews via [Elfsight](https://elfsight.com/google-reviews-widget/).
 * Set `VITE_ELFSIGHT_WIDGET_ID` after you publish the widget in your Elfsight dashboard.
 */
export const Testimonials = ({
  elfsightWidgetId: cmsWidgetId,
  emptyStateNote,
}: TestimonialsProps) => {
  const widgetId = normalizeElfsightWidgetId(cmsWidgetId ?? "") || envWidgetId;
  const useCmsEmptyState = hasPortableTextContent(emptyStateNote);

  return (
    <div
      id="testimonials"
      style={{
        width: "100%",
        minHeight: "min(36rem, 75vh)",
        paddingBlock: "2.5rem",
        paddingInline: "1.5rem",
        backgroundColor: theme.colors.everglade,
        position: "relative",
        overflow: "visible",
      }}
    >
      <h2 style={srOnly}>Client reviews and testimonials</h2>
      {widgetId ? (
        <div
          className={layoutClass.containerWide}
          style={{
            width: "100%",
            minHeight: "min(28rem, 60vh)",
          }}
        >
          {/*
            Match Elfsight embed: class `elfsight-app-<uuid>` + `data-elfsight-app-lazy` (lazy={true} → default mode).
            Reserve min-height so the slot isn’t 0px before the iframe mounts.
          */}
          <ElfsightWidget
            widgetId={widgetId}
            lazy
            style={{
              display: "block",
              width: "100%",
              minHeight: "min(26rem, 55vh)",
            }}
          />
        </div>
      ) : useCmsEmptyState ? (
        <div
          style={{
            color: theme.colors.textOnBrand,
            textAlign: "center",
            maxWidth: "36rem",
            margin: "3rem auto",
            lineHeight: 1.6,
            fontSize: "0.95rem",
          }}
        >
          <RichText
            value={emptyStateNote}
            paragraphStyle={{
              color: "inherit",
              textAlign: "inherit",
              lineHeight: "inherit",
              fontSize: "inherit",
            }}
            linkStyle={{ color: theme.colors.accentLight }}
          />
        </div>
      ) : (
        <p
          style={{
            color: theme.colors.textOnBrand,
            textAlign: "center",
            maxWidth: "36rem",
            margin: "3rem auto",
            lineHeight: 1.6,
            fontSize: "0.95rem",
          }}
        >
          To show Google reviews here, create a{" "}
          <a
            href="https://elfsight.com/google-reviews-widget/"
            style={{ color: theme.colors.accentLight }}
            target="_blank"
            rel="noopener noreferrer"
          >
            free Elfsight Google Reviews widget
          </a>
          , then add your widget ID to{" "}
          <code style={{ color: theme.colors.textOnBrand }}>
            VITE_ELFSIGHT_WIDGET_ID
          </code>{" "}
          in <code style={{ color: theme.colors.textOnBrand }}>.env.local</code>{" "}
          and restart the dev server.
        </p>
      )}
    </div>
  );
};

/** @deprecated Use `Testimonials`; kept so existing imports keep working. */
export const WallyReviews = Testimonials;
