import type { AdCreativeVersion } from "../../hooks/use-ad-versions";
import { summarizeAdVersion } from "../../lib/desk-creative";
import { formatSavedCreativeDate } from "../../lib/desk-format";

export const CreativeVersionSelector = ({
  error,
  loading,
  onSelect,
  selectedVersion,
  versions,
}: {
  error: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  selectedVersion: AdCreativeVersion | null;
  versions: readonly AdCreativeVersion[];
}) => (
  <div className="desk-creative-selector">
    <div className="desk-creative-selector__heading">
      <span>Postcard front</span>
      <strong>Choose saved Ad Builder content.</strong>
    </div>
    {loading ? <p>Loading saved creative...</p> : null}
    {error ? <p className="desk-creative-selector__error">{error}</p> : null}
    {!loading && versions.length === 0 ? (
      <p>
        No saved Ad Builder versions yet. Save the postcard front in Ads first.
      </p>
    ) : null}
    {versions.length > 0 ? (
      <ul className="desk-creative-list" aria-label="Saved Ad Builder versions">
        {versions.map((version) => {
          const summary = summarizeAdVersion(version);
          const selected = version.id === selectedVersion?.id;
          return (
            <li key={version.id}>
              <button
                className={selected ? "is-selected" : ""}
                onClick={() => onSelect(version.id)}
                type="button"
              >
                {version.thumbnail ? (
                  // biome-ignore lint/correctness/useImageSize: saved canvas thumbnail has fluid card dimensions
                  <img alt="" src={version.thumbnail} />
                ) : (
                  <span className="desk-creative-list__placeholder" />
                )}
                <span className="desk-creative-list__copy">
                  <strong>{version.name}</strong>
                  <span>{formatSavedCreativeDate(version.savedAt)}</span>
                  {summary?.dimensions ? <em>{summary.dimensions}</em> : null}
                  {summary?.headline ? <small>{summary.headline}</small> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    ) : null}
  </div>
);
