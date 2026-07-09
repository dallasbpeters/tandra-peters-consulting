import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import {
  Calendar,
  CheckCircle,
  Desk,
  Mail,
  MediaImage,
  StatsUpSquare,
  VideoCamera,
} from "iconoir-react";
import { useCallback, useMemo, useState } from "react";

import { useGoogleDashboardAuth } from "../../context/dashboard-auth-context";
import { useDeskBoard } from "../../hooks/use-desk-board";
import type {
  ActionItem,
  AuthHeader,
  CampaignAsset,
  DeskBoardRecord,
  DeskBoardStatusValue,
} from "../../lib/desk-types";
import { layoutClass } from "../../styles/layout-classes";
import { TransitionLink } from "../transition-link";
import { ActionRow, CalendarRow, GeneratedTaskRow } from "./action-row";
import { CampaignAssetRow } from "./campaign-asset-row";
import { CanvassingPlanner } from "./canvassing-planner";
import {
  SEED_ACTION_KEYS,
  SEED_ASSET_KEYS,
  actionItems,
  assetSeedKey,
  campaignAssets,
  metrics,
} from "./constants";
import { MetricCard } from "./metric-card";

export const DeskDashboard = ({
  auth,
}: {
  auth: ReturnType<typeof useGoogleDashboardAuth>;
}) => {
  const authHeader = useMemo<AuthHeader>(
    () => (auth.token ? { Authorization: `Bearer ${auth.token}` } : null),
    [auth.token]
  );
  const {
    boardMessage,
    busyKey,
    deleteItem,
    generate,
    generatingMode,
    isLoadingBoard,
    records,
    saveItem,
  } = useDeskBoard(authHeader);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const recordBySeedKey = useMemo(() => {
    const map = new Map<string, DeskBoardRecord>();
    for (const record of records) {
      if (record.seedKey) {
        map.set(record.seedKey, record);
      }
    }
    return map;
  }, [records]);

  const extraTasks = useMemo(
    () =>
      records.filter(
        (record) =>
          record.kind === "task" &&
          !(
            record.seedKey &&
            (SEED_ACTION_KEYS.has(record.seedKey) ||
              SEED_ASSET_KEYS.has(record.seedKey))
          )
      ),
    [records]
  );

  const contentRecords = useMemo(
    () =>
      records
        .filter((record) => record.kind === "content")
        .sort((a, b) =>
          (a.publishDate ?? "").localeCompare(b.publishDate ?? "")
        ),
    [records]
  );

  const toggleAction = useCallback(
    (item: ActionItem) => {
      const existing = recordBySeedKey.get(item.label);
      const nextStatus = existing?.status === "done" ? "todo" : "done";
      saveItem(
        {
          channel: item.channel,
          detail: item.outcome,
          href: item.href,
          id: existing?.id,
          kind: "task",
          origin: existing?.origin ?? "seed",
          seedKey: item.label,
          status: nextStatus,
          title: item.label,
        },
        item.label
      );
    },
    [recordBySeedKey, saveItem]
  );

  const toggleAsset = useCallback(
    (asset: CampaignAsset) => {
      const key = assetSeedKey(asset.label);
      const existing = recordBySeedKey.get(key);
      const nextStatus = existing?.status === "done" ? "todo" : "done";
      saveItem(
        {
          channel: "Campaign asset",
          detail: asset.status,
          href: asset.href,
          id: existing?.id,
          kind: "task",
          origin: existing?.origin ?? "seed",
          seedKey: key,
          status: nextStatus,
          title: asset.label,
        },
        key
      );
    },
    [recordBySeedKey, saveItem]
  );

  const toggleGenerated = useCallback(
    (record: DeskBoardRecord) => {
      const nextStatus = record.status === "done" ? "todo" : "done";
      saveItem(
        {
          channel: record.channel,
          detail: record.detail,
          href: record.href,
          id: record.id,
          kind: "task",
          origin: record.origin,
          seedKey: record.seedKey,
          status: nextStatus,
          title: record.title,
        },
        record.id
      );
    },
    [saveItem]
  );

  const requestContentDelete = useCallback((record: DeskBoardRecord) => {
    setDeleteConfirmId(record.id);
  }, []);

  const cancelContentDelete = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  const confirmContentDelete = useCallback(
    (record: DeskBoardRecord) => {
      setDeleteConfirmId(null);
      deleteItem(record);
    },
    [deleteItem]
  );

  const changeContentStatus = useCallback(
    (record: DeskBoardRecord, status: DeskBoardStatusValue) => {
      setDeleteConfirmId(null);
      saveItem(
        {
          buyerStage: record.buyerStage,
          channel: record.channel,
          detail: record.detail,
          href: record.href,
          id: record.id,
          kind: "content",
          origin: record.origin,
          pillar: record.pillar,
          publishDate: record.publishDate,
          seedKey: record.seedKey,
          status,
          title: record.title,
        },
        record.id
      );
    },
    [saveItem]
  );

  return (
    <div className={layoutClass.containerNoContainer}>
      <div className="desk">
        <header className="desk-hero">
          <div>
            <span className="desk-eyebrow">
              <Desk aria-hidden height={18} width={18} />
              Desk
            </span>
            <h1>Proactive demand before the first form fill.</h1>
            <p>
              Build daily outreach from roof-age signals, neighborhood
              targeting, partner relationships, weather moments, and opt-in
              capture instead of waiting for leads that do not exist yet.
            </p>
          </div>
          <nav aria-label="Desk shortcuts" className="desk-hero__actions">
            <TransitionLink className="desk-primary-link" to="/ads">
              <MediaImage aria-hidden height={18} width={18} />
              Build creative
            </TransitionLink>
            <TransitionLink className="desk-secondary-link" to="/emails">
              <Mail aria-hidden height={18} width={18} />
              Compose outreach
            </TransitionLink>
            <TransitionLink className="desk-secondary-link" to="/calendar">
              <Calendar aria-hidden height={18} width={18} />
              Plan content calendar
            </TransitionLink>
          </nav>
        </header>

        <section aria-label="Desk metrics" className="desk-metrics">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="desk-grid">
          <CanvassingPlanner auth={auth} />
        </section>

        <section className="desk-grid desk-grid--wide-right">
          <div className="desk-section">
            <div className="desk-section__heading">
              <Calendar aria-hidden height={22} width={22} />
              <div>
                <span>Action queue</span>
                <h2>Today&apos;s work</h2>
              </div>
              <WaButton
                appearance="plain"
                className="desk-generate-button"
                disabled={generatingMode !== null}
                onClick={() => generate("tasks")}
              >
                <StatsUpSquare
                  aria-hidden
                  height={16}
                  slot="start"
                  width={16}
                />
                {generatingMode === "tasks"
                  ? "Assessing…"
                  : "Generate next work"}
              </WaButton>
            </div>
            <ul className="desk-actions">
              {actionItems.map((item) => (
                <ActionRow
                  busy={busyKey === item.label}
                  item={item}
                  key={item.label}
                  onToggle={() => toggleAction(item)}
                  status={recordBySeedKey.get(item.label)?.status ?? "todo"}
                />
              ))}
            </ul>
            {extraTasks.length > 0 ? (
              <div className="desk-generated">
                <h3 className="desk-generated__title">
                  Generated &amp; added work
                </h3>
                <ul className="desk-actions">
                  {extraTasks.map((record) => (
                    <GeneratedTaskRow
                      busy={busyKey === record.id}
                      key={record.id}
                      onToggle={() => toggleGenerated(record)}
                      record={record}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
            {boardMessage ? (
              <p
                className={`desk-board-message desk-board-message--${boardMessage.tone}`}
              >
                {boardMessage.text}
              </p>
            ) : null}
          </div>

          <aside className="desk-campaign">
            <span className="desk-pill desk-pill--critical">
              First campaign
            </span>
            <h2>Georgetown estimate pack</h2>
            <p>
              One market, one message, one scan link. This is the first campaign
              to prove the desk can create traffic before a lead list exists.
            </p>
            <ul>
              {campaignAssets.map((asset) => (
                <CampaignAssetRow
                  asset={asset}
                  busy={busyKey === assetSeedKey(asset.label)}
                  key={asset.label}
                  onToggle={() => toggleAsset(asset)}
                  status={
                    recordBySeedKey.get(assetSeedKey(asset.label))?.status ??
                    "todo"
                  }
                />
              ))}
            </ul>
          </aside>
        </section>

        <section className="desk-calendar">
          <div className="desk-section__heading">
            <Calendar aria-hidden height={22} width={22} />
            <div>
              <span>Content calendar</span>
              <h2>Upcoming planned content</h2>
            </div>
            <WaButton
              appearance="plain"
              className="desk-generate-button"
              disabled={generatingMode !== null}
              onClick={() => generate("content")}
            >
              <StatsUpSquare aria-hidden height={16} slot="start" width={16} />
              {generatingMode === "content" ? "Planning…" : "Generate content"}
            </WaButton>
          </div>
          {contentRecords.length > 0 ? (
            <ul className="desk-calendar-list">
              {contentRecords.map((record) => (
                <CalendarRow
                  busy={busyKey === record.id}
                  deletePending={deleteConfirmId === record.id}
                  key={record.id}
                  onCancelDelete={cancelContentDelete}
                  onConfirmDelete={() => confirmContentDelete(record)}
                  onRequestDelete={() => requestContentDelete(record)}
                  onStatusChange={(status) =>
                    changeContentStatus(record, status)
                  }
                  record={record}
                />
              ))}
            </ul>
          ) : (
            <p className="desk-calendar-empty">
              {isLoadingBoard
                ? "Loading the content calendar…"
                : "No content planned yet."}
            </p>
          )}
        </section>

        <section className="desk-next">
          <div>
            <CheckCircle aria-hidden height={24} width={24} />
            <h2>Next build step</h2>
            <p>
              Replace seed cards with stored campaign documents: signal, area,
              audience, channel, asset links, spend, scan URL, captured
              follow-ups, and booked calls.
            </p>
          </div>
          <TransitionLink className="desk-primary-link" to="/marketing">
            <VideoCamera aria-hidden height={18} width={18} />
            Draft the first campaign
          </TransitionLink>
        </section>
      </div>
    </div>
  );
};
