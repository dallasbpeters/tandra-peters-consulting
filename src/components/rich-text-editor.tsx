import {
  defineSchema,
  EditorProvider,
  type PortableTextBlock,
  PortableTextEditable,
  type RenderAnnotationFunction,
  type RenderDecoratorFunction,
  type RenderListItemFunction,
  type RenderStyleFunction,
  useEditor,
  useEditorSelector,
} from "@portabletext/editor";
import { EventListenerPlugin } from "@portabletext/editor/plugins";
import {
  isActiveAnnotation,
  isActiveDecorator,
  isActiveListItem,
  isActiveStyle,
} from "@portabletext/editor/selectors";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { mix, theme } from "../theme";

const schemaDefinition = defineSchema({
  annotations: [{ fields: [{ name: "href", type: "string" }], name: "link" }],
  blockObjects: [],
  decorators: [{ name: "strong" }, { name: "em" }],
  inlineObjects: [],
  lists: [{ name: "bullet" }, { name: "number" }],
  styles: [
    { name: "normal" },
    { name: "h2" },
    { name: "h3" },
    { name: "blockquote" },
  ],
});

const renderDecorator: RenderDecoratorFunction = ({ value, children }) => {
  if (value === "strong") {
    return <strong>{children}</strong>;
  }
  if (value === "em") {
    return <em>{children}</em>;
  }
  return <>{children}</>;
};

const renderStyle: RenderStyleFunction = ({ value, children }) => {
  if (value === "h2") {
    return (
      <span style={{ display: "block", fontSize: "1.3rem", fontWeight: 700 }}>
        {children}
      </span>
    );
  }
  if (value === "h3") {
    return (
      <span style={{ display: "block", fontSize: "1.1rem", fontWeight: 700 }}>
        {children}
      </span>
    );
  }
  if (value === "blockquote") {
    return (
      <span
        style={{
          borderLeft: `3px solid ${mix(theme.colors.everglade, 30)}`,
          color: mix(theme.colors.everglade, 70),
          display: "block",
          fontStyle: "italic",
          paddingLeft: 12,
        }}
      >
        {children}
      </span>
    );
  }
  return <>{children}</>;
};

const renderListItem: RenderListItemFunction = ({ value, children }) => (
  <span
    style={{
      display: "list-item",
      listStyleType: value === "number" ? "decimal" : "disc",
      marginLeft: "1.3em",
    }}
  >
    {children}
  </span>
);

const renderAnnotation: RenderAnnotationFunction = ({ children }) => (
  <span
    style={{ color: theme.palette.accent["700"], textDecoration: "underline" }}
  >
    {children}
  </span>
);

const toolbarStyle: CSSProperties = {
  backgroundColor: mix(theme.colors.everglade, 4),
  borderBottom: `1px solid ${mix(theme.colors.everglade, 14)}`,
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  padding: 6,
};

const linkFormStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  minWidth: 260,
};

const linkInputStyle: CSSProperties = {
  backgroundColor: theme.colors.white,
  border: `1px solid ${mix(theme.colors.everglade, 20)}`,
  borderRadius: theme.radius.small,
  color: theme.colors.everglade,
  flex: "1 1 11rem",
  fontSize: "0.85rem",
  height: 30,
  minWidth: 0,
  padding: "0 8px",
};

const linkLabelStyle: CSSProperties = {
  color: mix(theme.colors.everglade, 72),
  fontSize: "0.75rem",
  fontWeight: 800,
  marginLeft: 4,
};

const frameStyle: CSSProperties = {
  backgroundColor: theme.colors.white,
  border: `1px solid ${mix(theme.colors.everglade, 18)}`,
  borderRadius: theme.radius.medium,
  overflow: "hidden",
};

const editableStyle: CSSProperties = {
  color: theme.colors.everglade,
  fontSize: "0.95rem",
  lineHeight: 1.6,
  minHeight: 200,
  outline: "none",
  padding: `${theme.spacing.md} ${theme.spacing.md}`,
};

const ToolbarButton = ({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) => (
  <button
    aria-label={title}
    aria-pressed={active}
    onClick={onClick}
    onMouseDown={(e) => e.preventDefault()}
    onPointerDown={(e) => e.preventDefault()}
    style={{
      backgroundColor: active ? theme.palette.accent["600"] : "transparent",
      border: "none",
      borderRadius: theme.radius.small,
      color: active ? theme.colors.white : theme.colors.everglade,
      cursor: "pointer",
      fontSize: "0.85rem",
      fontWeight: 700,
      height: 30,
      lineHeight: 1,
      minWidth: 30,
      padding: "0 8px",
    }}
    tabIndex={-1}
    title={title}
    type="button"
  >
    {children}
  </button>
);

const LinkUrlForm = ({
  inputRef,
  onCancel,
  onChange,
  onSubmit,
  value,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  value: string;
}) => {
  const inputId = useId();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      style={linkFormStyle}
    >
      <label htmlFor={inputId} style={linkLabelStyle}>
        Link URL
      </label>
      <input
        id={inputId}
        onChange={(event) => onChange(event.currentTarget.value)}
        ref={inputRef}
        style={linkInputStyle}
        type="url"
        value={value}
      />
      <ToolbarButton active={false} onClick={onSubmit} title="Apply link">
        Apply
      </ToolbarButton>
      <ToolbarButton active={false} onClick={onCancel} title="Cancel link">
        Cancel
      </ToolbarButton>
    </form>
  );
};

