import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaDetails from "@awesome.me/webawesome/dist/react/details/index.js";
import WaIcon from "@awesome.me/webawesome/dist/react/icon/index.js";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaTextarea from "@awesome.me/webawesome/dist/react/textarea/index.js";

import "@awesome.me/webawesome/dist/styles/themes/default.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, TouchEvent as ReactTouchEvent } from "react";

import { appendDictation } from "../../hooks/use-dictation";
import type { SanityImageAsset } from "../../hooks/use-sanity-image-assets";
import type {
  BrandProfile,
  DetailsTable,
  Report,
  SectionHeading,
} from "../../lib/report-pdf/types";
import { sanityImageUrl } from "../../sanity/image-url";
import { AdImagePicker } from "../ad-image-picker";
import { DictationButton } from "./dictation-button";
import { PhotoItemEditor } from "./photo-item-editor";
import { PropertyAddressField } from "./property-address-field";
import type { ReportTextField } from "./use-report-editor";
import { waValue } from "./wa-value";

export interface CoverImageLibrary {
  error: string | null;
  images: SanityImageAsset[];
  loading: boolean;
  refresh: () => void;
}

interface EditorPaneProps {
  addError: string | null;
  /** Brand defaults shown as contact-field placeholders. */
  brand: BrandProfile;
  busy: boolean;
  coverLibrary: CoverImageLibrary;
  /** Google ID token forwarded to the auth-gated dictation route. */
  idToken: string;
  onAddFiles: (files: File[]) => void;
  onAddSection: () => void;
  onAnnotatePhoto: (id: string) => void;
  onCaptionChange: (id: string, caption: string) => void;
  onCoverImageChange: (url: string | null) => void;
  onFieldChange: (field: ReportTextField, value: string) => void;
  onMovePhoto: (id: string, direction: -1 | 1) => void;
  onRemovePhoto: (id: string) => void;
  onRemoveSection: (id: string) => void;
  onRenameSection: (id: string, title: string) => void;
  onReorderPhotos: (
    sourceId: string,
    targetId: string,
    edge?: "after" | "before"
  ) => void;
  onSectionChange: (id: string, sectionId: string | null) => void;
  onTableChange: (id: string, table: DetailsTable | null) => void;
  report: Report;
  /** Version of the saved report being edited; appended to the panel title. */
  savedVersion?: number | null;
}

const coverThumb = (url: string) =>
  sanityImageUrl(url, { fit: "crop", h: 120, w: 200 });

// ── Touch drag helpers (module scope — no closure allocation per render) ────

const touchRowFromPoint = (x: number, y: number): HTMLElement | null =>
  (document
    .elementFromPoint(x, y)
    ?.closest("li[data-photo-id]") as HTMLElement) ?? null;

const touchEdgeFromY = (y: number, row: HTMLElement): "after" | "before" => {
  const rect = row.getBoundingClientRect();
  return y < rect.top + rect.height / 2 ? "before" : "after";
};

