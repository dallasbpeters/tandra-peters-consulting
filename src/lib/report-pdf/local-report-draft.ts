import { hydrateReport } from "./report-library";
import type { ReportSnapshot } from "./report-library";
import type { Report } from "./types";

const LOCAL_REPORT_DRAFT_KEY = "tandra:report:current-draft";

const canUseLocalStorage = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.localStorage?.getItem === "function";

const BYTE_CHUNK_SIZE = 8192;

const blobToDataUrl = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunks: string[] = [];
  for (let index = 0; index < bytes.length; index += BYTE_CHUNK_SIZE) {
    chunks.push(
      String.fromCodePoint(...bytes.subarray(index, index + BYTE_CHUNK_SIZE))
    );
  }
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(
    chunks.join("")
  )}`;
};

const createDraftSnapshot = async (
  report: Report
): Promise<ReportSnapshot> => ({
  contactAddress: report.contactAddress,
  contactEmail: report.contactEmail,
  contactIntro: report.contactIntro,
  contactPhone: report.contactPhone,
  contactWebsite: report.contactWebsite,
  coverHeading: report.coverHeading,
  coverImageUrl: report.coverImageUrl,
  date: report.date,
  jobNumber: report.jobNumber,
  overallNote: report.overallNote,
  photos: await Promise.all(
    report.photos.map(async (photo) => ({
      annotations: photo.annotations,
      caption: photo.caption,
      id: photo.id,
      order: photo.order,
      previewUrl: await blobToDataUrl(photo.processedImage),
      sectionId: photo.sectionId,
      sourceName: photo.sourceName,
      table: photo.table,
      takenAt: photo.takenAt,
    }))
  ),
  propertyAddress: report.propertyAddress,
  sections: report.sections,
  title: report.title,
});

export const loadLocalReportDraft = async (): Promise<Report | null> => {
  if (!canUseLocalStorage()) {
    return null;
  }
  const storedDraft = window.localStorage.getItem(LOCAL_REPORT_DRAFT_KEY);
  if (!storedDraft) {
    return null;
  }
  try {
    return await hydrateReport(JSON.parse(storedDraft) as ReportSnapshot);
  } catch {
    window.localStorage.removeItem(LOCAL_REPORT_DRAFT_KEY);
    return null;
  }
};

export const saveLocalReportDraft = async (report: Report): Promise<void> => {
  if (!canUseLocalStorage()) {
    return;
  }
  const snapshot = await createDraftSnapshot(report);
  window.localStorage.setItem(LOCAL_REPORT_DRAFT_KEY, JSON.stringify(snapshot));
};
