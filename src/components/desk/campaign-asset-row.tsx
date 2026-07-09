import type { CampaignAsset, DeskBoardStatusValue } from "../../lib/desk-types";
import { TransitionLink } from "../transition-link";
import { StatusToggleButton } from "./action-row";

export const CampaignAssetRow = ({
  asset,
  busy,
  onToggle,
  status,
}: {
  asset: CampaignAsset;
  busy: boolean;
  onToggle: () => void;
  status: DeskBoardStatusValue;
}) => {
  const done = status === "done";
  return (
    <li className={done ? " desk-asset desk-asset--done" : "desk-asset"}>
      <StatusToggleButton busy={busy} done={done} onToggle={onToggle} />
      <div>
        <strong>{asset.label}</strong>
        <span>{asset.status}</span>
      </div>
      <TransitionLink className="desk-text-link" to={asset.href}>
        {asset.action}
      </TransitionLink>
    </li>
  );
};