export const EditorPane = ({
  addError,
  brand,
  busy,
  coverLibrary,
  idToken,
  onAddFiles,
  onAddSection,
  onAnnotatePhoto,
  onCaptionChange,
  onCoverImageChange,
  onFieldChange,
  onMovePhoto,
  onRemovePhoto,
  onRemoveSection,
  onRenameSection,
  onReorderPhotos,
  onSectionChange,
  onTableChange,
  report,
  savedVersion = null,
}: EditorPaneProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingContact, setEditingContact] = useState(false);
  // Drag-to-sort state for the photo list.
  const [dragPhotoId, setDragPhotoId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    edge: "after" | "before";
    id: string;
  } | null>(null);

  // Refs hold mid-drag mutable state without triggering re-renders.
  const touchDragRef = useRef<{
    sourceId: string;
    lastX: number;
    lastY: number;
  } | null>(null);
  // Stable handler refs so we can removeEventListener with the exact same fn.
  const touchMoveRef = useRef<((e: TouchEvent) => void) | null>(null);
  const touchEndRef = useRef<(() => void) | null>(null);
  const touchCancelRef = useRef<(() => void) | null>(null);

  const endPhotoDrag = useCallback(() => {
    setDragPhotoId(null);
    setDropTarget(null);
  }, []);

  const handlePhotoDrop = useCallback(
    (sourceId: string, targetId: string, edge: "after" | "before") => {
      onReorderPhotos(sourceId, targetId, edge);
      setDragPhotoId(null);
      setDropTarget(null);
    },
    [onReorderPhotos]
  );

  // Clean up document-level listeners and drag state.
  const detachTouchListeners = useCallback(() => {
    if (touchMoveRef.current) {
      document.removeEventListener("touchmove", touchMoveRef.current);
      touchMoveRef.current = null;
    }
    if (touchEndRef.current) {
      document.removeEventListener("touchend", touchEndRef.current);
      touchEndRef.current = null;
    }
    if (touchCancelRef.current) {
      document.removeEventListener("touchcancel", touchCancelRef.current);
      touchCancelRef.current = null;
    }
  }, []);

  // Belt-and-suspenders: detach listeners when the component unmounts.
  useEffect(() => detachTouchListeners, [detachTouchListeners]);

  // Called directly from each drag handle's onTouchStart prop (React synthetic
  // event), bypassing any web-component shadow-DOM event delegation issues on iOS.
  const handleDragHandleTouchStart = useCallback(
    (photoId: string, event: ReactTouchEvent<HTMLDivElement>) => {
      const t = event.touches[0];
      if (!t) {
        return;
      }

      touchDragRef.current = {
        sourceId: photoId,
        lastX: t.clientX,
        lastY: t.clientY,
      };
      setDragPhotoId(photoId);

      const moveHandler = (e: TouchEvent) => {
        // Prevent iOS from scrolling the page during the drag.
        e.preventDefault();
        const touch = e.touches[0];
        if (!touch || !touchDragRef.current) {
          return;
        }
        touchDragRef.current.lastX = touch.clientX;
        touchDragRef.current.lastY = touch.clientY;
        const target = touchRowFromPoint(touch.clientX, touch.clientY);
        if (
          !target ||
          target.dataset.photoId === touchDragRef.current.sourceId
        ) {
          setDropTarget(null);
        } else {
          setDropTarget({
            edge: touchEdgeFromY(touch.clientY, target),
            id: target.dataset.photoId ?? "",
          });
        }
      };

      const endHandler = () => {
        detachTouchListeners();
        const state = touchDragRef.current;
        touchDragRef.current = null;
        if (!state) {
          return;
        }
        const target = touchRowFromPoint(state.lastX, state.lastY);
        if (
          target?.dataset.photoId &&
          target.dataset.photoId !== state.sourceId
        ) {
          handlePhotoDrop(
            state.sourceId,
            target.dataset.photoId,
            touchEdgeFromY(state.lastY, target)
          );
        } else {
          endPhotoDrag();
        }
      };

      const cancelHandler = () => {
        detachTouchListeners();
        touchDragRef.current = null;
        endPhotoDrag();
      };

      touchMoveRef.current = moveHandler;
      touchEndRef.current = endHandler;
      touchCancelRef.current = cancelHandler;

      // eslint-disable-next-line github/require-passive-events
      document.addEventListener("touchmove", moveHandler, { passive: false });
      document.addEventListener("touchend", endHandler, { passive: true });
      document.addEventListener("touchcancel", cancelHandler);
    },
    [detachTouchListeners, endPhotoDrag, handlePhotoDrop]
  );
  // When editing a saved report, surface the version on the panel title rather
  // than as loose status text above the editor.
  const detailsSummary = savedVersion
    ? `Report details · v${savedVersion}`
    : "Report details";

  // Contact details default to Birdcreek's brand info and rarely change, so we
  // show them read-only behind an Edit toggle rather than four live inputs.
  const contactDetails = [
    { label: "Phone", value: report.contactPhone.trim() || brand.phone },
    { label: "Email", value: report.contactEmail.trim() || brand.email },
    { label: "Website", value: report.contactWebsite.trim() || brand.website },
    { label: "Address", value: report.contactAddress.trim() || brand.address },
  ];

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    if (files.length > 0) {
      onAddFiles(files);
    }
    event.target.value = "";
  };

  return (
    <div className="report-editor">
      {report.photos.length === 0 ? (
        <>
          <WaButton
            className="report-btn-show-label photo"
            appearance="filled"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            variant="brand"
          >
            <WaIcon
              slot="start"
              name="plus"
              label="Add photos"
              library="iconoir"
            />
            {busy ? "Processing…" : "Add photos"}
          </WaButton>
          <input
            accept="image/*,.heic,.heif"
            hidden
            multiple
            onChange={handleFiles}
            ref={fileInputRef}
            type="file"
          />
        </>
      ) : (
        <WaDetails summary="Photos" open>
          <ul
            className={`report-photo-list${dragPhotoId ? " is-reordering" : ""}`}
          >
            {report.photos.map((photo, index) => (
              <PhotoItemEditor
                dragging={dragPhotoId === photo.id}
                dropEdge={
                  dropTarget?.id === photo.id && dragPhotoId !== photo.id
                    ? dropTarget.edge
                    : null
                }
                idToken={idToken}
                index={index}
                key={photo.id}
                onAnnotate={onAnnotatePhoto}
                onCaptionChange={onCaptionChange}
                onDragEndItem={endPhotoDrag}
                onDragOverItem={(edge) => setDropTarget({ edge, id: photo.id })}
                onDragStartItem={() => setDragPhotoId(photo.id)}
                onDropItem={(sourceId, edge) =>
                  handlePhotoDrop(sourceId, photo.id, edge)
                }
                onMove={onMovePhoto}
                onRemove={onRemovePhoto}
                onSectionChange={onSectionChange}
                onTableChange={onTableChange}
                onTouchStartItem={(e) =>
                  handleDragHandleTouchStart(photo.id, e)
                }
                photo={photo}
                sections={report.sections}
                total={report.photos.length}
              />
            ))}
          </ul>

          <div className="report-photo-intake">
            <WaButton
              appearance="filled"
              className="report-btn-show-label"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              variant="brand"
            >
              <WaIcon
                slot="start"
                name="plus"
                label="Add photos"
                library="iconoir"
              />
              {busy ? "Processing…" : "Add photos"}
            </WaButton>
            <input
              accept="image/*,.heic,.heif"
              hidden
              multiple
              onChange={handleFiles}
              ref={fileInputRef}
              type="file"
            />
          </div>
          {addError ? (
            <p className="report-error" role="alert">
              {addError}
            </p>
          ) : null}
        </WaDetails>
      )}

      <WaDetails summary={detailsSummary}>
        <div className="report-field">
          <WaInput
            label="Cover heading (optional)"
            onInput={(event) => onFieldChange("coverHeading", waValue(event))}
            placeholder="Roof Inspection Report"
            value={report.coverHeading}
          >
            <DictationButton
              slot="end"
              idToken={idToken}
              label="cover heading"
              onTranscript={(text) =>
                onFieldChange(
                  "coverHeading",
                  appendDictation(report.coverHeading, text)
                )
              }
            />
          </WaInput>
        </div>
        <div className="report-field">
          <WaInput
            label="Job number"
            onInput={(event) => onFieldChange("jobNumber", waValue(event))}
            placeholder="1234567890"
            value={report.jobNumber}
          >
            <DictationButton
              slot="end"
              idToken={idToken}
              label="job number"
              onTranscript={(text) =>
                onFieldChange(
                  "jobNumber",
                  appendDictation(report.jobNumber, text)
                )
              }
            />
          </WaInput>
        </div>
        <div className="report-field">
          <WaInput
            label="Report title / property"
            onInput={(event) => onFieldChange("title", waValue(event))}
            placeholder="123 Main St, Waco TX"
            value={report.title}
          >
            <DictationButton
              slot="end"
              idToken={idToken}
              label="report title"
              onTranscript={(text) =>
                onFieldChange("title", appendDictation(report.title, text))
              }
            />
          </WaInput>
        </div>
        <PropertyAddressField
          idToken={idToken}
          onChange={(next) => onFieldChange("propertyAddress", next)}
          value={report.propertyAddress}
        />
        <WaInput
          label="Inspection date"
          onInput={(event) => onFieldChange("date", waValue(event))}
          type="date"
          value={report.date}
        >
          <WaIcon name="calendar" label="inspection date" library="iconoir" />
        </WaInput>
        <div className="report-field report-field--textarea">
          <WaTextarea
            label="Overall note (optional)"
            onInput={(event) => onFieldChange("overallNote", waValue(event))}
            placeholder="Summary of the inspection findings"
            rows={4}
            value={report.overallNote}
          />
          <DictationButton
            idToken={idToken}
            label="overall note"
            onTranscript={(text) =>
              onFieldChange(
                "overallNote",
                appendDictation(report.overallNote, text)
              )
            }
          />
        </div>
      </WaDetails>
      <WaDetails summary="Cover photo (optional)">
        <p className="report-hint">
          Pick a hero image from the media library for a full-bleed cover. With
          no image, the cover uses the branded pattern.
        </p>
        <div className="report-cover-picker">
          {report.coverImageUrl ? (
            // biome-ignore lint/correctness/useImageSize: thumbnail sized via CSS
            <img
              alt="Selected cover"
              className="report-cover-thumb"
              src={coverThumb(report.coverImageUrl)}
            />
          ) : null}
          <div className="report-cover-picker-actions">
            <AdImagePicker
              error={coverLibrary.error}
              images={coverLibrary.images}
              loading={coverLibrary.loading}
              onRefresh={coverLibrary.refresh}
              onSelect={(image) => onCoverImageChange(image.url)}
              selectedImageUrl={report.coverImageUrl}
            />
            {report.coverImageUrl ? (
              <WaButton
                appearance="filled"
                onClick={() => onCoverImageChange(null)}
                size="small"
              >
                <WaIcon
                  slot="start"
                  library="iconoir"
                  name="trash"
                  label="Remove cover"
                />
                Remove cover
              </WaButton>
            ) : null}
          </div>
        </div>
      </WaDetails>
      <WaDetails summary="Sections (optional)">
        <p className="report-hint">
          Group photos under headings like &ldquo;Front slope&rdquo; or
          &ldquo;Flashing&rdquo;.
        </p>
        <WaButton
          appearance="filled"
          className="report-btn-show-label"
          onClick={onAddSection}
        >
          <WaIcon
            slot="start"
            name="plus"
            label="Add section"
            library="iconoir"
          />
          Add section
        </WaButton>
        {report.sections.map((section: SectionHeading) => (
          <div className="report-section-row" key={section.id}>
            <WaInput
              aria-label="Section title"
              onInput={(event) => onRenameSection(section.id, waValue(event))}
              placeholder="Section title"
              value={section.title}
            >
              <DictationButton
                slot="end"
                idToken={idToken}
                label="section title"
                onTranscript={(text) =>
                  onRenameSection(
                    section.id,
                    appendDictation(section.title, text)
                  )
                }
              />
            </WaInput>
            <WaButton
              appearance="filled"
              variant="danger"
              aria-label="Remove section"
              onClick={() => onRemoveSection(section.id)}
              size="small"
            >
              <WaIcon
                slot="start"
                name="trash"
                label="Remove section"
                library="iconoir"
              />
            </WaButton>
          </div>
        ))}
      </WaDetails>
      <WaDetails summary="Contact page">
        <p className="report-hint">Shown on the last page of the report.</p>
        <div className="report-field report-field--textarea">
          <WaTextarea
            label="Intro note (optional)"
            onInput={(event) => onFieldChange("contactIntro", waValue(event))}
            placeholder="A short note to the client, in your voice"
            rows={4}
            value={report.contactIntro}
          />
          <DictationButton
            idToken={idToken}
            label="contact intro"
            onTranscript={(text) =>
              onFieldChange(
                "contactIntro",
                appendDictation(report.contactIntro, text)
              )
            }
          />
        </div>

        {editingContact ? (
          <div className="report-contact-edit">
            <WaInput
              label="Phone"
              onInput={(event) => onFieldChange("contactPhone", waValue(event))}
              placeholder={brand.phone}
              value={report.contactPhone}
            />
            <WaInput
              label="Email"
              onInput={(event) => onFieldChange("contactEmail", waValue(event))}
              placeholder={brand.email}
              value={report.contactEmail}
            />
            <WaInput
              label="Website"
              onInput={(event) =>
                onFieldChange("contactWebsite", waValue(event))
              }
              placeholder={brand.website}
              value={report.contactWebsite}
            />
            <WaInput
              label="Address"
              onInput={(event) =>
                onFieldChange("contactAddress", waValue(event))
              }
              placeholder={brand.address}
              value={report.contactAddress}
            />
            <WaButton
              appearance="filled"
              onClick={() => setEditingContact(false)}
              size="small"
              variant="brand"
            >
              Done
            </WaButton>
          </div>
        ) : (
          <div className="report-contact-summary">
            <dl className="report-contact-details">
              {contactDetails.map((detail) => (
                <div key={detail.label}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
            <WaButton
              appearance="outlined"
              onClick={() => setEditingContact(true)}
              size="small"
            >
              <WaIcon
                label=""
                library="iconoir"
                name="edit-pencil"
                slot="start"
              />
              Edit details
            </WaButton>
          </div>
        )}
      </WaDetails>
    </div>
  );
};
