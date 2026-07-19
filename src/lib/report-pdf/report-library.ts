import { upload } from "@vercel/blob/client";

import type { DetailsTable, PhotoItem, Report, SectionHeading } from "./types";

const BLOB_UPLOAD_ROUTE = "/api/report-blob-upload";
const REPORTS_ROUTE = "/api/reports";

/** A photo as persisted in a version snapshot (blob URL instead of a Blob). */
interface SnapshotPhoto {
  caption: string;
  id: string;
  order: number;
  previewUrl: string;
  sectionId: string | null;
  sourceName: string;
  table: DetailsTable | null;
}

/** Serialized, persistable form of a `Report` (no in-memory Blobs). */
export interface ReportSnapshot {
  coverImageUrl: string | null;
  date: string;
  overallNote: string;
  photos: SnapshotPhoto[];
  propertyAddress: string;
  sections: SectionHeading[];
  title: string;
}

export interface ReportVersionSummary {
  driveWebViewLink?: string;
  pdfUrl?: string;
  previewUrl?: string;
  savedAt?: string;
  versionNumber?: number;
}

export interface ReportSummary {
  id: string;
  latest?: ReportVersionSummary;
  propertyAddress?: string;
  savedBy?: string;
  title?: string;
  updatedAt?: string;
  versionCount?: number;
}

export interface SavedVersion extends ReportVersionSummary {
  _key?: string;
  driveFileId?: string;
  report?: string;
  savedBy?: string;
}

export interface ReportDetail {
  _id: string;
  propertyAddress?: string;
  savedBy?: string;
  title?: string;
  updatedAt?: string;
  versions?: SavedVersion[];
}

const isPermanentUrl = (url: string): boolean => url.startsWith("http");

const authHeaders = (idToken: string): HeadersInit => ({
  Authorization: `Bearer ${idToken}`,
  "Content-Type": "application/json",
});

const uploadBlob = async (
  blob: Blob,
  pathname: string,
  idToken: string,
  contentType: string
): Promise<string> => {
  const result = await upload(pathname, blob, {
    access: "public",
    clientPayload: idToken,
    contentType,
    handleUploadUrl: BLOB_UPLOAD_ROUTE,
  });
  return result.url;
};

/**
 * Upload any newly-added photos to Vercel Blob (skipping ones already hosted)
 * and return the report as a JSON-serializable snapshot.
 */
export const serializeReport = async (
  report: Report,
  idToken: string
): Promise<ReportSnapshot> => {
  const photos: SnapshotPhoto[] = [];
  for (const photo of report.photos) {
    let { previewUrl } = photo;
    if (!isPermanentUrl(previewUrl)) {
      // eslint-disable-next-line no-await-in-loop -- bounded by photo count; keeps memory low
      previewUrl = await uploadBlob(
        photo.processedImage,
        `reports/photos/${photo.id}.jpg`,
        idToken,
        "image/jpeg"
      );
    }
    photos.push({
      caption: photo.caption,
      id: photo.id,
      order: photo.order,
      previewUrl,
      sectionId: photo.sectionId,
      sourceName: photo.sourceName,
      table: photo.table,
    });
  }
  return {
    coverImageUrl: report.coverImageUrl,
    date: report.date,
    overallNote: report.overallNote,
    photos,
    propertyAddress: report.propertyAddress,
    sections: report.sections,
    title: report.title,
  };
};

export interface PersistParams {
  drive?: { fileId?: string; webViewLink?: string };
  existingId?: string;
  idToken: string;
  pdfBlob: Blob;
  report: Report;
}

export interface PersistResult {
  id: string;
  pdfUrl: string;
  versionNumber: number;
}

/** Upload the report's assets and append a new version in Sanity. */
export const persistReport = async ({
  drive,
  existingId,
  idToken,
  pdfBlob,
  report,
}: PersistParams): Promise<PersistResult> => {
  const snapshot = await serializeReport(report, idToken);
  const pdfUrl = await uploadBlob(
    pdfBlob,
    `reports/pdf/${crypto.randomUUID()}.pdf`,
    idToken,
    "application/pdf"
  );
  const previewUrl = snapshot.photos[0]?.previewUrl;

  const response = await fetch(REPORTS_ROUTE, {
    body: JSON.stringify({
      driveFileId: drive?.fileId,
      driveWebViewLink: drive?.webViewLink,
      id: existingId,
      pdfUrl,
      previewUrl,
      propertyAddress: report.propertyAddress,
      report: JSON.stringify(snapshot),
      title: report.title || "Untitled report",
    }),
    headers: authHeaders(idToken),
    method: "POST",
  });
  const data = (await response.json()) as {
    error?: string;
    id?: string;
    versionNumber?: number;
  };
  if (!response.ok || !data.id) {
    throw new Error(data.error ?? "Could not save the report.");
  }
  return { id: data.id, pdfUrl, versionNumber: data.versionNumber ?? 1 };
};

export const listReports = async (
  idToken: string
): Promise<ReportSummary[]> => {
  const response = await fetch(REPORTS_ROUTE, {
    headers: authHeaders(idToken),
  });
  const data = (await response.json()) as {
    error?: string;
    reports?: ReportSummary[];
  };
  if (!response.ok) {
    throw new Error(data.error ?? "Could not load the report library.");
  }
  return data.reports ?? [];
};

export const getReport = async (
  id: string,
  idToken: string
): Promise<ReportDetail> => {
  const response = await fetch(
    `${REPORTS_ROUTE}?id=${encodeURIComponent(id)}`,
    { headers: authHeaders(idToken) }
  );
  const data = (await response.json()) as {
    error?: string;
    report?: ReportDetail;
  };
  if (!response.ok || !data.report) {
    throw new Error(data.error ?? "Could not open the report.");
  }
  return data.report;
};

export const deleteReport = async (
  id: string,
  idToken: string
): Promise<void> => {
  const response = await fetch(
    `${REPORTS_ROUTE}?id=${encodeURIComponent(id)}`,
    { headers: authHeaders(idToken), method: "DELETE" }
  );
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(data.error ?? "Could not delete the report.");
  }
};

/**
 * Rehydrate a persisted snapshot back into an editable `Report`, refetching
 * each hosted photo into a Blob so a re-save can re-upload if needed.
 */
export const hydrateReport = async (
  snapshot: ReportSnapshot
): Promise<Report> => {
  const photos: PhotoItem[] = [];
  for (const photo of snapshot.photos) {
    // eslint-disable-next-line no-await-in-loop -- bounded by photo count
    const blob = await fetch(photo.previewUrl).then((r) => r.blob());
    photos.push({
      caption: photo.caption,
      id: photo.id,
      order: photo.order,
      previewUrl: photo.previewUrl,
      processedImage: blob,
      sectionId: photo.sectionId,
      sourceName: photo.sourceName,
      table: photo.table,
    });
  }
  return {
    coverImageUrl: snapshot.coverImageUrl,
    date: snapshot.date,
    overallNote: snapshot.overallNote,
    photos,
    propertyAddress: snapshot.propertyAddress,
    sections: snapshot.sections,
    title: snapshot.title,
  };
};
