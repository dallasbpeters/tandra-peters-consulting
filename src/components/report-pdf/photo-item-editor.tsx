import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaIcon from "@awesome.me/webawesome/dist/react/icon/index.js";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaOption from "@awesome.me/webawesome/dist/react/option/index.js";
import WaSelect from "@awesome.me/webawesome/dist/react/select/index.js";
import { useEffect, useRef } from "react";
import type { DragEvent } from "react";

import { appendDictation } from "../../hooks/use-dictation";
import type {
  DetailsTable,
  PhotoItem,
  SectionHeading,
} from "../../lib/report-pdf/types";
import { DictationButton } from "./dictation-button";
import { waValue } from "./wa-value";

/** Where a dragged photo would insert relative to this row. */
export type PhotoDropEdge = "after" | "before";

interface PhotoItemEditorProps {
  /** True while this row is the one being dragged. */
  dragging?: boolean;
  /** Insertion edge while another photo is hovering this row. */
  dropEdge?: PhotoDropEdge | null;
  /** Google ID token forwarded to the auth-gated dictation route. */
  idToken: string;
  /** Touch drag — called when the user begins a touch on the drag handle. */
  onTouchStartItem?: (event: React.TouchEvent<HTMLDivElement>) => void;
  index: number;
  onAnnotate: (id: string) => void;
  onCaptionChange: (id: string, caption: string) => void;
  onDragEndItem?: () => void;
  onDragOverItem?: (edge: PhotoDropEdge) => void;
  onDragStartItem?: () => void;
  /** Called with the dragged photo id (from dataTransfer) and insert edge. */
  onDropItem?: (sourceId: string, edge: PhotoDropEdge) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onSectionChange: (id: string, sectionId: string | null) => void;
  onTableChange: (id: string, table: DetailsTable | null) => void;
  photo: PhotoItem;
  sections: SectionHeading[];
  total: number;
}

const DEFAULT_TABLE: DetailsTable = {
  columns: ["Finding", "Detail"],
  rows: [["", ""]],
};

const setColumn = (
  table: DetailsTable,
  columnIndex: number,
  value: string
): DetailsTable => ({
  ...table,
  columns: table.columns.map((column, index) =>
    index === columnIndex ? value : column
  ),
});

const setCell = (
  table: DetailsTable,
  rowIndex: number,
  cellIndex: number,
  value: string
): DetailsTable => ({
  ...table,
  rows: table.rows.map((row, rIndex) =>
    rIndex === rowIndex
      ? row.map((cell, cIndex) => (cIndex === cellIndex ? value : cell))
      : row
  ),
});

const addColumn = (table: DetailsTable): DetailsTable => ({
  columns: [...table.columns, ""],
  rows: table.rows.map((row) => [...row, ""]),
});

const removeColumn = (
  table: DetailsTable,
  columnIndex: number
): DetailsTable => ({
  columns: table.columns.filter((_column, index) => index !== columnIndex),
  rows: table.rows.map((row) =>
    row.filter((_cell, index) => index !== columnIndex)
  ),
});

const addRow = (table: DetailsTable): DetailsTable => ({
  ...table,
  rows: [...table.rows, table.columns.map(() => "")],
});

const removeRow = (table: DetailsTable, rowIndex: number): DetailsTable => ({
  ...table,
  rows: table.rows.filter((_row, index) => index !== rowIndex),
});

