import { MapPin, Xmark } from "iconoir-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { formatNumber } from "../../lib/desk-format";
import type { DirectMailAddressListResponse } from "../../lib/desk-types";

const addressListNote = (
  status: DirectMailAddressListResponse["status"]
): string => {
  if (status === "missing-key") {
    return "Homeowner address matching isn't connected yet. Add the RentCast key to pull real addresses.";
  }
  if (status === "unavailable") {
    return "These areas don't have map coordinates to match addresses against. Draw a smaller zone over mapped neighborhoods.";
  }
  return "No single-family owner addresses matched these areas with the current filters.";
};

export const AddressPreviewModal = ({
  error,
  loading,
  onClose,
  result,
  selectedCount,
}: {
  error: string | null;
  loading: boolean;
  onClose: () => void;
  result: DirectMailAddressListResponse | null;
  selectedCount: number;
}) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const addresses = result?.addresses ?? [];
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? addresses.filter((address) => address.toLowerCase().includes(trimmed))
    : addresses;

  const bodyContent = () => {
    if (loading) {
      return (
        <p className="desk-address-modal__state">
          Matching every address inside your selection…
        </p>
      );
    }
    if (error) {
      return <p className="desk-address-modal__state is-error">{error}</p>;
    }
    if (!result || result.totalAddresses === 0) {
      return (
        <p className="desk-address-modal__state">
          {result
            ? addressListNote(result.status)
            : "Preparing the address list…"}
        </p>
      );
    }
    return (
      <>
        <label className="desk-address-modal__search">
          <MapPin aria-hidden height={16} width={16} />
          <input
            aria-label="Filter addresses"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by street, city, or ZIP…"
            type="search"
            value={query}
          />
        </label>
        <ol className="desk-address-modal__list">
          {filtered.map((address) => (
            <li key={address}>{address}</li>
          ))}
        </ol>
        {filtered.length === 0 ? (
          <p className="desk-address-modal__state">
            No addresses match &ldquo;{query}&rdquo;.
          </p>
        ) : null}
      </>
    );
  };

  return createPortal(
    <div
      aria-label="Addresses in this selection"
      aria-modal="true"
      className="desk-address-modal"
      role="dialog"
    >
      <button
        aria-label="Close address preview"
        className="desk-address-modal__backdrop"
        onClick={onClose}
        type="button"
      />
      <div className="desk-address-modal__panel">
        <header className="desk-address-modal__head">
          <div>
            <span>Addresses in this selection</span>
            <strong>
              {result && result.totalAddresses > 0
                ? `${formatNumber(result.totalAddresses)} homes across ${formatNumber(selectedCount)} ${selectedCount === 1 ? "area" : "areas"}`
                : `${formatNumber(selectedCount)} ${selectedCount === 1 ? "area" : "areas"} selected`}
            </strong>
          </div>
          <button
            aria-label="Close"
            className="desk-address-modal__close"
            onClick={onClose}
            type="button"
          >
            <Xmark aria-hidden height={20} width={20} />
          </button>
        </header>
        {result?.capped ? (
          <p className="desk-address-modal__cap">
            Showing the first {formatNumber(result.addresses.length)} of{" "}
            {formatNumber(result.totalAddresses)} matched addresses. Draw a
            tighter zone to verify the full list.
          </p>
        ) : null}
        <div className="desk-address-modal__body">{bodyContent()}</div>
      </div>
    </div>,
    document.body
  );
};