const Toolbar = () => {
  const editor = useEditor();
  const linkInputRef = useRef<HTMLInputElement | null>(null);
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("https://");
  const bold = useEditorSelector(editor, isActiveDecorator("strong"));
  const italic = useEditorSelector(editor, isActiveDecorator("em"));
  const link = useEditorSelector(editor, isActiveAnnotation("link"));
  const h2 = useEditorSelector(editor, isActiveStyle("h2"));
  const h3 = useEditorSelector(editor, isActiveStyle("h3"));
  const blockquote = useEditorSelector(editor, isActiveStyle("blockquote"));
  const bullet = useEditorSelector(editor, isActiveListItem("bullet"));
  const number = useEditorSelector(editor, isActiveListItem("number"));

  useEffect(() => {
    if (linkEditorOpen) {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    }
  }, [linkEditorOpen]);

  const handleLink = () => {
    if (link) {
      editor.send({
        annotation: { name: "link", value: { href: "" } },
        type: "annotation.toggle",
      });
      return;
    }
    setLinkDraft("https://");
    setLinkEditorOpen(true);
  };

  const handleApplyLink = () => {
    const href = linkDraft.trim();
    if (!href) {
      setLinkEditorOpen(false);
      return;
    }
    editor.send({
      annotation: { name: "link", value: { href } },
      type: "annotation.toggle",
    });
    setLinkEditorOpen(false);
  };

  return (
    <div style={toolbarStyle}>
      <ToolbarButton
        active={bold}
        onClick={() =>
          editor.send({ decorator: "strong", type: "decorator.toggle" })
        }
        title="Bold"
      >
        B
      </ToolbarButton>
      <ToolbarButton
        active={italic}
        onClick={() =>
          editor.send({ decorator: "em", type: "decorator.toggle" })
        }
        title="Italic"
      >
        <span style={{ fontStyle: "italic" }}>I</span>
      </ToolbarButton>
      <ToolbarButton active={link} onClick={handleLink} title="Link">
        Link
      </ToolbarButton>
      {linkEditorOpen ? (
        <LinkUrlForm
          inputRef={linkInputRef}
          onCancel={() => setLinkEditorOpen(false)}
          onChange={setLinkDraft}
          onSubmit={handleApplyLink}
          value={linkDraft}
        />
      ) : null}
      <span
        style={{
          backgroundColor: mix(theme.colors.everglade, 14),
          margin: "0 4px",
          width: 1,
        }}
      />
      <ToolbarButton
        active={h2}
        onClick={() => editor.send({ style: "h2", type: "style.toggle" })}
        title="Heading"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        active={h3}
        onClick={() => editor.send({ style: "h3", type: "style.toggle" })}
        title="Subheading"
      >
        H3
      </ToolbarButton>
      <ToolbarButton
        active={blockquote}
        onClick={() =>
          editor.send({ style: "blockquote", type: "style.toggle" })
        }
        title="Quote"
      >
        &ldquo;
      </ToolbarButton>
      <span
        style={{
          backgroundColor: mix(theme.colors.everglade, 14),
          margin: "0 4px",
          width: 1,
        }}
      />
      <ToolbarButton
        active={bullet}
        onClick={() =>
          editor.send({ listItem: "bullet", type: "list item.toggle" })
        }
        title="Bulleted list"
      >
        •
      </ToolbarButton>
      <ToolbarButton
        active={number}
        onClick={() =>
          editor.send({ listItem: "number", type: "list item.toggle" })
        }
        title="Numbered list"
      >
        1.
      </ToolbarButton>
    </div>
  );
};

interface RichTextEditorProps {
  ariaLabel?: string;
  onChange: (blocks: PortableTextBlock[]) => void;
  placeholder?: string;
  value: PortableTextBlock[];
}

/** Styled Portable Text editor that emits Portable Text blocks (matches the email serializer). */
export const RichTextEditor = ({
  value,
  onChange,
  placeholder,
  ariaLabel = "Email body",
}: RichTextEditorProps) => {
  // Stable reference — EditorProvider reinitializes when initialConfig reference changes
  // (React compiler cache check), so a new object literal each render causes the editor
  // to remount on every keystroke, immediately losing focus to the first toolbar button.
  const initialConfig = useRef({
    initialValue: value.length > 0 ? value : undefined,
    schemaDefinition,
  });

  return (
    <EditorProvider initialConfig={initialConfig.current}>
      <div style={frameStyle}>
        <Toolbar />
        <PortableTextEditable
          aria-label={ariaLabel}
          renderAnnotation={renderAnnotation}
          renderDecorator={renderDecorator}
          renderListItem={renderListItem}
          renderPlaceholder={() =>
            placeholder ? (
              <span style={{ color: mix(theme.colors.everglade, 45) }}>
                {placeholder}
              </span>
            ) : null
          }
          renderStyle={renderStyle}
          style={editableStyle}
        />
      </div>
      <EventListenerPlugin
        on={(event) => {
          if (event.type === "mutation") {
            onChange(event.value ?? []);
          }
        }}
      />
    </EditorProvider>
  );
};

export default RichTextEditor;
