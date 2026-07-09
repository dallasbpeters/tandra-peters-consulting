import { MoreHoriz } from "iconoir-react";
import type { CSSProperties, ReactNode } from "react";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export interface OverflowNavItem {
  href: string;
  name: string;
}

interface OverflowNavProps {
  align?: CSSProperties["justifyContent"];
  /** Extra px kept in reserve so the last visible item never touches the trigger. */
  buffer?: number;
  containerStyle?: CSSProperties;
  gap: number;
  items: readonly OverflowNavItem[];
  menuItemStyle?: CSSProperties;
  menuStyle?: CSSProperties;
  /** Styles the "more" trigger button. */
  moreButtonStyle?: CSSProperties;
  moreLabel?: ReactNode;
  renderItem: (item: OverflowNavItem, context: "inline" | "menu") => ReactNode;
}

interface MenuPosition {
  right: number;
  top: number;
}

const DEFAULT_MORE_WIDTH = 44;

const baseContainerStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "nowrap",
  minWidth: 0,
  overflow: "hidden",
  position: "relative",
  whiteSpace: "nowrap",
};

const measureRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "nowrap",
  left: -99_999,
  pointerEvents: "none",
  position: "absolute",
  top: 0,
  visibility: "hidden",
  whiteSpace: "nowrap",
};

const baseMenuStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: "12rem",
  position: "fixed",
  zIndex: 200,
};

/**
 * Priority+ navigation: renders links on one non-wrapping row and collapses any
 * that do not fit into a "…" dropdown, re-measuring on container resize.
 */
export const OverflowNav = ({
  align = "flex-start",
  buffer = 8,
  containerStyle,
  gap,
  items,
  menuItemStyle,
  menuStyle,
  moreButtonStyle,
  moreLabel,
  renderItem,
}: OverflowNavProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  const recompute = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!(container && measure)) {
      return;
    }
    const available = container.clientWidth;
    const widths = [...measure.children].map(
      (child) => child.getBoundingClientRect().width
    );
    const totalAll = widths.reduce(
      (sum, width, index) => sum + width + (index > 0 ? gap : 0),
      0
    );
    if (totalAll <= available) {
      setVisibleCount(items.length);
      return;
    }
    const moreWidth =
      (moreRef.current?.getBoundingClientRect().width ?? DEFAULT_MORE_WIDTH) +
      gap +
      buffer;
    let used = 0;
    let count = 0;
    for (let index = 0; index < widths.length; index++) {
      const next = used + widths[index] + (index > 0 ? gap : 0);
      if (next + moreWidth <= available) {
        used = next;
        count += 1;
      } else {
        break;
      }
    }
    setVisibleCount(count);
  }, [buffer, gap, items.length]);

  useLayoutEffect(() => {
    recompute();
  }, [recompute]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const observer = new ResizeObserver(() => recompute());
    observer.observe(container);
    return () => observer.disconnect();
  }, [recompute]);

  const updateMenuPosition = useCallback(() => {
    const trigger = moreRef.current;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    setMenuPosition({
      right: Math.max(8, window.innerWidth - rect.right),
      top: rect.bottom + 8,
    });
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    updateMenuPosition();
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !(
          menuRef.current?.contains(target) || moreRef.current?.contains(target)
        )
      ) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    const handleReflow = () => updateMenuPosition();
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleReflow);
    window.addEventListener("scroll", handleReflow, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleReflow);
      window.removeEventListener("scroll", handleReflow, true);
    };
  }, [menuOpen, updateMenuPosition]);

  const visibleItems = items.slice(0, visibleCount);
  const overflowItems = useMemo(
    () => items.slice(visibleCount),
    [items, visibleCount]
  );
  const hasOverflow = overflowItems.length > 0;

  useEffect(() => {
    if (!hasOverflow) {
      setMenuOpen(false);
    }
  }, [hasOverflow]);

  return (
    <div
      ref={containerRef}
      style={{
        ...baseContainerStyle,
        gap,
        justifyContent: align,
        ...containerStyle,
      }}
    >
      <div aria-hidden ref={measureRef} style={{ ...measureRowStyle, gap }}>
        {items.map((item) => (
          <div key={item.href}>{renderItem(item, "inline")}</div>
        ))}
      </div>

      {visibleItems.map((item) => (
        <Fragment key={item.href}>{renderItem(item, "inline")}</Fragment>
      ))}

      {hasOverflow ? (
        <button
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="More navigation links"
          onClick={() => setMenuOpen((open) => !open)}
          ref={moreRef}
          style={{
            alignItems: "center",
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexShrink: 0,
            padding: "0.25rem 0.5rem",
            ...moreButtonStyle,
          }}
          type="button"
        >
          {moreLabel ?? <MoreHoriz aria-hidden height={20} width={20} />}
        </button>
      ) : null}

      {hasOverflow && menuOpen && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{
                ...baseMenuStyle,
                right: menuPosition.right,
                top: menuPosition.top,
                ...menuStyle,
              }}
            >
              {overflowItems.map((item) => (
                <div
                  key={item.href}
                  onClick={() => setMenuOpen(false)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      setMenuOpen(false);
                    }
                  }}
                  role="none"
                  style={{ display: "flex", ...menuItemStyle }}
                >
                  {renderItem(item, "menu")}
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
};
