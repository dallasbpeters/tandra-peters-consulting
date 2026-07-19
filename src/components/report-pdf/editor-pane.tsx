import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaIcon from "@awesome.me/webawesome/dist/react/icon/index.js";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaTextarea from "@awesome.me/webawesome/dist/react/textarea/index.js";

import "@awesome.me/webawesome/dist/styles/themes/default.css";
import { Plus, Trash } from "iconoir-react";
import { useRef } from "react";
import type { ChangeEvent } from "react";

import { appendDictation } from "../../hooks/use-dictation";
import type { SanityImageAsset } from "../../hooks/use-sanity-image-assets";
import type {
  DetailsTable,
  Report,
  SectionHeading,
} from "../../lib/report-pdf/types";
import { sanityImageUrl } from "../../sanity/image-url";
import { AdImagePicker } from "../ad-image-picker";
import { DictationButton } from "./dictation-button";
import { PhotoItemEditor } from "./photo-item-editor";
import { PropertyAddressField } from "./property-address-field";
import { waValue } from "./wa-value";

export interface CoverImageLibrary {
  error: string | null;
  images: SanityImageAsset[];
  loading: boolean;
  refresh: () => void;
}

interface EditorPaneProps {
  addError: string | null;
  busy: boolean;
  coverLibrary: CoverImageLibrary;
  /** Google ID token forwarded to the auth-gated dictation route. */
  idToken: string;
  onAddFiles: (files: File[]) => void;
  onAddSection: () => void;
  onCaptionChange: (id: string, caption: string) => void;
  onCoverImageChange: (url: string | null) => void;
  onFieldChange: (
    field: "date" | "overallNote" | "propertyAddress" | "title",
    value: string
  ) => void;
  onMovePhoto: (id: string, direction: -1 | 1) => void;
  onRemovePhoto: (id: string) => void;
  onRemoveSection: (id: string) => void;
  onRenameSection: (id: string, title: string) => void;
  onSectionChange: (id: string, sectionId: string | null) => void;
  onTableChange: (id: string, table: DetailsTable | null) => void;
  report: Report;
}

const coverThumb = (url: string) =>
  sanityImageUrl(url, { fit: "crop", h: 120, w: 200 });

export const EditorPane = ({
  addError,
  busy,
  coverLibrary,
  idToken,
  onAddFiles,
  onAddSection,
  onCaptionChange,
  onCoverImageChange,
  onFieldChange,
  onMovePhoto,
  onRemovePhoto,
  onRemoveSection,
  onRenameSection,
  onSectionChange,
  onTableChange,
  report,
}: EditorPaneProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    if (files.length > 0) {
      onAddFiles(files);
    }
    event.target.value = "";
  };

  return (
    <div className="report-editor">
      <fieldset className="report-fieldset">
        <legend>Report details</legend>
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
        />
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
      </fieldset>

      <fieldset className="report-fieldset">
        <legend>Cover photo (optional)</legend>
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
                  name="trash"
                  label="Remove cover"
                  library="iconoir"
                />
                Remove cover
              </WaButton>
            ) : null}
          </div>
        </div>
      </fieldset>

      <fieldset className="report-fieldset">
        <legend>Sections (optional)</legend>
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
      </fieldset>

      <fieldset className="report-fieldset">
        <legend>Photos</legend>
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
        {report.photos.length === 0 ? (
          <p className="report-hint">
            Add photos from your camera roll or take new ones. Each photo
            becomes its own page in the report.
          </p>
        ) : (
          <ul className="report-photo-list">
            {report.photos.map((photo, index) => (
              <PhotoItemEditor
                idToken={idToken}
                index={index}
                key={photo.id}
                onCaptionChange={onCaptionChange}
                onMove={onMovePhoto}
                onRemove={onRemovePhoto}
                onSectionChange={onSectionChange}
                onTableChange={onTableChange}
                photo={photo}
                sections={report.sections}
                total={report.photos.length}
              />
            ))}
          </ul>
        )}
      </fieldset>
    </div>
  );
};
