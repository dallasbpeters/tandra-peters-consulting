import { useCallback, useEffect, useRef, useState } from "react";

import { todayIso } from "../../lib/report-pdf/format";
import { processPhotoFile } from "../../lib/report-pdf/image-pipeline";
import type {
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

const emptyReport = (): Report => ({
  coverImageUrl: null,
  date: todayIso(),
  overallNote: "",
  photos: [],
  propertyAddress: "",
  sections: [],
  title: "",
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
  removeSection: (id: string) => void;
  renameSection: (id: string, title: string) => void;
  /** Clear the editor back to a blank report. */
  resetReport: () => void;
  report: Report;
  setCaption: (id: string, caption: string) => void;
  setCoverImage: (url: string | null) => void;
  setField: (
    field: "date" | "overallNote" | "propertyAddress" | "title",
    value: string
  ) => void;
  setSection: (id: string, sectionId: string | null) => void;
  setTable: (id: string, table: DetailsTable | null) => void;
}

export const useReportEditor = (): ReportEditor => {
  const [report, setReport] = useState<Report>(emptyReport);
  const [busy, setBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const objectUrls = useRef<Set<string>>(new Set());

  useEffect(
    () => () => {
      for (const url of objectUrls.current) {
        URL.revokeObjectURL(url);
      }
    },
    []
  );

  const setField = useCallback(
    (
      field: "date" | "overallNote" | "propertyAddress" | "title",
      value: string
    ) => {
      setReport((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

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
          caption: "",
          id: createId(),
          order: 0,
          previewUrl: processed.previewUrl,
          processedImage: processed.blob,
          sectionId: null,
          sourceName: file.name,
          table: null,
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
    report,
    resetReport,
    setCaption,
    setCoverImage,
    setField,
    setSection,
    setTable,
  };
};
