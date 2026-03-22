import React from "react";
import { ElfsightWidget } from "react-elfsight-widget";
import { theme } from "../theme";

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

const widgetId = normalizeElfsightWidgetId(
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
export const Testimonials = () => {
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
          style={{
            maxWidth: "80rem",
            marginLeft: "auto",
            marginRight: "auto",
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
      ) : (
        <p
          style={{
            color: theme.colors.evergladeMuted,
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
          <code style={{ color: theme.colors.paper }}>VITE_ELFSIGHT_WIDGET_ID</code> in{" "}
          <code style={{ color: theme.colors.paper }}>.env.local</code> and restart the dev server.
        </p>
      )}
    </div>
  );
};

/** @deprecated Use `Testimonials`; kept so existing imports keep working. */
export const WallyReviews = Testimonials;
