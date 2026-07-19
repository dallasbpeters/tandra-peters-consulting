import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaIcon from "@awesome.me/webawesome/dist/react/icon/index.js";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaOption from "@awesome.me/webawesome/dist/react/option/index.js";
import WaSelect from "@awesome.me/webawesome/dist/react/select/index.js";
import { NavArrowDown, NavArrowUp, Plus, Trash, Xmark } from "iconoir-react";

import { appendDictation } from "../../hooks/use-dictation";
import type {
  DetailsTable,
  PhotoItem,
  SectionHeading,
} from "../../lib/report-pdf/types";
import { DictationButton } from "./dictation-button";
import { waValue } from "./wa-value";

interface PhotoItemEditorProps {
  /** Google ID token forwarded to the auth-gated dictation route. */
  idToken: string;
  index: number;
  onCaptionChange: (id: string, caption: string) => void;
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
                  appearance="filled"
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
        <WaIcon slot="start" name="plus" label="Add row" library="iconoir" />
        Add row
      </WaButton>
      <WaButton
        appearance="filled"
        className="report-btn-show-label"
        onClick={() => onTableChange(photoId, addColumn(table))}
        size="small"
      >
        <WaIcon slot="start" name="plus" label="Add column" library="iconoir" />
        Add column
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
          <WaIcon
            slot="start"
            name="xmark"
            label="Remove column"
            library="iconoir"
          />
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

export const PhotoItemEditor = ({
  idToken,
  index,
  onCaptionChange,
  onMove,
  onRemove,
  onSectionChange,
  onTableChange,
  photo,
  sections,
  total,
}: PhotoItemEditorProps) => (
  <li className="report-photo-row">
    <img alt="" className="report-photo-thumb" src={photo.previewUrl} />
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
      ) : (
        <div className="report-photo-controls">
          <WaButton
            appearance="filled"
            className="report-btn-show-label"
            onClick={() => onTableChange(photo.id, DEFAULT_TABLE)}
            size="small"
          >
            <WaIcon
              slot="start"
              name="plus"
              label="Add details table"
              library="iconoir"
            />
            Add details table
          </WaButton>
        </div>
      )}

      <div className="report-photo-controls">
        <WaButton
          appearance="filled"
          className="report-btn-show-label"
          aria-label={`Move photo ${index + 1} up`}
          disabled={index === 0}
          onClick={() => onMove(photo.id, -1)}
          size="small"
        >
          <WaIcon
            slot="start"
            name="arrow-up"
            label="Move photo up"
            library="iconoir"
          />
          Move up
        </WaButton>
        <WaButton
          appearance="filled"
          className="report-btn-show-label"
          aria-label={`Move photo ${index + 1} down`}
          disabled={index === total - 1}
          onClick={() => onMove(photo.id, 1)}
          size="small"
        >
          <WaIcon
            slot="start"
            name="arrow-down"
            label="Move photo down"
            library="iconoir"
          />
          Move down
        </WaButton>
        <WaButton
          appearance="filled"
          className="report-btn-show-label"
          variant="danger"
          aria-label={`Remove photo ${index + 1}`}
          onClick={() => onRemove(photo.id)}
          size="small"
        >
          <WaIcon
            slot="start"
            name="trash"
            label="Remove photo"
            library="iconoir"
          />
          Remove photo
        </WaButton>
      </div>
    </div>
  </li>
);
