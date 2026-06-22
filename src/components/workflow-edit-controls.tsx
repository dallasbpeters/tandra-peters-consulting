import type { SaveStatus } from "../hooks/use-workflow-editor";

interface WorkflowEditControlsProps {
  hasUnsavedChanges: boolean;
  isEditMode: boolean;
  onRemoveSelected: () => void;
  onSave: () => void;
  onToggleEditMode: () => void;
  saveStatus: SaveStatus;
  selectedNodeIds: string[];
}

export const WorkflowEditControls = ({
  hasUnsavedChanges,
  isEditMode,
  saveStatus,
  selectedNodeIds,
  onRemoveSelected,
  onSave,
  onToggleEditMode,
}: WorkflowEditControlsProps) => (
  <div className="workflow-page__edit-controls">
    <button
      aria-pressed={isEditMode}
      className="workflow-page__edit-toggle"
      onClick={onToggleEditMode}
      type="button"
    >
      {isEditMode ? "Editing on" : "Editing off"}
    </button>
    {isEditMode ? (
      <>
        <button
          className="workflow-page__save"
          disabled={saveStatus === "saving" || !hasUnsavedChanges}
          onClick={onSave}
          type="button"
        >
          {saveStatus === "saving" ? "Saving…" : "Save changes"}
        </button>
        <button
          className="workflow-page__remove-node"
          disabled={selectedNodeIds.length === 0}
          onClick={onRemoveSelected}
          type="button"
        >
          Remove selected node
        </button>
      </>
    ) : null}
  </div>
);
