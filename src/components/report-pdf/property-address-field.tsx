import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import { MapPin, RefreshDouble } from "iconoir-react";
import { useCallback, useState } from "react";

import { appendDictation } from "../../hooks/use-dictation";
import { PromptInputButton } from "../ai-elements/prompt-input";
import { DictationButton } from "./dictation-button";
import { waValue } from "./wa-value";

interface PropertyAddressFieldProps {
  /** Google ID token forwarded to the auth-gated dictation route. */
  idToken: string;
  onChange: (value: string) => void;
  value: string;
}

interface NearbySuggestion {
  id: string;
  label: string;
}

interface MapboxFeature {
  id?: string;
  properties?: {
    full_address?: string;
    mapbox_id?: string;
    name?: string;
    place_formatted?: string;
  };
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";
const ICON_SIZE = 16;
const REVERSE_GEOCODE_URL = "https://api.mapbox.com/search/geocode/v6/reverse";

/** Drops the trailing ", United States" Mapbox appends to US addresses. */
const cleanAddress = (value: string): string =>
  value.replace(/,\s*United States$/i, "").trim();

const featureToSuggestion = (
  feature: MapboxFeature
): NearbySuggestion | null => {
  const props = feature.properties ?? {};
  const label = cleanAddress(
    props.full_address || props.place_formatted || props.name || ""
  );
  if (!label) {
    return null;
  }
  return { id: props.mapbox_id || feature.id || label, label };
};

const geolocationMessage = (error: GeolocationPositionError): string => {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location access was blocked. Allow location to find nearby addresses.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your location isn't available right now.";
  }
  return "Finding your location timed out. Try again.";
};

/**
 * Property-address input with dictation plus a "near me" picker: it reverse-
 * geocodes the device's current location (Mapbox) into a short list of nearby
 * addresses Tandra can tap to fill the field on-site.
 */
export const PropertyAddressField = ({
  idToken,
  onChange,
  value,
}: PropertyAddressFieldProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<NearbySuggestion[]>([]);

  const reverseGeocode = useCallback(async (coords: GeolocationCoordinates) => {
    try {
      const url = new URL(REVERSE_GEOCODE_URL);
      url.searchParams.set("longitude", String(coords.longitude));
      url.searchParams.set("latitude", String(coords.latitude));
      url.searchParams.set("types", "address");
      url.searchParams.set("limit", "5");
      url.searchParams.set("access_token", MAPBOX_TOKEN);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Address lookup failed.");
      }
      const data = (await response.json()) as { features?: MapboxFeature[] };
      const items = (data.features ?? [])
        .map(featureToSuggestion)
        .filter((item): item is NearbySuggestion => item !== null);
      if (items.length === 0) {
        setError("No addresses found near you.");
      }
      setSuggestions(items);
    } catch (lookupError) {
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "Address lookup failed."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const findNearby = useCallback(() => {
    setOpen(true);
    setError(null);
    setSuggestions([]);
    if (!MAPBOX_TOKEN) {
      setError("Address lookup isn't configured.");
      return;
    }
    if (!navigator.geolocation) {
      setError("Geolocation isn't supported on this device.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void reverseGeocode(position.coords);
      },
      (geoError) => {
        setLoading(false);
        setError(geolocationMessage(geoError));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 }
    );
  }, [reverseGeocode]);

  const handleSelect = (label: string) => {
    onChange(label);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="report-field report-field--address">
      <WaInput
        label="Property address"
        onInput={(event) => onChange(waValue(event))}
        placeholder="Street, city, state"
        value={value}
      >
        {MAPBOX_TOKEN ? (
          <PromptInputButton
            aria-label="Find addresses near me"
            disabled={loading}
            onClick={findNearby}
            slot="end"
            title="Find addresses near me"
            variant="ghost"
          >
            {loading ? (
              <RefreshDouble
                className="report-dictation-spin"
                height={ICON_SIZE}
                width={ICON_SIZE}
              />
            ) : (
              <MapPin height={ICON_SIZE} width={ICON_SIZE} />
            )}
          </PromptInputButton>
        ) : null}
        <DictationButton
          idToken={idToken}
          label="property address"
          onTranscript={(text) => onChange(appendDictation(value, text))}
          slot="end"
        />
      </WaInput>

      {open ? (
        <div className="report-nearby">
          {loading ? (
            <p className="report-nearby-status">Finding addresses near you…</p>
          ) : null}
          {error ? (
            <p className="report-nearby-status report-nearby-status--error">
              {error}
            </p>
          ) : null}
          {suggestions.length > 0 ? (
            <ul className="report-nearby-list">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    className="report-nearby-item"
                    onClick={() => handleSelect(suggestion.label)}
                    type="button"
                  >
                    <MapPin aria-hidden height={ICON_SIZE} width={ICON_SIZE} />
                    <span>{suggestion.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {loading ? null : (
            <button
              className="report-nearby-dismiss"
              onClick={() => setOpen(false)}
              type="button"
            >
              Dismiss
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};
