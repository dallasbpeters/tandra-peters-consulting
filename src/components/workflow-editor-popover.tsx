import type { WorkflowEditorState } from "../hooks/use-workflow-editor";

interface WorkflowEditorPopoverProps {
  editor: WorkflowEditorState;
  onChange: (next: WorkflowEditorState) => void;
  onClose: () => void;
  onSave: () => void;
}

export const WorkflowEditorPopover = ({
  editor,
  onClose,
  onSave,
  onChange,
}: WorkflowEditorPopoverProps) => (
  <dialog className="workflow-page__editor-popover" open>
    <h2 className="workflow-page__editor-title">
      {editor.kind === "edge" ? "Edit connection label" : "Edit workflow step"}
    </h2>

    {editor.kind === "edge" ? (
      <label className="workflow-page__editor-field">
        Label
        <input
          autoFocus
          className="workflow-page__editor-input"
          id="workflow-edge-label"
          name="workflow-edge-label"
          onChange={(e) => onChange({ ...editor, label: e.target.value })}
          placeholder="Connection label"
          value={editor.label}
        />
      </label>
    ) : (
      <>
        <label className="workflow-page__editor-field">
          Title
          <input
            autoFocus
            className="workflow-page__editor-input"
            id="workflow-step-title"
            name="workflow-step-title"
            onChange={(e) => onChange({ ...editor, title: e.target.value })}
            placeholder="Step title"
            value={editor.title}
          />
        </label>
        <label className="workflow-page__editor-field">
          Body
          <textarea
            className="workflow-page__editor-textarea"
            id="workflow-step-body"
            name="workflow-step-body"
            onChange={(e) => onChange({ ...editor, body: e.target.value })}
            placeholder="Step details"
            rows={5}
            value={editor.body}
          />
        </label>
      </>
    )}

    <div className="workflow-page__editor-actions">
      <button
        className="workflow-page__editor-button"
        onClick={onSave}
        type="button"
      >
        Apply
      </button>
      <button
        className="workflow-page__editor-button workflow-page__editor-button--ghost"
        onClick={onClose}
        type="button"
      >
        Cancel
      </button>
    </div>
  </dialog>
);
