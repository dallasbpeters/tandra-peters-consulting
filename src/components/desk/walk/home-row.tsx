import { NavArrowRight } from "iconoir-react";

import { roofAgeYears, walkStatusShortLabels } from "../../../lib/desk-walk";
import type { WalkHome } from "../../../lib/desk-walk";

/** One tappable home row: address, roof-age chip, and current status pill. */
export const HomeRow = ({
  fallbackHomeAge,
  home,
  onOpen,
}: {
  fallbackHomeAge: number | null;
  home: WalkHome;
  onOpen: (homeKey: string) => void;
}) => {
  const age = roofAgeYears(home, fallbackHomeAge);
  return (
    <button
      className="desk-walk-row"
      onClick={() => onOpen(home.homeKey)}
      type="button"
    >
      <span className="desk-walk-row__body">
        <strong>{home.addressLine1}</strong>
        <span className="desk-walk-row__meta">
          {home.city}
          {home.zip ? ` · ${home.zip}` : ""}
          {age === null ? "" : ` · ${age} yr roof`}
        </span>
      </span>
      <span className="desk-walk-row__end">
        <span className={`desk-walk-pill desk-walk-chip--${home.status}`}>
          {walkStatusShortLabels[home.status]}
        </span>
        <NavArrowRight aria-hidden height={18} width={18} />
      </span>
    </button>
  );
};
