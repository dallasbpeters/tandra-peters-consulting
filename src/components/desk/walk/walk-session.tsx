import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaOption from "@awesome.me/webawesome/dist/react/option/index.js";
import WaSelect from "@awesome.me/webawesome/dist/react/select/index.js";
import { CheckCircle, Cloud, List, MapPin, NavArrowLeft } from "iconoir-react";
import { useCallback, useMemo, useState } from "react";

import { useGoogleDashboardAuth } from "../../../context/dashboard-auth-context";
import { useWalkHomes } from "../../../hooks/use-walk-homes";
import { averageValue, waFieldValue } from "../../../lib/desk-format";
import type { AuthHeader, CanvassTargetRecord } from "../../../lib/desk-types";
import {
  summarizeWalk,
  WALK_STATUS_ORDER,
  walkStatusLabels,
} from "../../../lib/desk-walk";
import type { WalkStatus } from "../../../lib/desk-walk";
import { TransitionLink } from "../../transition-link";
import { HomeDetailSheet } from "./home-detail-sheet";
import { HomeMap } from "./home-map";
import { HomeRosterList } from "./home-roster-list";
import { WalkProgressBar } from "./walk-progress";

type StatusFilter = "all" | WalkStatus;
type WalkView = "list" | "map";

const CURRENT_YEAR = new Date().getFullYear();

const fallbackHomeAgeFor = (target: CanvassTargetRecord): number | null =>
  averageValue(
    target.neighborhoods.map((neighborhood) => {
      if (typeof neighborhood.medianHomeAge === "number") {
        return neighborhood.medianHomeAge;
      }
      return typeof neighborhood.medianYearBuilt === "number"
        ? CURRENT_YEAR - neighborhood.medianYearBuilt
        : null;
    })
  );

/**
 * Walk orchestrator: sticky progress header, list⇄map toggle, status filter,
 * and the per-home detail sheet. Mobile-first — the list and chips are the
 * primary field surface; the map is a colored-pin overview.
 */
