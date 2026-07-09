import { formatNumber } from "../../lib/desk-format";
import { rentcastPreviewNote } from "../../lib/desk-postcard";
import type {
  DeskAreaTarget,
  DirectMailPlanResponse,
} from "../../lib/desk-types";
import { neighborhoodLabelOf } from "./neighborhood-row";

export const CapturedAreasPreview = ({
  plan,
  selectedTargets,
}: {
  plan: DirectMailPlanResponse | null;
  selectedTargets: readonly DeskAreaTarget[];
}) => {
  const totalPieces = selectedTargets.reduce(
    (sum, target) => sum + target.recommendedMailerCount,
    0
  );
  const sampleAddresses = plan?.rentcast.sampleAddresses ?? [];
  return (
    <div className="desk-audience-preview">
      <div className="desk-audience-preview__head">
        <span>Addresses in this mailing</span>
        <strong>
          {formatNumber(selectedTargets.length)}{" "}
          {selectedTargets.length === 1 ? "area" : "areas"} ·{" "}
          {formatNumber(totalPieces)} homes
        </strong>
      </div>
      <ul
        aria-label="Captured mailing areas"
        className="desk-audience-preview__areas"
      >
        {selectedTargets.map((target) => (
          <li key={target.id}>
            <span className="desk-audience-preview__area-name">
              <strong>{neighborhoodLabelOf(target)}</strong>
              <em>
                {[
                  target.mailingCity,
                  target.postalCode,
                  target.mailingRouteName,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </em>
            </span>
            <span className="desk-audience-preview__count">
              {formatNumber(target.recommendedMailerCount)}
            </span>
          </li>
        ))}
      </ul>
      {plan && sampleAddresses.length > 0 ? (
        <details className="desk-audience-preview__addresses">
          <summary>
            {formatNumber(plan.rentcast.recipientReadyCount)} matched addresses
            (showing {sampleAddresses.length})
          </summary>
          <ul>
            {sampleAddresses.map((address) => (
              <li key={address}>{address}</li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="desk-audience-preview__note">
          {plan
            ? rentcastPreviewNote(plan.rentcast.status)
            : "Prepare the batch to match individual mailing addresses inside these areas."}
        </p>
      )}
    </div>
  );
};
