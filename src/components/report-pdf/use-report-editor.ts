import { useCallback, useEffect, useRef, useState } from "react";

import { compositeAnnotatedPhoto } from "../../lib/report-pdf/annotate-composite";
import { todayIso } from "../../lib/report-pdf/format";
import { processPhotoFile } from "../../lib/report-pdf/image-pipeline";
import type {
  AnnotationScene,
  DetailsTable,
  PhotoItem,
  Report,
  SectionHeading,
} from "../../lib/report-pdf/types";

const createId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;

const reindex = <T extends { order: number }>(items: T[]): T[] =>
  items.map((item, index) => ({ ...item, order: index }));

const DEFAULT_COVER_HEADING = "Roof Inspection Report";

/** Free-text report fields edited through the shared `setField` handler. */
export type ReportTextField =
  | "contactAddress"
  | "contactEmail"
  | "contactIntro"
  | "contactPhone"
  | "contactWebsite"
  | "coverHeading"
  | "date"
  | "jobNumber"
  | "overallNote"
  | "propertyAddress"
  | "title";

const emptyReport = (): Report => ({
  contactAddress: "",
  contactEmail: "",
  contactIntro: "",
  contactPhone: "",
  contactWebsite: "",
  coverHeading: DEFAULT_COVER_HEADING,
  coverImageUrl: null,
  date: todayIso(),
  overallNote: "",
  photos: [],
  propertyAddress: "",
  sections: [],
  title: "",
  jobNumber: "",
});

export interface ReportEditor {
  addError: string | null;
  addFiles: (files: File[]) => Promise<void>;
  addSection: () => void;
  busy: boolean;
  /** Replace the whole report (e.g. recalling a saved report from the library). */
  loadReport: (next: Report) => void;
  movePhoto: (id: string, direction: -1 | 1) => void;
  removePhoto: (id: string) => void;
  /**
   * Drag-to-sort: move `sourceId` before or after `targetId`
   * (`edge` defaults to before when omitted).
   */
  reorderPhotos: (
    sourceId: string,
    targetId: string,
    edge?: "after" | "before"
  ) => void;
  removeSection: (id: string) => void;
  renameSection: (id: string, title: string) => void;
  /** Clear the editor back to a blank report. */
  resetReport: () => void;
  report: Report;
  /** Save hand-drawn annotations and refresh the composited display image. */
  setAnnotations: (id: string, scene: AnnotationScene) => Promise<void>;
  setCaption: (id: string, caption: string) => void;
  setCoverImage: (url: string | null) => void;
  setField: (field: ReportTextField, value: string) => void;
  setSection: (id: string, sectionId: string | null) => void;
  setTable: (id: string, table: DetailsTable | null) => void;
}

