/**
 * Shared email content types. Used by the React Email template, the Sanity
 * reader, the Vercel render/send endpoints, and the in-app composer.
 */

export interface PortableTextSpan {
  _key?: string;
  _type: "span";
  marks?: string[];
  text?: string;
}

export interface PortableTextMarkDef {
  _key?: string;
  _type?: string;
  href?: string;
}

export interface PortableTextBlock {
  _key?: string;
  _type: "block";
  children?: PortableTextSpan[];
  level?: number;
  listItem?: "bullet" | "number";
  markDefs?: PortableTextMarkDef[];
  style?: string;
}

export interface EmailSignature {
  company?: string;
  email?: string;
  headshotUrl?: string;
  jobTitle?: string;
  logoUrl?: string;
  name?: string;
  phone?: string;
  tagline?: string;
  website?: string;
}

export interface ClientEmailContent {
  body?: PortableTextBlock[];
  closing?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  greeting?: string;
  previewText?: string;
  signature?: EmailSignature | null;
  subject?: string;
}

/** Absolute (or preview-relative) asset URLs used when content omits its own. */
export interface EmailAssets {
  headerLogoUrl: string;
  signatureHeadshotFallback?: string;
  signatureLogoFallback?: string;
}

/** A recipient resolved from the CRM (Attio People). */
export interface EmailRecipient {
  email: string;
  id: string;
  name: string;
}

/** A website contact-form submission, emailed to Tandra as a new lead. */
export interface ContactLeadSubmission {
  email: string;
  fullName: string;
  message: string;
  phoneNumber?: string;
  propertyAddress?: string;
  /** Human-readable service label (falls back to the raw value when unknown). */
  serviceLabel?: string;
  /** ISO timestamp of submission; defaults to now when omitted. */
  submittedAt?: string;
}

/** A completed roof-cost estimate from the /estimate wizard. */
export interface EstimateSubmission {
  /** The visitor's answers, in order. */
  answers: { prompt: string; answer: string }[];
  email: string;
  fullName: string;
  highEstimate: number;
  /** Numeric bounds (for the record / future logic). */
  lowEstimate: number;
  /** Pre-formatted range, e.g. "$8,500 – $11,500". */
  rangeDisplay: string;
  /** Home size used in the calc, when known. */
  squareFootage?: number;
  /** ISO timestamp of submission; defaults to now when omitted. */
  submittedAt?: string;
}