export const WalkSession = ({
  auth,
  target,
}: {
  auth: ReturnType<typeof useGoogleDashboardAuth>;
  target: CanvassTargetRecord;
}) => {
  const authHeader = useMemo<AuthHeader>(
    () => (auth.token ? { Authorization: `Bearer ${auth.token}` } : null),
    [auth.token]
  );
  const {
    capped,
    error,
    homes,
    isLoading,
    isOffline,
    pendingCount,
    saveVisit,
    total,
  } = useWalkHomes(authHeader, target);

  const [view, setView] = useState<WalkView>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedHomeKey, setSelectedHomeKey] = useState<string | null>(null);

  const fallbackHomeAge = useMemo(() => fallbackHomeAgeFor(target), [target]);
  const progress = useMemo(() => summarizeWalk(homes), [homes]);

  const filteredHomes = useMemo(
    () =>
      statusFilter === "all"
        ? homes
        : homes.filter((home) => home.status === statusFilter),
    [homes, statusFilter]
  );

  const orderKeys = useMemo(
    () => filteredHomes.map((home) => home.homeKey),
    [filteredHomes]
  );
  const activeHome = useMemo(
    () => homes.find((home) => home.homeKey === selectedHomeKey) ?? null,
    [homes, selectedHomeKey]
  );
  const activeIndex = activeHome ? orderKeys.indexOf(activeHome.homeKey) : -1;

  const openHome = useCallback((homeKey: string) => {
    setSelectedHomeKey(homeKey);
  }, []);
  const closeHome = useCallback(() => setSelectedHomeKey(null), []);
  const goPrev = useCallback(() => {
    if (activeIndex > 0) {
      setSelectedHomeKey(orderKeys[activeIndex - 1]);
    }
  }, [activeIndex, orderKeys]);
  const goNext = useCallback(() => {
    if (activeIndex >= 0 && activeIndex < orderKeys.length - 1) {
      setSelectedHomeKey(orderKeys[activeIndex + 1]);
    }
  }, [activeIndex, orderKeys]);

  const emptyLabel =
    statusFilter === "all"
      ? "No homes matched this area yet."
      : `No homes are marked "${walkStatusLabels[statusFilter]}".`;

  return (
    <div className="desk-walk">
      <header className="desk-walk__header">
        <div className="desk-walk__titlebar">
          <TransitionLink className="desk-walk-back" to="/desk">
            <NavArrowLeft aria-hidden height={18} width={18} />
            Desk
          </TransitionLink>
          <div className="desk-walk__title">
            <span>The walk</span>
            <h1>{target.name}</h1>
          </div>
          {isOffline || pendingCount > 0 ? (
            <span className="desk-walk-sync" title="Changes are saved locally">
              <Cloud aria-hidden height={15} width={15} />
              {isOffline ? "Offline" : `Saving ${pendingCount}`}
            </span>
          ) : null}
        </div>

        <WalkProgressBar progress={progress} />

        <div className="desk-walk__controls">
          <div aria-label="View" className="desk-walk-segmented" role="group">
            <button
              aria-pressed={view === "list"}
              className="desk-walk-segmented__button"
              onClick={() => setView("list")}
              type="button"
            >
              <List aria-hidden height={16} width={16} />
              List
            </button>
            <button
              aria-pressed={view === "map"}
              className="desk-walk-segmented__button"
              onClick={() => setView("map")}
              type="button"
            >
              <MapPin aria-hidden height={16} width={16} />
              Map
            </button>
          </div>

          <label className="desk-walk-filter">
            <span className="desk-visually-hidden">Filter by status</span>
            <WaSelect
              appearance="outlined"
              onChange={(event) =>
                setStatusFilter(waFieldValue(event) as StatusFilter)
              }
              size="small"
              value={statusFilter}
            >
              <WaOption value="all">All homes</WaOption>
              {WALK_STATUS_ORDER.map((status) => (
                <WaOption key={status} value={status}>
                  {walkStatusLabels[status]}
                </WaOption>
              ))}
            </WaSelect>
          </label>
        </div>
      </header>

      {error ? <p className="desk-empty">{error}</p> : null}
      {capped ? (
        <p className="desk-walk-note">
          This area is large — showing the first {total} homes.
        </p>
      ) : null}

      {isLoading && homes.length === 0 ? (
        <p className="desk-empty">Loading the homes on this walk…</p>
      ) : null}

      {view === "map" ? (
        <div className="desk-walk-map-wrap">
          <button
            className="desk-walk-map-return"
            onClick={() => setView("list")}
            type="button"
          >
            <List aria-hidden height={16} width={16} />
            Back to list
          </button>
          <HomeMap
            activeHomeKey={selectedHomeKey}
            homes={filteredHomes}
            onOpen={openHome}
          />
        </div>
      ) : (
        <HomeRosterList
          emptyLabel={emptyLabel}
          fallbackHomeAge={fallbackHomeAge}
          homes={filteredHomes}
          onOpen={openHome}
        />
      )}

      <footer className="desk-walk__footer">
        <TransitionLink className="desk-primary-link" to="/desk">
          <CheckCircle aria-hidden height={18} width={18} />
          Done for today
        </TransitionLink>
      </footer>

      {activeHome ? (
        <HomeDetailSheet
          authHeader={authHeader}
          fallbackHomeAge={fallbackHomeAge}
          hasNext={activeIndex >= 0 && activeIndex < orderKeys.length - 1}
          hasPrev={activeIndex > 0}
          home={activeHome}
          onClose={closeHome}
          onNext={goNext}
          onPrev={goPrev}
          onSave={saveVisit}
          position={
            activeIndex >= 0
              ? `${activeIndex + 1} of ${orderKeys.length}`
              : "1 of 1"
          }
        />
      ) : null}
    </div>
  );
};