export const useReportEditor = (): ReportEditor => {
  const [report, setReport] = useState<Report>(emptyReport);
  const [busy, setBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const objectUrls = useRef<Set<string>>(new Set());
  const reportRef = useRef(report);

  useEffect(() => {
    reportRef.current = report;
  }, [report]);

  useEffect(
    () => () => {
      for (const url of objectUrls.current) {
        URL.revokeObjectURL(url);
      }
    },
    []
  );

  const setField = useCallback((field: ReportTextField, value: string) => {
    setReport((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setCoverImage = useCallback((url: string | null) => {
    setReport((prev) => ({ ...prev, coverImageUrl: url }));
  }, []);

  const addFiles = useCallback(async (files: File[]) => {
    setBusy(true);
    setAddError(null);
    const added: PhotoItem[] = [];
    let failure: string | null = null;

    for (const file of files) {
      try {
        // Sequential keeps memory bounded on phones with many large photos.
        // eslint-disable-next-line no-await-in-loop
        const processed = await processPhotoFile(file);
        objectUrls.current.add(processed.previewUrl);
        added.push({
          annotations: null,
          caption: "",
          id: createId(),
          order: 0,
          previewUrl: processed.previewUrl,
          processedImage: processed.blob,
          sectionId: null,
          sourceName: file.name,
          table: null,
          takenAt: processed.takenAt,
        });
      } catch (error) {
        failure =
          error instanceof Error
            ? error.message
            : `Could not add "${file.name}".`;
      }
    }

    if (added.length > 0) {
      setReport((prev) => ({
        ...prev,
        photos: reindex([...prev.photos, ...added]),
      }));
    }
    if (failure) {
      setAddError(failure);
    }
    setBusy(false);
  }, []);

  const removePhoto = useCallback((id: string) => {
    setReport((prev) => {
      const target = prev.photos.find((photo) => photo.id === id);
      if (target && objectUrls.current.has(target.previewUrl)) {
        URL.revokeObjectURL(target.previewUrl);
        objectUrls.current.delete(target.previewUrl);
      }
      return {
        ...prev,
        photos: reindex(prev.photos.filter((photo) => photo.id !== id)),
      };
    });
  }, []);

  const movePhoto = useCallback((id: string, direction: -1 | 1) => {
    setReport((prev) => {
      const index = prev.photos.findIndex((photo) => photo.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= prev.photos.length) {
        return prev;
      }
      const photos = [...prev.photos];
      const [moved] = photos.splice(index, 1);
      photos.splice(target, 0, moved);
      return { ...prev, photos: reindex(photos) };
    });
  }, []);

  const reorderPhotos = useCallback(
    (
      sourceId: string,
      targetId: string,
      edge: "after" | "before" = "before"
    ) => {
      if (sourceId === targetId) {
        return;
      }
      setReport((prev) => {
        const from = prev.photos.findIndex((photo) => photo.id === sourceId);
        const to = prev.photos.findIndex((photo) => photo.id === targetId);
        if (from === -1 || to === -1) {
          return prev;
        }
        const photos = [...prev.photos];
        const [moved] = photos.splice(from, 1);
        let insertAt = edge === "after" ? to + 1 : to;
        // Removing an earlier item shifts later indices down by one.
        if (from < insertAt) {
          insertAt -= 1;
        }
        photos.splice(insertAt, 0, moved);
        return { ...prev, photos: reindex(photos) };
      });
    },
    []
  );

  const patchPhoto = useCallback((id: string, patch: Partial<PhotoItem>) => {
    setReport((prev) => ({
      ...prev,
      photos: prev.photos.map((photo) =>
        photo.id === id ? { ...photo, ...patch } : photo
      ),
    }));
  }, []);

  const setCaption = useCallback(
    (id: string, caption: string) => patchPhoto(id, { caption }),
    [patchPhoto]
  );

  const setSection = useCallback(
    (id: string, sectionId: string | null) => patchPhoto(id, { sectionId }),
    [patchPhoto]
  );

  const setTable = useCallback(
    (id: string, table: DetailsTable | null) => patchPhoto(id, { table }),
    [patchPhoto]
  );

  const setAnnotations = useCallback(
    async (id: string, scene: AnnotationScene) => {
      const photo = reportRef.current.photos.find((item) => item.id === id);
      if (!photo) {
        return;
      }
      const hasItems = scene.items.length > 0;
      // Composite onto the pristine original so re-editing always starts clean.
      const nextPreview = hasItems
        ? (await compositeAnnotatedPhoto(photo.processedImage, scene)).url
        : URL.createObjectURL(photo.processedImage);

      if (
        photo.previewUrl.startsWith("blob:") &&
        objectUrls.current.has(photo.previewUrl)
      ) {
        URL.revokeObjectURL(photo.previewUrl);
        objectUrls.current.delete(photo.previewUrl);
      }
      objectUrls.current.add(nextPreview);
      patchPhoto(id, {
        annotations: hasItems ? scene : null,
        previewUrl: nextPreview,
      });
    },
    [patchPhoto]
  );

  const addSection = useCallback(() => {
    setReport((prev) => {
      const section: SectionHeading = {
        id: createId(),
        order: prev.sections.length,
        title: "",
      };
      return { ...prev, sections: [...prev.sections, section] };
    });
  }, []);

  const renameSection = useCallback((id: string, title: string) => {
    setReport((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === id ? { ...section, title } : section
      ),
    }));
  }, []);

  const removeSection = useCallback((id: string) => {
    setReport((prev) => ({
      ...prev,
      photos: prev.photos.map((photo) =>
        photo.sectionId === id ? { ...photo, sectionId: null } : photo
      ),
      sections: reindex(prev.sections.filter((section) => section.id !== id)),
    }));
  }, []);

  const loadReport = useCallback((next: Report) => {
    for (const url of objectUrls.current) {
      URL.revokeObjectURL(url);
    }
    objectUrls.current.clear();
    // Track any hydrated object URLs (composited photos) so we revoke them later.
    for (const photo of next.photos) {
      if (photo.previewUrl.startsWith("blob:")) {
        objectUrls.current.add(photo.previewUrl);
      }
    }
    setAddError(null);
    setReport(next);
  }, []);

  const resetReport = useCallback(() => {
    loadReport(emptyReport());
  }, [loadReport]);

  return {
    addError,
    addFiles,
    addSection,
    busy,
    loadReport,
    movePhoto,
    removePhoto,
    removeSection,
    renameSection,
    reorderPhotos,
    report,
    resetReport,
    setAnnotations,
    setCaption,
    setCoverImage,
    setField,
    setSection,
    setTable,
  };
};
