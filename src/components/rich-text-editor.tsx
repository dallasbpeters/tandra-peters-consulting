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
        annotation: { name: "link", value: { href: "" } },
        type: "annotation.toggle",
      });
      return;
    }
    // biome-ignore lint/suspicious/noAlert: intentional browser prompt for link URL input
    const href = window.prompt("Link URL", "https://");
    if (!href) {
      return;
    }
    editor.send({
      annotation: { name: "link", value: { href } },
      type: "annotation.toggle",
    });
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
  <EditorProvider initialConfig={{ initialValue: value, schemaDefinition }}>
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
