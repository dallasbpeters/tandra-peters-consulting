import type { WalkHome } from "../../../lib/desk-walk";
import { HomeRow } from "./home-row";

/** Scrollable list of homes for the walk (already filtered/sorted by parent). */
export const HomeRosterList = ({
  emptyLabel,
  fallbackHomeAge,
  homes,
  onOpen,
}: {
  emptyLabel: string;
  fallbackHomeAge: number | null;
  homes: readonly WalkHome[];
  onOpen: (homeKey: string) => void;
}) => {
  if (homes.length === 0) {
    return <p className="desk-empty">{emptyLabel}</p>;
  }
  return (
    <ul className="desk-walk-list">
      {homes.map((home) => (
        <li key={home.homeKey}>
          <HomeRow
            fallbackHomeAge={fallbackHomeAge}
            home={home}
            onOpen={onOpen}
          />
        </li>
      ))}
    </ul>
  );
};
