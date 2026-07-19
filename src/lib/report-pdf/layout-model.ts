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
  const reportTitle = report.title.trim() || DEFAULT_REPORT_TITLE;
  const blocks: LayoutBlock[] = [];

  blocks.push({
    brandName: brand.footerText,
    coverImageUrl: report.coverImageUrl,
    date: report.date,
    inspectorName: COVER_INSPECTOR,
    kind: "cover",
    logoUrl: brand.logoUrl,
    reportTitle: DEFAULT_REPORT_TITLE,
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
    address: brand.address,
    brandName: brand.footerText,
    email: brand.email,
    intro: CONTACT_INTRO,
    kind: "contact",
    phone: brand.phone,
    website: brand.website,
  });

  return {
    blocks,
    footerText: brand.footerText,
    headerTitle: reportTitle,
  };
};

/**
 * Paginate the layout model into one page per photo (plus cover, optional note,
 * and contact). Both renderers consume this so the preview and PDF paginate
 * identically. A section band is emitted only on the first page of each section.
 */
export const buildPages = (model: LayoutModel): ReportPage[] => {
  const pages: ReportPage[] = [];
  let previousSectionTitle: string | null = null;

  for (const block of model.blocks) {
    switch (block.kind) {
      case "cover": {
        pages.push({ cover: block, kind: "cover" });
        break;
      }
      case "note": {
        pages.push({ kind: "note", note: block });
        break;
      }
      case "photo": {
        const isNewSection =
          block.sectionTitle !== null &&
          block.sectionTitle !== previousSectionTitle;
        pages.push({
          kind: "photo",
          photo: block,
          sectionTitle: isNewSection ? block.sectionTitle : null,
        });
        previousSectionTitle = block.sectionTitle;
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

  return pages;
};
