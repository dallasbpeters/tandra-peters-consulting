import "react";

declare module "react" {
  // biome-ignore lint/style/noNamespace: TypeScript requires `namespace JSX` to augment React.JSX.IntrinsicElements — no namespace-free alternative exists
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        alt?: string;
        "camera-orbit"?: string;
        "camera-target"?: string;
        "field-of-view"?: string;
        "camera-controls"?: boolean | "";
        "interaction-prompt"?: "auto" | "none" | "when-focused";
        "touch-action"?: string;
        "auto-rotate"?: boolean | "";
        "auto-rotate-delay"?: number;
        ar?: boolean | "";
        poster?: string;
        loading?: "auto" | "lazy" | "eager";
      };
      "wa-icon": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      "wa-option": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      "wa-select": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      "wa-textarea": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
