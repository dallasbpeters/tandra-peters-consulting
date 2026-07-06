const PROJECT_ID = "7irm699i";
const DATASET = "production";
const API_VERSION = "2026-05-29";

const CLIENT_EMAIL_QUERY = `*[_type == "clientEmail"][0]{
  subject,
  previewText,
  greeting,
  body,
  ctaLabel,
  ctaUrl,
  closing,
  "signature": signature->{
    name,
    jobTitle,
    company,
    tagline,
    phone,
    email,
    website,
    "headshotUrl": headshot.asset->url,
    "logoUrl": companyLogo.asset->url
  }
}`;

export const sanityImage = (url, params = {}) => {
  if (!url) {
    return;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "cdn.sanity.io") {
      return url;
    }
    parsed.searchParams.set("fm", "png");
    parsed.searchParams.set("q", "80");
    if (params.w) {
      parsed.searchParams.set("w", String(params.w));
    }
    if (params.h) {
      parsed.searchParams.set("h", String(params.h));
    }
    if (params.fit) {
      parsed.searchParams.set("fit", params.fit);
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

export const fetchClientEmail = async () => {
  const url = `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(
    CLIENT_EMAIL_QUERY
  )}`;

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      return null;
    }
    const json = await res.json();
    return json.result ?? null;
  } catch {
    return null;
  }
};
