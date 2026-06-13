/**
 * Shared email content types. Used by the React Email template, the Sanity
 * reader, the Vercel render/send endpoints, and the in-app composer.
 */

export type PortableTextSpan = {
  _type: "span";
  _key?: string;
  text?: string;
  marks?: string[];
};

export type PortableTextMarkDef = {
  _type?: string;
  _key?: string;
  href?: string;
};

export type PortableTextBlock = {
  _type: "block";
  _key?: string;
  style?: string;
  listItem?: "bullet" | "number";
  level?: number;
  children?: PortableTextSpan[];
  markDefs?: PortableTextMarkDef[];
};

export type EmailSignature = {
  name?: string;
  jobTitle?: string;
  company?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  website?: string;
  headshotUrl?: string;
  logoUrl?: string;
};

export type ClientEmailContent = {
  subject?: string;
  previewText?: string;
  greeting?: string;
  body?: PortableTextBlock[];
  ctaLabel?: string;
  ctaUrl?: string;
  closing?: string;
  signature?: EmailSignature | null;
};

/** Absolute (or preview-relative) asset URLs used when content omits its own. */
export type EmailAssets = {
  headerLogoUrl: string;
  signatureLogoFallback?: string;
  signatureHeadshotFallback?: string;
};

/** A recipient resolved from the CRM (Attio People). */
export type EmailRecipient = {
  id: string;
  name: string;
  email: string;
};

/** A website contact-form submission, emailed to Tandra as a new lead. */
export type ContactLeadSubmission = {
  fullName: string;
  email: string;
  phoneNumber?: string;
  /** Human-readable service label (falls back to the raw value when unknown). */
  serviceLabel?: string;
  message: string;
  propertyAddress?: string;
  /** ISO timestamp of submission; defaults to now when omitted. */
  submittedAt?: string;
};
