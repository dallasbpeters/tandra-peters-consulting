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
import type { CSSProperties, ReactNode } from "react";

import { mix, theme } from "../theme";

const schemaDefinition = defineSchema({
  decorators: [{ name: "strong" }, { name: "em" }],
  annotations: [{ name: "link", fields: [{ name: "href", type: "string" }] }],
  styles: [
    { name: "normal" },
    { name: "h2" },
    { name: "h3" },
    { name: "blockquote" },
  ],
  lists: [{ name: "bullet" }, { name: "number" }],
  inlineObjects: [],
  blockObjects: [],
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
          display: "block",
          borderLeft: `3px solid ${mix(theme.colors.everglade, 30)}`,
          paddingLeft: 12,
          fontStyle: "italic",
          color: mix(theme.colors.everglade, 70),
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
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  padding: 6,
  borderBottom: `1px solid ${mix(theme.colors.everglade, 14)}`,
  backgroundColor: mix(theme.colors.everglade, 4),
};

const frameStyle: CSSProperties = {
  border: `1px solid ${mix(theme.colors.everglade, 18)}`,
  borderRadius: theme.radius.medium,
  backgroundColor: theme.colors.white,
  overflow: "hidden",
};

const editableStyle: CSSProperties = {
  minHeight: 200,
  padding: `${theme.spacing.md} ${theme.spacing.md}`,
  outline: "none",
  fontSize: "0.95rem",
  lineHeight: 1.6,
  color: theme.colors.everglade,
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
    style={{
      minWidth: 30,
      height: 30,
      padding: "0 8px",
      border: "none",
      borderRadius: theme.radius.small,
      backgroundColor: active ? theme.palette.accent["600"] : "transparent",
      color: active ? theme.colors.white : theme.colors.everglade,
      fontWeight: 700,
      fontSize: "0.85rem",
      cursor: "pointer",
      lineHeight: 1,
    }}
    title={title}
    type="button"
  >
    {children}
  </button>
);

const Toolbar = () => {
  const editor = useEditor();
  const bold = useEditorSelector(editor, isActiveDecorator("strong"));
  const italic = useEditorSelector(editor, isActiveDecorator("em"));
  const link = useEditorSelector(editor, isActiveAnnotation("link"));
  const h2 = useEditorSelector(editor, isActiveStyle("h2"));
  const h3 = useEditorSelector(editor, isActiveStyle("h3"));
  const blockquote = useEditorSelector(editor, isActiveStyle("blockquote"));
  const bullet = useEditorSelector(editor, isActiveListItem("bullet"));
  const number = useEditorSelector(editor, isActiveListItem("number"));

  const handleLink = () => {
    if (link) {
      editor.send({
        type: "annotation.toggle",
        annotation: { name: "link", value: { href: "" } },
      });
      return;
    }
    // biome-ignore lint/suspicious/noAlert: intentional browser prompt for link URL input
    const href = window.prompt("Link URL", "https://");
    if (!href) {
      return;
    }
    editor.send({
      type: "annotation.toggle",
      annotation: { name: "link", value: { href } },
    });
  };

  return (
    <div style={toolbarStyle}>
      <ToolbarButton
        active={bold}
        onClick={() =>
          editor.send({ type: "decorator.toggle", decorator: "strong" })
        }
        title="Bold"
      >
        B
      </ToolbarButton>
      <ToolbarButton
        active={italic}
        onClick={() =>
          editor.send({ type: "decorator.toggle", decorator: "em" })
        }
        title="Italic"
      >
        <span style={{ fontStyle: "italic" }}>I</span>
      </ToolbarButton>
      <ToolbarButton active={link} onClick={handleLink} title="Link">
        Link
      </ToolbarButton>
      <span
        style={{
          width: 1,
          backgroundColor: mix(theme.colors.everglade, 14),
          margin: "0 4px",
        }}
      />
      <ToolbarButton
        active={h2}
        onClick={() => editor.send({ type: "style.toggle", style: "h2" })}
        title="Heading"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        active={h3}
        onClick={() => editor.send({ type: "style.toggle", style: "h3" })}
        title="Subheading"
      >
        H3
      </ToolbarButton>
      <ToolbarButton
        active={blockquote}
        onClick={() =>
          editor.send({ type: "style.toggle", style: "blockquote" })
        }
        title="Quote"
      >
        &ldquo;
      </ToolbarButton>
      <span
        style={{
          width: 1,
          backgroundColor: mix(theme.colors.everglade, 14),
          margin: "0 4px",
        }}
      />
      <ToolbarButton
        active={bullet}
        onClick={() =>
          editor.send({ type: "list item.toggle", listItem: "bullet" })
        }
        title="Bulleted list"
      >
        •
      </ToolbarButton>
      <ToolbarButton
        active={number}
        onClick={() =>
          editor.send({ type: "list item.toggle", listItem: "number" })
        }
        title="Numbered list"
      >
        1.
      </ToolbarButton>
    </div>
  );
};

interface RichTextEditorProps {
  onChange: (blocks: PortableTextBlock[]) => void;
  placeholder?: string;
  value: PortableTextBlock[];
}

/** Styled Portable Text editor that emits Portable Text blocks (matches the email serializer). */
export const RichTextEditor = ({
  value,
  onChange,
  placeholder,
}: RichTextEditorProps) => (
  <EditorProvider initialConfig={{ schemaDefinition, initialValue: value }}>
    <div style={frameStyle}>
      <Toolbar />
      <PortableTextEditable
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

export default RichTextEditor;
