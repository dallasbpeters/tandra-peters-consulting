import { REPORT_PHOTO } from "./tokens";
import type {
  BrandProfile,
  DetailsTable,
  LayoutBlock,
  LayoutModel,
  PhotoBlock,
  PhotoItem,
  Report,
  ReportPage,
} from "./types";

const DEFAULT_REPORT_TITLE = "Roof Inspection Report";
const COVER_TAGLINE = "A comprehensive roof inspection report";
const COVER_INSPECTOR = "Tandra Peters";
const CONTACT_INTRO =
  "I put this report together to walk you through what I found on your roof. If anything here raises a question, reach out any time — I'm always glad to talk it through.";
const CONTACT_PHONE = "512-968-3965";
const CONTACT_EMAIL = "tandra@birdcreekroofing.com";
const CONTACT_WEBSITE = "www.birdcreekroofing.com";
const CONTACT_ADDRESS = "2608 N. Main Street Suite B-313, Belton, TX 76513";

const byOrder = (a: { order: number }, b: { order: number }): number =>
  a.order - b.order;

/** A table is kept only if it has columns and any non-empty header or cell. */
const isTableMeaningful = (
  table: DetailsTable | null
): table is DetailsTable => {
  if (!(table && table.columns.length > 0)) {
    return false;
  }
  const hasHeader = table.columns.some((column) => column.trim().length > 0);
  const hasCell = table.rows.some((row) =>
    row.some((cell) => cell.trim().length > 0)
  );
  return hasHeader || hasCell;
};

/** Trim a kept table to its declared column count (drops trailing blank rows). */
const normalizeTable = (table: DetailsTable): DetailsTable => {
  const columnCount = table.columns.length;
  const rows = table.rows
    .map((row) => {
      const cells = Array.from({ length: columnCount }, (_, i) => row[i] ?? "");
      return cells;
    })
    .filter((row) => row.some((cell) => cell.trim().length > 0));
  return { columns: table.columns, rows };
};

const photoBlock = (
  photo: PhotoItem,
  sectionTitle: string | null
): PhotoBlock => ({
  caption: photo.caption.trim(),
  imageUrl: photo.previewUrl,
  kind: "photo",
  sectionTitle,
  table: isTableMeaningful(photo.table) ? normalizeTable(photo.table) : null,
  takenAt: photo.takenAt,
});

/**
 * Build the page layout (cover → grouped/ungrouped photos → optional note →
 * contact) consumed identically by the HTML preview and the PDF renderer.
 *
 * - Empty sections are pruned (FR-006b).
 * - Blank/empty tables are omitted (FR-006a).
 * - No cost column and no recommendations page (FR-016).
 */
export const buildLayoutModel = (
  report: Report,
  brand: BrandProfile
): LayoutModel => {
  const coverHeading = report.coverHeading.trim();
  // Running header stays meaningful even when the cover heading is left blank.
  const headerTitle =
    coverHeading || report.title.trim() || DEFAULT_REPORT_TITLE;
  const blocks: LayoutBlock[] = [];

  blocks.push({
    brandName: brand.footerText,
    coverImageUrl: report.coverImageUrl,
    date: report.date,
    inspectorName: COVER_INSPECTOR,
    kind: "cover",
    logoUrl: brand.logoUrl,
    reportTitle: coverHeading,
    tagline: COVER_TAGLINE,
    title: report.title.trim(),
  });

  const usedPhotoIds = new Set<string>();
  const sortedSections = [...report.sections].toSorted(byOrder);

  for (const section of sortedSections) {
    const sectionPhotos = report.photos
      .filter((photo) => photo.sectionId === section.id)
      .toSorted(byOrder);
    if (sectionPhotos.length === 0) {
      continue;
    }
    const title = section.title.trim() || "Section";
    for (const photo of sectionPhotos) {
      blocks.push(photoBlock(photo, title));
      usedPhotoIds.add(photo.id);
    }
  }

  const ungrouped = report.photos
    .filter((photo) => !usedPhotoIds.has(photo.id))
    .toSorted(byOrder);
  for (const photo of ungrouped) {
    blocks.push(photoBlock(photo, null));
  }

  if (report.overallNote.trim()) {
    blocks.push({ kind: "note", text: report.overallNote.trim() });
  }

  blocks.push({
    address: report.contactAddress.trim() || CONTACT_ADDRESS,
    brandName: brand.footerText,
    email: report.contactEmail.trim() || CONTACT_EMAIL,
    intro: report.contactIntro.trim() || CONTACT_INTRO,
    kind: "contact",
    phone: report.contactPhone.trim() || CONTACT_PHONE,
    website: report.contactWebsite.trim() || CONTACT_WEBSITE,
  });

  return {
    blocks,
    footerText: brand.footerText,
    headerTitle,
    jobNumber: (report.jobNumber ?? "").trim(),
    propertyAddress: (report.propertyAddress ?? "").trim(),
  };
};

/**
 * Paginate the layout model (cover, packed photo pages, optional note, and
 * contact). Both renderers consume this so the preview and PDF paginate
 * identically. Photos pack four-up in a 2×2 grid unless one carries a details
 * table (full-width solo page). A new section always starts a fresh page. A
 * section band is emitted only on the first page of each section.
 */
export const buildPages = (model: LayoutModel): ReportPage[] => {
  const pages: ReportPage[] = [];
  const emittedSections = new Set<string>();
  let bucket: PhotoBlock[] = [];

  const flushPhotos = (): void => {
    if (bucket.length === 0) {
      return;
    }
    const groupSection = bucket[0].sectionTitle;
    let band: string | null = null;
    if (groupSection !== null && !emittedSections.has(groupSection)) {
      band = groupSection;
      emittedSections.add(groupSection);
    }
    pages.push({ kind: "photo", photos: bucket, sectionTitle: band });
    bucket = [];
  };

  for (const block of model.blocks) {
    if (block.kind === "photo") {
      const hasTable = block.table !== null;
      const sectionChanged =
        bucket.length > 0 && bucket[0].sectionTitle !== block.sectionTitle;
      const previousHadTable = bucket.at(-1)?.table != null;
      if (
        sectionChanged ||
        previousHadTable ||
        bucket.length >= REPORT_PHOTO.perPage ||
        (hasTable && bucket.length > 0)
      ) {
        flushPhotos();
      }
      bucket.push(block);
      if (hasTable) {
        flushPhotos();
      }
      continue;
    }

    // Any non-photo block ends the current photo run before it is emitted.
    flushPhotos();
    switch (block.kind) {
      case "cover": {
        pages.push({ cover: block, kind: "cover" });
        break;
      }
      case "note": {
        pages.push({ kind: "note", note: block });
        break;
      }
      case "contact": {
        pages.push({ contact: block, kind: "contact" });
        break;
      }
      default: {
        break;
      }
    }
  }

  flushPhotos();
  return pages;
};
