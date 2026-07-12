import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaTextarea from "@awesome.me/webawesome/dist/react/textarea/index.js";
import { MediaImage, NavArrowLeft, NavArrowRight, Xmark } from "iconoir-react";
import { useCallback, useEffect, useState } from "react";

import {
  useStreetView,
  useStreetViewImage,
} from "../../../hooks/use-street-view";
import { waFieldValue } from "../../../lib/desk-format";
import type { AuthHeader } from "../../../lib/desk-types";
import {
  MAX_WALK_NOTE_LENGTH,
  roofAgeYears,
  WALK_STATUS_ORDER,
  walkStatusLabels,
} from "../../../lib/desk-walk";
import type { WalkHome, WalkStatus } from "../../../lib/desk-walk";

interface HomeDetailSheetProps {
  authHeader: AuthHeader;
  fallbackHomeAge: number | null;
  hasNext: boolean;
  hasPrev: boolean;
  home: WalkHome;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSave: (
    homeKey: string,
    change: { followUpDate?: string; notes?: string; status: WalkStatus }
  ) => void;
  position: string;
}

// Browser-usable Maps Embed key. MUST be HTTP-referrer-restricted and scoped to
// the Maps Embed API (see .env.example). A server key can't drive an interactive
// panorama, so this one is intentionally client-side — availability is still
// gated server-side via the metadata proxy before we ever mount the iframe.
const EMBED_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY?.trim() ?? "";

const embedStreetViewSrc = (lat: number, lng: number): string => {
  const params = new URLSearchParams({
    fov: "90",
    heading: "0",
    key: EMBED_KEY,
    location: `${lat},${lng}`,
    pitch: "0",
  });
  return `https://www.google.com/maps/embed/v1/streetview?${params.toString()}`;
};

/**
 * Street View "verify the house" preview. Reserves a 16:9 box (no layout shift)
 * and only shows imagery once the server-side metadata gate confirms a panorama
 * exists — otherwise a labelled placeholder, never an empty/broken frame.
 *
 * Two render paths, both gated by the same server-side key:
 *   - If a browser Embed key (`VITE_GOOGLE_MAPS_EMBED_KEY`) is configured, an
 *     interactive (pannable / zoomable) panorama via the Maps Embed API iframe.
 *   - Otherwise a server-proxied Static Street View image — works with only the
 *     server key, so the feature no longer silently breaks when the client key
 *     is absent (the common case).
 *
 * Keyed by `homeKey` so it fully remounts (cleans up) when the stepper moves.
 */
const StreetViewPreview = ({
  address,
  authHeader,
  homeKey,
  lat,
  lng,
}: {
  address: string;
  authHeader: AuthHeader;
  homeKey: string;
  lat: number | null;
  lng: number | null;
}) => {
  const hasCoords = typeof lat === "number" && typeof lng === "number";
  const canEmbed = Boolean(EMBED_KEY) && hasCoords;
  const status = useStreetView({
    address,
    authHeader,
    enabled: hasCoords,
    lat,
    lng,
  });
  const ready = status === "ready" && hasCoords;
  const imageSrc = useStreetViewImage({
    address,
    authHeader,
    enabled: ready && !canEmbed,
    lat,
    lng,
  });

  const isLoading = status === "loading" || (ready && !(canEmbed || imageSrc));

  const renderContent = () => {
    if (ready && canEmbed && lat !== null && lng !== null) {
      return (
        <iframe
          allowFullScreen
          className="desk-walk-streetview__frame"
          loading="lazy"
          src={embedStreetViewSrc(lat, lng)}
          title={`Interactive Street View of ${address}`}
        />
      );
    }
    if (ready && !canEmbed && imageSrc) {
      return (
        <img
          alt={`Street View of ${address}`}
          className="desk-walk-streetview__frame"
          loading="lazy"
          src={imageSrc}
        />
      );
    }
    return (
      <div className="desk-walk-streetview__fallback">
        <MediaImage aria-hidden height={22} width={22} />
        <span>
          {isLoading ? "Loading street view…" : "No street view available"}
        </span>
      </div>
    );
  };

  return (
    <div className="desk-walk-streetview" data-status={status} key={homeKey}>
      {renderContent()}
    </div>
  );
};

const attributeText = (home: WalkHome, age: number | null): string[] => {
  const rows: string[] = [];
  if (age !== null) {
    rows.push(
      home.yearBuilt
        ? `${age} yr roof · built ${home.yearBuilt}`
        : `${age} yr roof`
    );
  }
  if (typeof home.squareFootage === "number") {
    rows.push(`${home.squareFootage.toLocaleString()} sq ft`);
  }
  if (home.propertyType) {
    rows.push(home.propertyType);
  }
  if (home.ownerOccupied !== null) {
    rows.push(home.ownerOccupied ? "Owner-occupied" : "Likely rental");
  }
  return rows;
};