const TableEditor = ({
  onTableChange,
  photoId,
  table,
}: {
  onTableChange: (id: string, table: DetailsTable | null) => void;
  photoId: string;
  table: DetailsTable;
}) => (
  <div className="report-table-editor">
    <div className="report-table-editor-scroll">
      <table>
        <thead>
          <tr>
            {table.columns.map((column, columnIndex) => (
              <th key={`col-${columnIndex}`} scope="col">
                <WaInput
                  aria-label={`Column ${columnIndex + 1} name`}
                  onInput={(event) =>
                    onTableChange(
                      photoId,
                      setColumn(table, columnIndex, waValue(event))
                    )
                  }
                  placeholder="Column"
                  value={column}
                />
              </th>
            ))}
            <th scope="col">
              <span className="report-sr-only">Row actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {table.columns.map((_column, cellIndex) => (
                <td key={`cell-${rowIndex}-${cellIndex}`}>
                  <WaInput
                    aria-label={`Row ${rowIndex + 1} column ${cellIndex + 1}`}
                    onInput={(event) =>
                      onTableChange(
                        photoId,
                        setCell(table, rowIndex, cellIndex, waValue(event))
                      )
                    }
                    value={row[cellIndex] ?? ""}
                  />
                </td>
              ))}
              <td>
                <WaButton
                  appearance="outlined"
                  variant="danger"
                  aria-label={`Remove row ${rowIndex + 1}`}
                  onClick={() =>
                    onTableChange(photoId, removeRow(table, rowIndex))
                  }
                  size="small"
                >
                  <WaIcon
                    slot="start"
                    name="xmark"
                    label="Remove row"
                    library="iconoir"
                  />
                </WaButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="report-photo-controls">
      <WaButton
        appearance="filled"
        className="report-btn-show-label"
        onClick={() => onTableChange(photoId, addRow(table))}
        size="small"
      >
        <WaIcon slot="start" name="plus" label="Add Row" library="iconoir" />
        Row
      </WaButton>
      <WaButton
        appearance="filled"
        className="report-btn-show-label"
        onClick={() => onTableChange(photoId, addColumn(table))}
        size="small"
      >
        <WaIcon slot="start" name="plus" label="Add Column" library="iconoir" />
        Column
      </WaButton>
      {table.columns.length > 1 ? (
        <WaButton
          appearance="filled"
          className="report-btn-show-label"
          onClick={() =>
            onTableChange(
              photoId,
              removeColumn(table, table.columns.length - 1)
            )
          }
          size="small"
        >
          <WaIcon name="xmark" label="Remove column" library="iconoir" />
          Remove column
        </WaButton>
      ) : null}
      <WaButton
        appearance="filled"
        className="report-btn-show-label"
        variant="danger"
        onClick={() => onTableChange(photoId, null)}
        size="small"
      >
        <WaIcon
          slot="start"
          name="trash"
          label="Remove table"
          library="iconoir"
        />
        Remove table
      </WaButton>
    </div>
  </div>
);

const dropEdgeFromEvent = (
  event: { clientY: number },
  row: HTMLElement
): PhotoDropEdge => {
  const rect = row.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
};

