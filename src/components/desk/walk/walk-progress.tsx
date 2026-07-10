import {
  WALK_STATUS_ORDER,
  walkStatusShortLabels,
} from "../../../lib/desk-walk";
import type { WalkProgress } from "../../../lib/desk-walk";

/**
 * Sticky progress summary: "N of M knocked" plus a compact per-status
 * breakdown. Zero-count statuses are hidden to keep the field view scannable.
 */
export const WalkProgressBar = ({ progress }: { progress: WalkProgress }) => {
  const percent =
    progress.total === 0
      ? 0
      : Math.round((progress.knocked / progress.total) * 100);
  return (
    <div className="desk-walk-progress">
      <div className="desk-walk-progress__meter">
        <div className="desk-walk-progress__count">
          <strong>{progress.knocked}</strong>
          <span>of {progress.total} knocked</span>
        </div>
        <div aria-hidden className="desk-walk-progress__track">
          <span
            className="desk-walk-progress__fill"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <ul className="desk-walk-progress__legend">
        {WALK_STATUS_ORDER.filter(
          (status) => progress.byStatus[status] > 0
        ).map((status) => (
          <li
            className={`desk-walk-tally desk-walk-chip--${status}`}
            key={status}
          >
            <span className="desk-walk-tally__dot" />
            {walkStatusShortLabels[status]}
            <strong>{progress.byStatus[status]}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
};
