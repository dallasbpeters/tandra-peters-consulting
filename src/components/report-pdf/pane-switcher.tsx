import type { KeyboardEvent, ReactNode, TouchEvent } from "react";
import { useId, useRef, useState } from "react";

import { useIsMobile } from "../../hooks/is-mobile";

interface PaneSwitcherProps {
  editor: ReactNode;
  editorLabel?: string;
  preview: ReactNode;
  previewLabel?: string;
}

const SWIPE_THRESHOLD = 45;

export const PaneSwitcher = ({
  editor,
  editorLabel = "Editor",
  preview,
  previewLabel = "Preview",
}: PaneSwitcherProps) => {
  const isMobile = useIsMobile(900);
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  const panes = [
    { content: editor, label: editorLabel },
    { content: preview, label: previewLabel },
  ];

  const tabId = (index: number) => `${baseId}-tab-${index}`;
  const panelId = (index: number) => `${baseId}-panel-${index}`;

  const focusTab = (index: number) => {
    setActive(index);
    tabRefs.current[index]?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusTab(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusTab(0);
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) {
      return;
    }
    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (delta <= -SWIPE_THRESHOLD) {
      setActive(1);
    } else if (delta >= SWIPE_THRESHOLD) {
      setActive(0);
    }
    touchStartX.current = null;
  };

  if (!isMobile) {
    return (
      <div className="report-panes report-panes--split">
        <div className="report-panes-track">
          {panes.map((pane) => (
            <section
              aria-label={pane.label}
              className="report-pane"
              key={pane.label}
            >
              {pane.content}
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="report-panes">
      <div className="report-tablist-wrapper">
        <div aria-label="Report view" className="report-tablist" role="tablist">
          {panes.map((pane, index) => (
            <button
              aria-controls={panelId(index)}
              aria-selected={active === index}
              className="report-tab"
              id={tabId(index)}
              key={pane.label}
              onClick={() => setActive(index)}
              onKeyDown={handleTabKeyDown}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              role="tab"
              tabIndex={active === index ? 0 : -1}
              type="button"
            >
              {pane.label}
            </button>
          ))}
        </div>
      </div>
      <div
        className="report-panes-viewport"
        onTouchEnd={handleTouchEnd}
        onTouchStart={handleTouchStart}
      >
        <div
          className="report-panes-track"
          style={{ transform: `translateX(-${active * 50}%)` }}
        >
          {panes.map((pane, index) => (
            <div
              aria-hidden={active !== index}
              aria-labelledby={tabId(index)}
              className="report-pane"
              id={panelId(index)}
              key={pane.label}
              role="tabpanel"
            >
              {pane.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