export const PhotoItemEditor = ({
  dragging = false,
  dropEdge = null,
  idToken,
  index,
  onAnnotate,
  onCaptionChange,
  onDragEndItem,
  onDragOverItem,
  onDragStartItem,
  onDropItem,
  onTouchStartItem,
  onMove,
  onRemove,
  onSectionChange,
  onTableChange,
  photo,
  sections,
  total,
}: PhotoItemEditorProps) => {
  const rowRef = useRef<HTMLLIElement>(null);
  const ghostRef = useRef<HTMLElement | null>(null);

  const clearGhost = () => {
    ghostRef.current?.remove();
    ghostRef.current = null;
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    const row = rowRef.current;
    if (!row) {
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    // Source id travels in dataTransfer so drop does not depend on React state
    // (dragend / re-renders can clear state before drop runs).
    event.dataTransfer.setData("text/plain", photo.id);

    // Snapshot the full row into a detached ghost. Updating React state during
    // dragStart remounts the source and cancels the native drag otherwise.
    clearGhost();
    const ghost = row.cloneNode(true) as HTMLElement;
    delete ghost.dataset.dragging;
    ghost.classList.remove("is-dragging", "is-drop-before", "is-drop-after");
    ghost.style.cssText = [
      "position:absolute",
      "top:-9999px",
      "left:0",
      `width:${row.offsetWidth}px`,
      "opacity:1",
      "pointer-events:none",
      "box-shadow:0 12px 32px rgb(0 0 0 / 22%)",
      "border:2px solid var(--report-accent, #3f7d5f)",
      "border-radius:0.6rem",
      "background:#fff",
      "z-index:9999",
    ].join(";");
    document.body.append(ghost);
    ghostRef.current = ghost;

    const rect = row.getBoundingClientRect();
    event.dataTransfer.setDragImage(
      ghost,
      event.clientX - rect.left,
      event.clientY - rect.top
    );

    // Defer highlight state so this drag isn't cancelled by the re-render.
    queueMicrotask(() => {
      onDragStartItem?.();
    });
  };

  const handleDragEnd = () => {
    clearGhost();
    onDragEndItem?.();
  };

  // Whole-row drop target via DOM listeners — JSX handlers on <li> trip
  // jsx-a11y/no-noninteractive-element-interactions.
  useEffect(() => {
    const row = rowRef.current;
    if (!(row && onDropItem)) {
      return;
    }

    const handleDragOver = (event: globalThis.DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
      onDragOverItem?.(dropEdgeFromEvent(event, row));
    };

    const handleDrop = (event: globalThis.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const sourceId = event.dataTransfer?.getData("text/plain");
      if (!sourceId) {
        return;
      }
      onDropItem(sourceId, dropEdgeFromEvent(event, row));
    };

    row.addEventListener("dragover", handleDragOver);
    row.addEventListener("drop", handleDrop);
    return () => {
      row.removeEventListener("dragover", handleDragOver);
      row.removeEventListener("drop", handleDrop);
    };
  }, [onDragOverItem, onDropItem]);

  const rowClass = [
    "report-photo-row",
    dragging ? "is-dragging" : "",
    dropEdge === "before" ? "is-drop-before" : "",
    dropEdge === "after" ? "is-drop-after" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={rowClass} data-photo-id={photo.id} ref={rowRef}>
      <div
        aria-label={`Drag to reorder photo ${index + 1}`}
        className="report-photo-drag"
        data-drag-handle="true"
        draggable
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        onTouchStart={onTouchStartItem}
        role="button"
        tabIndex={0}
      >
        <WaIcon library="iconoir" name="menu" label="Drag to sort" />
        <span className="report-photo-drag-label">Drag to reorder</span>
      </div>
      <button
        aria-label={`Annotate photo ${index + 1}`}
        className="report-photo-thumb-btn"
        onClick={() => onAnnotate(photo.id)}
        type="button"
      >
        <img alt="" className="report-photo-thumb" src={photo.previewUrl} />
        <span className="report-photo-thumb-hint">
          <WaIcon name="edit-pencil" label="" library="iconoir" />
          {photo.annotations ? "Edit markup" : "Annotate"}
        </span>
      </button>
      <div className="report-photo-body">
        <WaInput
          label="Caption"
          onInput={(event) => onCaptionChange(photo.id, waValue(event))}
          placeholder="Describe what this photo shows"
          value={photo.caption}
        >
          <DictationButton
            idToken={idToken}
            label="caption"
            onTranscript={(text) =>
              onCaptionChange(photo.id, appendDictation(photo.caption, text))
            }
            slot="end"
          />
        </WaInput>

        {sections.length > 0 ? (
          <WaSelect
            label="Section"
            onChange={(event) =>
              onSectionChange(photo.id, waValue(event) || null)
            }
            value={photo.sectionId ?? ""}
          >
            <WaOption value="">Ungrouped</WaOption>
            {sections.map((section) => (
              <WaOption key={section.id} value={section.id}>
                {section.title || "Untitled section"}
              </WaOption>
            ))}
          </WaSelect>
        ) : null}

        {photo.table ? (
          <TableEditor
            onTableChange={onTableChange}
            photoId={photo.id}
            table={photo.table}
          />
        ) : null}

        <div className="wa-cluster wa-gap-xs">
          <WaButton
            appearance="filled"
            className="action report-btn-show-label"
            onClick={() => onTableChange(photo.id, DEFAULT_TABLE)}
            size="small"
          >
            <WaIcon
              slot="start"
              name="plus"
              label="Add table"
              library="iconoir"
            />
            Add table
          </WaButton>
          <WaButton
            className="action"
            appearance="filled"
            aria-label={`Move photo ${index + 1} up`}
            disabled={index === 0}
            onClick={() => onMove(photo.id, -1)}
            size="small"
          >
            <WaIcon
              slot="start"
              name="arrow-up"
              label="Move photo up"
              library="default"
            />
          </WaButton>
          <WaButton
            className="action"
            appearance="filled"
            aria-label={`Move photo ${index + 1} down`}
            disabled={index === total - 1}
            onClick={() => onMove(photo.id, 1)}
            size="small"
          >
            <WaIcon
              slot="start"
              name="arrow-down"
              label="Move photo down"
              library="default"
            />
          </WaButton>
          <WaButton
            appearance="filled"
            variant="danger"
            aria-label={`Remove photo ${index + 1}`}
            onClick={() => onRemove(photo.id)}
            size="small"
          >
            <WaIcon
              slot="start"
              name="trash"
              label="Remove photo"
              library="default"
            />
          </WaButton>
        </div>
      </div>
    </li>
  );
};
