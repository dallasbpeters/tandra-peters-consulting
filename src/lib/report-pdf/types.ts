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

/**
 * Editable, vector hand-drawn annotations layered over a photo. Coordinates are
 * in the natural (unscaled) pixel space of `AnnotationScene.width/height` so the
 * scene composites cleanly onto the full-resolution image regardless of the
 * on-screen editing size. Stored on the photo so edits survive save/reload.
 */
export interface PenAnnotation {
  color: string;
  /** `pen` is opaque; `highlighter` is translucent and drawn with `multiply`. */
  kind: "highlighter" | "pen";
  /** Flat `[x0, y0, x1, y1, …]` path points in natural px. */
  points: number[];
  width: number;
}

export interface CircleAnnotation {
  color: string;
  /** Bounding-box height in natural px (may be negative before normalizing). */
  h: number;
  kind: "circle";
  w: number;
  width: number;
  x: number;
  y: number;
}

export interface TextAnnotation {
  color: string;
  kind: "text";
  /** Font size in natural px. */
  size: number;
  text: string;
  x: number;
  y: number;
}

export type Annotation = CircleAnnotation | PenAnnotation | TextAnnotation;

export interface AnnotationScene {
  /** Natural image height the coordinates are relative to. */
  height: number;
  items: Annotation[];
  /** Natural image width the coordinates are relative to. */
  width: number;
}

export interface PhotoItem {
  /** Editable hand-drawn overlay; null when the photo has no annotations. */
  annotations: AnnotationScene | null;
  caption: string;
  id: string;
  /**
   * Display/PDF image: the annotated composite when `annotations` is set,
   * otherwise the plain processed photo. Re-derived from `processedImage`.
   */
  previewUrl: string;
  /** Original downscaled, orientation-baked JPEG (never annotated). */
  processedImage: Blob;
  /** Ordering within the report (ascending). */
  order: number;
  /** Original file name (for error messages / debugging). */
  sourceName: string;
  /** Optional roof-section grouping (FR-006b). */
  sectionId: string | null;
  /** Optional configurable table; blank tables are omitted from output. */
  table: DetailsTable | null;
  /**
   * Capture date from EXIF (`YYYY-MM-DD` local), or null when the file had no
   * DateTimeOriginal / CreateDate metadata.
   */
  takenAt: string | null;
}

export interface SectionHeading {
  id: string;
  order: number;
  title: string;
}

export interface Report {
  /** Contact-page overrides; blank fields fall back to the brand defaults. */
  contactAddress: string;
  contactEmail: string;
  contactIntro: string;
  contactPhone: string;
  contactWebsite: string;
  /** Editable, optional cover heading (blank hides the headline). */
  coverHeading: string;
  /** Optional cover hero image (Sanity CDN URL from the media library). */
  coverImageUrl: string | null;
  date: string;
  overallNote: string;
  photos: PhotoItem[];
  propertyAddress: string;
  sections: SectionHeading[];
  title: string;
  /** Optional job / work-order number shown under the running footer title. */
  jobNumber: string;
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
  /** Capture date ISO (`YYYY-MM-DD`), or null when unavailable. */
  takenAt: string | null;
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
  /** Job number shown under the footer title (left). */
  jobNumber: string;
  /** Property address shown under the page numbers (right). */
  propertyAddress: string;
  blocks: LayoutBlock[];
}

// ── Pagination (shared by the HTML preview and PDF so they stay in lockstep) ──

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
  /**
   * Up to four photos in a 2×2 grid. A photo with a details table always sits
   * alone at full width; otherwise photos pack four-up across pages.
   */
  photos: PhotoBlock[];
  /** Set only on the first page of a section (band shown once). */
  sectionTitle: string | null;
}

export interface ContactPage {
  contact: ContactBlock;
  kind: "contact";
}

export type ReportPage = ContactPage | CoverPage | NotePage | PhotoPage;
