import type { CSSProperties, ReactNode } from "react";

import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type PortableTextBlock,
  type RenderAnnotationFunction,
  type RenderDecoratorFunction,
  type RenderListItemFunction,
  type RenderStyleFunction,
  useEditor,
  useEditorSelector,
} from "@portabletext/editor";
import { EventListenerPlugin } from "@portabletext/editor/plugins";
import * as selectors from "@portabletext/editor/selectors";

import { mix, theme } from "../theme";

const schemaDefinition = defineSchema({
  decorators: [{ name: "strong" }, { name: "em" }],
  annotations: [{ name: "link", fields: [{ name: "href", type: "string" }] }],
  styles: [{ name: "normal" }, { name: "h2" }, { name: "h3" }, { name: "blockquote" }],
  lists: [{ name: "bullet" }, { name: "number" }],
  inlineObjects: [],
  blockObjects: [],
});

const renderDecorator: RenderDecoratorFunction = ({ value, children }) => {
  if (value === "strong") return <strong>{children}</strong>;
  if (value === "em") return <em>{children}</em>;
  return <>{children}</>;
};

const renderStyle: RenderStyleFunction = ({ value, children }) => {
  if (value === "h2") {
    return (
      <span style={{ display: "block", fontSize: "1.3rem", fontWeight: 700 }}>{children}</span>
    );
  }
  if (value === "h3") {
    return (
      <span style={{ display: "block", fontSize: "1.1rem", fontWeight: 700 }}>{children}</span>
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
  <span style={{ color: theme.palette.accent["700"], textDecoration: "underline" }}>
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
    type="button"
    title={title}
    aria-label={title}
    aria-pressed={active}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
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
  >
    {children}
  </button>
);

const Toolbar = () => {
  const editor = useEditor();
  const bold = useEditorSelector(editor, selectors.isActiveDecorator("strong"));
  const italic = useEditorSelector(editor, selectors.isActiveDecorator("em"));
  const link = useEditorSelector(editor, selectors.isActiveAnnotation("link"));
  const h2 = useEditorSelector(editor, selectors.isActiveStyle("h2"));
  const h3 = useEditorSelector(editor, selectors.isActiveStyle("h3"));
  const blockquote = useEditorSelector(editor, selectors.isActiveStyle("blockquote"));
  const bullet = useEditorSelector(editor, selectors.isActiveListItem("bullet"));
  const number = useEditorSelector(editor, selectors.isActiveListItem("number"));

  const handleLink = () => {
    if (link) {
      editor.send({ type: "annotation.toggle", annotation: { name: "link", value: { href: "" } } });
      return;
    }
    const href = window.prompt("Link URL", "https://");
    if (!href) return;
    editor.send({ type: "annotation.toggle", annotation: { name: "link", value: { href } } });
  };

  return (
    <div style={toolbarStyle}>
      <ToolbarButton
        active={bold}
        title="Bold"
        onClick={() => editor.send({ type: "decorator.toggle", decorator: "strong" })}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        active={italic}
        title="Italic"
        onClick={() => editor.send({ type: "decorator.toggle", decorator: "em" })}
      >
        <span style={{ fontStyle: "italic" }}>I</span>
      </ToolbarButton>
      <ToolbarButton active={link} title="Link" onClick={handleLink}>
        Link
      </ToolbarButton>
      <span
        style={{ width: 1, backgroundColor: mix(theme.colors.everglade, 14), margin: "0 4px" }}
      />
      <ToolbarButton
        active={h2}
        title="Heading"
        onClick={() => editor.send({ type: "style.toggle", style: "h2" })}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        active={h3}
        title="Subheading"
        onClick={() => editor.send({ type: "style.toggle", style: "h3" })}
      >
        H3
      </ToolbarButton>
      <ToolbarButton
        active={blockquote}
        title="Quote"
        onClick={() => editor.send({ type: "style.toggle", style: "blockquote" })}
      >
        &ldquo;
      </ToolbarButton>
      <span
        style={{ width: 1, backgroundColor: mix(theme.colors.everglade, 14), margin: "0 4px" }}
      />
      <ToolbarButton
        active={bullet}
        title="Bulleted list"
        onClick={() => editor.send({ type: "list item.toggle", listItem: "bullet" })}
      >
        •
      </ToolbarButton>
      <ToolbarButton
        active={number}
        title="Numbered list"
        onClick={() => editor.send({ type: "list item.toggle", listItem: "number" })}
      >
        1.
      </ToolbarButton>
    </div>
  );
};

type RichTextEditorProps = {
  value: PortableTextBlock[];
  onChange: (blocks: PortableTextBlock[]) => void;
  placeholder?: string;
};

/** Styled Portable Text editor that emits Portable Text blocks (matches the email serializer). */
export const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => (
  <EditorProvider initialConfig={{ schemaDefinition, initialValue: value }}>
    <div style={frameStyle}>
      <Toolbar />
      <PortableTextEditable
        style={editableStyle}
        renderDecorator={renderDecorator}
        renderStyle={renderStyle}
        renderListItem={renderListItem}
        renderAnnotation={renderAnnotation}
        renderPlaceholder={() =>
          placeholder ? (
            <span style={{ color: mix(theme.colors.everglade, 45) }}>{placeholder}</span>
          ) : null
        }
      />
    </div>
    <EventListenerPlugin
      on={(event) => {
        if (event.type === "mutation") onChange(event.value ?? []);
      }}
    />
  </EditorProvider>
);

export default RichTextEditor;
