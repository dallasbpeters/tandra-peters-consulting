/**
 * Domain types for the Branded Photo PDF tool. Client-side, in-session only
 * (v1 does not persist photos or PDFs — see spec "Deferred to Phase 2").
 */

/** A user-defined, cost-free details table attached to a photo (FR-006a). */
export interface DetailsTable {
  columns: string[];
  /** Each row has one cell per column (index-aligned with `columns`). */
  rows: string[][];
}

export interface PhotoItem {
  caption: string;
  id: string;
  /** Downscaled, orientation-baked JPEG used for preview + PDF embedding. */
  previewUrl: string;
  /** JPEG blob produced by the image pipeline. */
  processedImage: Blob;
  /** Ordering within the report (ascending). */
  order: number;
  /** Original file name (for error messages / debugging). */
  sourceName: string;
  /** Optional roof-section grouping (FR-006b). */
  sectionId: string | null;
  /** Optional configurable table; blank tables are omitted from output. */
  table: DetailsTable | null;
}

export interface SectionHeading {
  id: string;
  order: number;
  title: string;
}

export interface Report {
  /** Optional cover hero image (Sanity CDN URL from the media library). */
  coverImageUrl: string | null;
  date: string;
  overallNote: string;
  photos: PhotoItem[];
  propertyAddress: string;
  sections: SectionHeading[];
  title: string;
}

/** Resolved branding (Sanity-sourced, falling back to `tokens.ts`). */
export interface BrandProfile {
  address: string;
  colors: {
    accent: string;
    primary: string;
    text: string;
  };
  email: string;
  footerText: string;
  logoUrl: string | null;
  phone: string;
  website: string;
}

// ── Layout model (derived; consumed identically by preview + PDF) ──

export interface CoverBlock {
  /** Brand wordmark shown as the eyebrow (e.g. "Birdcreek Roofing"). */
  brandName: string;
  /** Optional full-bleed hero image (Sanity CDN URL); switches the cover variant. */
  coverImageUrl: string | null;
  date: string;
  /** Byline shown bottom-right (e.g. "Tandra Peters"). */
  inspectorName: string;
  kind: "cover";
  logoUrl: string | null;
  /** Fixed report label, e.g. "Roof Inspection Report". */
  reportTitle: string;
  /** Short descriptor shown bottom-left. */
  tagline: string;
  /** User-entered report/property title (may be empty). */
  title: string;
}

export interface PhotoBlock {
  caption: string;
  imageUrl: string;
  kind: "photo";
  /** Roof-section name this photo belongs to, or null when ungrouped. */
  sectionTitle: string | null;
  table: DetailsTable | null;
}

export interface NoteBlock {
  kind: "note";
  text: string;
}

export interface ContactBlock {
  address: string;
  /** Brand wordmark shown in the running header. */
  brandName: string;
  email: string;
  /** Short prepared-by note in Tandra's voice. */
  intro: string;
  kind: "contact";
  phone: string;
  website: string;
}

export type LayoutBlock = ContactBlock | CoverBlock | NoteBlock | PhotoBlock;

export interface LayoutModel {
  /** Running header shown on body pages. */
  headerTitle: string;
  /** Footer text (brand). */
  footerText: string;
  blocks: LayoutBlock[];
}

// ── Pagination (one photo per page → HTML preview and PDF stay in lockstep) ──

export interface CoverPage {
  cover: CoverBlock;
  kind: "cover";
}

export interface NotePage {
  kind: "note";
  note: NoteBlock;
}

export interface PhotoPage {
  kind: "photo";
  photo: PhotoBlock;
  /** Set only on the first page of a section (band shown once). */
  sectionTitle: string | null;
}

export interface ContactPage {
  contact: ContactBlock;
  kind: "contact";
}

export type ReportPage = ContactPage | CoverPage | NotePage | PhotoPage;
