import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BlockPicker, type ColorResult } from "react-color";

import { BRAND_SWATCH_VALUES } from "../lib/adCreative";

/** Fixed BlockPicker width in px — needed up front to center on the trigger. */
const PICKER_WIDTH = 176;
/** Minimum gap kept between the panel and the viewport edges, in px. */
const VIEWPORT_MARGIN = 8;
/** Gap between the trigger button and the panel, in px. */
const ANCHOR_GAP = 12;

/** Dark theme for react-color's BlockPicker (defaults are white). */
const PICKER_STYLES = {
  default: {
    card: {
      background: "var(--studio-panel-raised, #1b2620)",
      boxShadow: "0 18px 40px rgb(0 0 0 / 55%)",
      borderRadius: "10px",
    },
    body: { padding: "12px" },
    input: {
      height: "1.9rem",
      background: "var(--studio-panel, #141c18)",
      boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 18%)",
      color: "var(--studio-text, #edf3ed)",
    },
  },
};

interface AdColorSwatchProps {
  /** Accessible name for the trigger button (e.g. "Text color"). */
  label: string;
  /** Called with the new hex when a preset is picked or typed in. */
  onChange: (hex: string) => void;
  /** Preset swatches shown in the picker; defaults to the brand palette. */
  presets?: string[];
  /** Current color as a hex string. */
  value: string;
}

/**
 * Color swatch button that opens a react-color BlockPicker. The panel is
 * rendered inline with `position: fixed` (NOT a body portal): fixed escapes
 * the context bar's overflow clipping, and staying inside the WaPopover's
 * top-layer <dialog> keeps it painting above the popover — a portaled panel
 * would be hidden underneath regardless of z-index. It flips above the
 * trigger when there is no room below.
 */
export const AdColorSwatch = ({
  label,
  value,
  onChange,
  presets = BRAND_SWATCH_VALUES,
}: AdColorSwatchProps) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [layout, setLayout] = useState({ left: 0, top: 0, below: true });

  const handleToggle = () => {
    const button = buttonRef.current;
    if (!button) {
      return;
    }
    if (open) {
      setOpen(false);
      return;
    }
    setAnchor(button.getBoundingClientRect());
    setOpen(true);
  };

  // Position once the picker has rendered so we can measure its real height
  // and flip above the trigger if it would run off the bottom of the screen.
  useLayoutEffect(() => {
    if (!(open && anchor)) {
      return;
    }
    const pop = popRef.current;
    if (!pop) {
      return;
    }

    const height = pop.offsetHeight;
    const left = Math.min(
      Math.max(
        anchor.left + anchor.width / 2 - PICKER_WIDTH / 2,
        VIEWPORT_MARGIN
      ),
      window.innerWidth - PICKER_WIDTH - VIEWPORT_MARGIN
    );

    let top = anchor.bottom + ANCHOR_GAP;
    let below = true;
    if (top + height > window.innerHeight - VIEWPORT_MARGIN) {
      top = Math.max(anchor.top - height - ANCHOR_GAP, VIEWPORT_MARGIN);
      below = false;
    }
    setLayout({ left, top, below });

    // react-color's hex input has no id/name and BlockPicker doesn't expose
    // its props, so name it here to satisfy Chrome's autofill audit.
    pop.querySelector("input")?.setAttribute("name", "ad-color-hex");
  }, [open, anchor]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (
        target &&
        (popRef.current?.contains(target) ||
          buttonRef.current?.contains(target))
      ) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        aria-expanded={open}
        aria-label={label}
        className={`ad-color-swatch${open ? "is-open" : ""}`}
        onClick={handleToggle}
        ref={buttonRef}
        title={label}
        type="button"
      >
        <span className="ad-color-swatch-chip" style={{ background: value }} />
      </button>

      {open ? (
        <div
          className="ad-color-pop"
          ref={popRef}
          style={{ left: layout.left, top: layout.top }}
        >
          <BlockPicker
            color={value}
            colors={presets}
            onChange={(color: ColorResult) => onChange(color.hex)}
            styles={PICKER_STYLES}
            triangle={layout.below ? "top" : "hide"}
            width={`${PICKER_WIDTH}px`}
          />
        </div>
      ) : null}
    </>
  );
};
