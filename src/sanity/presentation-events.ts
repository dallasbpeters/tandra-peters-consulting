export const SANITY_PRESENTATION_REFRESH_EVENT = "sanity:presentation-refresh";

export const dispatchSanityPresentationRefresh = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(SANITY_PRESENTATION_REFRESH_EVENT));
};