// A "date" input wants YYYY-MM-DD; a stored follow-up may be a full ISO string.
const toDateInput = (value: string | undefined): string =>
  value ? value.slice(0, 10) : "";

/**
 * Per-home detail as a bottom sheet (mobile) / side panel (desktop). Status is
 * a large one-tap chip grid; notes save on blur; a follow-up date shows only
 * for "come back". Prev/Next steps through homes without closing.
 */
export const HomeDetailSheet = ({
  authHeader,
  fallbackHomeAge,
  hasNext,
  hasPrev,
  home,
  onClose,
  onNext,
  onPrev,
  onSave,
  position,
}: HomeDetailSheetProps) => {
  const [notes, setNotes] = useState(home.notes ?? "");

  // Re-sync the editable fields whenever the stepper moves to another home.
  useEffect(() => {
    setNotes(home.notes ?? "");
  }, [home.homeKey, home.notes]);

  const age = roofAgeYears(home, fallbackHomeAge);
  const attributes = attributeText(home, age);

  const handleStatus = useCallback(
    (status: WalkStatus) => {
      onSave(home.homeKey, {
        followUpDate: home.followUpDate,
        notes,
        status,
      });
    },
    [home.followUpDate, home.homeKey, notes, onSave]
  );

  const handleNotesBlur = useCallback(() => {
    if ((home.notes ?? "") === notes) {
      return;
    }
    onSave(home.homeKey, {
      followUpDate: home.followUpDate,
      notes,
      status: home.status,
    });
  }, [home.followUpDate, home.homeKey, home.notes, home.status, notes, onSave]);

  const handleFollowUp = useCallback(
    (value: string) => {
      onSave(home.homeKey, {
        followUpDate: value || undefined,
        notes,
        status: home.status,
      });
    },
    [home.homeKey, home.status, notes, onSave]
  );

  return (
    <div className="desk-walk-sheet-scrim">
      <button
        aria-label="Close home detail"
        className="desk-walk-sheet-scrim__backdrop"
        onClick={onClose}
        type="button"
      />
      <section
        aria-label={`Home detail for ${home.addressLine1}`}
        className="desk-walk-sheet"
      >
        <span aria-hidden className="desk-walk-sheet__grip" />
        <header className="desk-walk-sheet__head">
          <div>
            <strong>{home.addressLine1}</strong>
            <span>
              {home.city}
              {home.state ? `, ${home.state}` : ""}
              {home.zip ? ` ${home.zip}` : ""}
            </span>
          </div>
          <button
            aria-label="Close"
            className="desk-walk-icon-button"
            onClick={onClose}
            type="button"
          >
            <Xmark aria-hidden height={22} width={22} />
          </button>
        </header>

        <StreetViewPreview
          address={home.address || home.addressLine1}
          authHeader={authHeader}
          homeKey={home.homeKey}
          lat={home.latitude}
          lng={home.longitude}
        />

        {attributes.length > 0 ? (
          <ul className="desk-walk-sheet__attrs">
            {attributes.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        ) : null}

        <div className="desk-walk-sheet__section">
          <span className="desk-walk-sheet__label">Status</span>
          <div className="desk-walk-chip-grid">
            {WALK_STATUS_ORDER.map((status) => (
              <button
                aria-pressed={home.status === status}
                className={
                  home.status === status
                    ? `desk-walk-chip desk-walk-chip--${status} desk-walk-chip--active`
                    : `desk-walk-chip desk-walk-chip--${status}`
                }
                key={status}
                onClick={() => handleStatus(status)}
                type="button"
              >
                {walkStatusLabels[status]}
              </button>
            ))}
          </div>
        </div>

        {home.status === "come-back" ? (
          <div className="desk-walk-sheet__section">
            <span className="desk-walk-sheet__label">Come back on</span>
            <WaInput
              onChange={(event) => handleFollowUp(waFieldValue(event))}
              type="date"
              value={toDateInput(home.followUpDate)}
            />
          </div>
        ) : null}

        <div className="desk-walk-sheet__section">
          <span className="desk-walk-sheet__label">Notes</span>
          <WaTextarea
            maxlength={MAX_WALK_NOTE_LENGTH}
            onBlur={handleNotesBlur}
            onInput={(event) =>
              setNotes(waFieldValue(event).slice(0, MAX_WALK_NOTE_LENGTH))
            }
            placeholder="What happened at the door…"
            resize="none"
            rows={3}
            value={notes}
          />
        </div>

        <footer className="desk-walk-sheet__nav">
          <button
            className="desk-walk-step-button"
            disabled={!hasPrev}
            onClick={onPrev}
            type="button"
          >
            <NavArrowLeft aria-hidden height={18} width={18} />
            Prev
          </button>
          <span className="desk-walk-step-count">{position}</span>
          <button
            className="desk-walk-step-button"
            disabled={!hasNext}
            onClick={onNext}
            type="button"
          >
            Next
            <NavArrowRight aria-hidden height={18} width={18} />
          </button>
        </footer>
      </section>
    </div>
  );
};
