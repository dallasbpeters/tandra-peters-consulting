import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaCheckbox from "@awesome.me/webawesome/dist/react/checkbox/index.js";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaOption from "@awesome.me/webawesome/dist/react/option/index.js";
import WaSelect from "@awesome.me/webawesome/dist/react/select/index.js";
import { usePostHog } from "@posthog/react";
import {
  ArrowRight,
  BubbleDownload,
  Calendar,
  CheckCircle,
  Desk,
  Home,
  Mail,
  MediaImage,
  StatsUpSquare,
  VideoCamera,
  WarningTriangle,
} from "iconoir-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DeskAreaMap } from "../components/desk-area-map";
import { SitePageChrome } from "../components/site-page-chrome";
import { TransitionLink } from "../components/transition-link";
import { useGoogleDashboardAuth } from "../context/dashboard-auth-context";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { layoutClass } from "../styles/layout-classes";

import "../styles/desk.css";

const waFieldValue = (event: unknown): string =>
  (event as { target: { value: string } }).target.value;

type Tone = "critical" | "warm" | "good" | "neutral";

interface Metric {
  label: string;
  note: string;
  value: string;
}

interface ActionItem {
  channel: string;
  due: string;
  href: string;
  label: string;
  outcome: string;
  owner: string;
  tone: Tone;
}

interface CampaignAsset {
  action: string;
  href: string;
  label: string;
  status: string;
}

type DeskBoardKindValue = "content" | "task";
type DeskBoardStatusValue =
  | "done"
  | "idea"
  | "published"
  | "scheduled"
  | "todo";
type DeskPlanModeValue = "content" | "tasks";

interface DeskBoardRecord {
  buyerStage?: string;
  channel?: string;
  completedAt?: string;
  createdAt: string;
  createdBy: string;
  detail?: string;
  href?: string;
  id: string;
  kind: DeskBoardKindValue;
  origin: string;
  pillar?: string;
  publishDate?: string;
  seedKey?: string;
  status: DeskBoardStatusValue;
  title: string;
  updatedAt: string;
}

interface DeskBoardResponse {
  error?: string;
  item?: DeskBoardRecord;
  items?: DeskBoardRecord[];
  ok: boolean;
}

interface CaptureMessage {
  text: string;
  tone: "error" | "neutral" | "success";
}

interface DeskAreaTarget {
  capturePath: string;
  countyFips: string;
  countyLabel: string;
  firstMove: string;
  geometry: {
    coordinates: number[][][];
    type: "Polygon";
  } | null;
  id: string;
  latitude: number;
  longitude: number;
  mailingAudience: string;
  mailingCity: string;
  mailingOffer: string;
  mailingRouteName: string;
  neighborhoodLabel: string;
  olderHomeEstimate: number;
  olderHomeShare: number;
  ownerOccupied: number;
  ownerOccupiedShare: number;
  postalCode: string;
  priorityScore: number;
  recommendedMailerCount: number;
  totalHousingUnits: number;
  tractLabel: string;
  why: string;
}

interface DeskAreaCounty {
  capturePath: string;
  countyFips: string;
  label: string;
  olderHomeEstimate: number;
  olderHomeShare: number;
  ownerOccupied: number;
  ownerOccupiedShare: number;
  targetCount: number;
  totalHousingUnits: number;
}

interface DeskAreaIntelResponse {
  counties: DeskAreaCounty[];
  error?: string;
  generatedAt: string;
  ok: boolean;
  release: string;
  source: string;
  targets: DeskAreaTarget[];
}

interface CanvassNeighborhood {
  county: string;
  homes: number;
  label: string;
  latitude: number | null;
  longitude: number | null;
  neighborhood: string;
  postalCode: string;
  tractFips: string;
}

interface CanvassTargetRecord {
  createdAt: string;
  createdBy: string;
  homesTotal: number;
  id: string;
  name: string;
  neighborhoods: CanvassNeighborhood[];
  notes?: string;
  status: string;
  updatedAt: string;
}

interface CanvassTargetResponse {
  error?: string;
  ok: boolean;
  target?: CanvassTargetRecord;
  targets?: CanvassTargetRecord[];
}

type CanvassStatus = "planned" | "walking" | "done";

const canvassStatusLabels: Record<CanvassStatus, string> = {
  done: "Done",
  planned: "Planned",
  walking: "Walking",
};

const canvassStatusOrder: readonly CanvassStatus[] = [
  "planned",
  "walking",
  "done",
];

const metrics: readonly Metric[] = [
  {
    label: "Current lead base",
    note: "Assume zero until a real opt-in arrives.",
    value: "0",
  },
  {
    label: "First useful target",
    note: "Email captures from one focused estimate page.",
    value: "25",
  },
  {
    label: "Starter postcard test",
    note: "One focused neighborhood before spending more.",
    value: "1.5k",
  },
  {
    label: "Daily actions",
    note: "Concrete outreach tasks the desk should create.",
    value: "6",
  },
] as const;

const actionItems: readonly ActionItem[] = [
  {
    channel: "Landing page",
    due: "Today",
    href: "/estimate",
    label: "Use /estimate for homeowner capture",
    outcome: "Live homeowner capture page for proactive campaigns",
    owner: "Dallas",
    tone: "critical",
  },
  {
    channel: "Direct mail",
    due: "Today",
    href: "/ads",
    label: "Build the first postcard creative",
    outcome: "1 mailing area, verify postage before send",
    owner: "Dallas",
    tone: "warm",
  },
  {
    channel: "Neighborhood social",
    due: "Today",
    href: "/marketing",
    label: "Create Nextdoor/Facebook post set",
    outcome: "Post without needing a cold email list",
    owner: "Tandra",
    tone: "good",
  },
  {
    channel: "Video",
    due: "Tomorrow",
    href: "/advertising",
    label: "Render 15-second estimate ad",
    outcome: "Use on Facebook, Reels, and Google posts",
    owner: "Dallas",
    tone: "neutral",
  },
  {
    channel: "Partner email",
    due: "Tomorrow",
    href: "/emails",
    label: "Send 20 personal partner intros",
    outcome: "Realtors, inspectors, agents, property managers",
    owner: "Tandra",
    tone: "warm",
  },
  {
    channel: "Lead capture",
    due: "This week",
    href: "/estimate",
    label: "Connect estimate CTA to the Desk capture flow",
    outcome: "First follow-up list from proactive traffic",
    owner: "Dallas",
    tone: "good",
  },
] as const;

const campaignAssets: readonly CampaignAsset[] = [
  {
    action: "Design",
    href: "/ads",
    label: "Postcard / door hanger",
    status: "Needed",
  },
  {
    action: "Write",
    href: "/marketing",
    label: "Nextdoor + Facebook post pair",
    status: "Needed",
  },
  {
    action: "Render",
    href: "/advertising",
    label: "15-second roof inspection video",
    status: "Ready to build",
  },
  {
    action: "Compose",
    href: "/emails",
    label: "Partner intro email",
    status: "Needed",
  },
] as const;

const toneClass = (tone: Tone) => `desk-pill desk-pill--${tone}`;

const assetSeedKey = (label: string): string => `asset:${label}`;

const SEED_ACTION_KEYS = new Set(actionItems.map((item) => item.label));

const SEED_ASSET_KEYS = new Set(
  campaignAssets.map((asset) => assetSeedKey(asset.label))
);

const CONTENT_STATUS_ORDER: readonly DeskBoardStatusValue[] = [
  "idea",
  "scheduled",
  "published",
];

const CONTENT_STATUS_LABELS: Record<string, string> = {
  idea: "Idea",
  published: "Published",
  scheduled: "Scheduled",
};

const publishDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const formatPublishDate = (value: string | undefined): string => {
  if (!value) {
    return "Unscheduled";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unscheduled";
  }
  return publishDateFormatter.format(date);
};

const numberFormatter = new Intl.NumberFormat("en-US");

const formatNumber = (value: number): string => numberFormatter.format(value);

const escapeCsvField = (value: number | string): string => {
  const text = String(value);
  if (!(text.includes(",") || text.includes('"') || text.includes("\n"))) {
    return text;
  }
  return `"${text.replaceAll('"', '""')}"`;
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "") || "target";

const buildWalkSheetCsv = (target: CanvassTargetRecord): string => {
  const rows: (number | string)[][] = [
    ["neighborhood", "county", "zip", "homes_to_canvass", "walked"],
  ];
  for (const item of target.neighborhoods) {
    rows.push([
      item.neighborhood || item.label,
      item.county,
      item.postalCode,
      item.homes,
      "",
    ]);
  }
  return rows
    .map((row) => row.map((field) => escapeCsvField(field)).join(","))
    .join("\n");
};

const downloadWalkSheet = (target: CanvassTargetRecord): void => {
  const blob = new Blob([buildWalkSheetCsv(target)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = `walk-sheet-${slugify(target.name)}.csv`;
  link.href = url;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const parseDeskAreaIntelResponse = async (
  response: Response
): Promise<DeskAreaIntelResponse> => {
  try {
    return (await response.json()) as DeskAreaIntelResponse;
  } catch {
    return {
      counties: [],
      error: response.ok ? undefined : "Area intel returned an empty response.",
      generatedAt: new Date().toISOString(),
      ok: response.ok,
      release: "Unavailable",
      source: "Unavailable",
      targets: [],
    };
  }
};

const MetricCard = ({ metric }: { metric: Metric }) => (
  <article className="desk-metric">
    <strong>{metric.value}</strong>
    <span>{metric.label}</span>
    <p>{metric.note}</p>
  </article>
);

const StatusToggleButton = ({
  busy,
  done,
  onToggle,
}: {
  busy: boolean;
  done: boolean;
  onToggle: () => void;
}) => (
  <WaCheckbox
    checked={done}
    className="desk-status-toggle"
    disabled={busy}
    onChange={onToggle}
  >
    {done ? "Done" : "To do"}
  </WaCheckbox>
);

const ActionRow = ({
  busy,
  item,
  onToggle,
  status,
}: {
  busy: boolean;
  item: ActionItem;
  onToggle: () => void;
  status: DeskBoardStatusValue;
}) => {
  const done = status === "done";
  return (
    <li className={done ? "desk-action desk-action--done" : "desk-action"}>
      <StatusToggleButton busy={busy} done={done} onToggle={onToggle} />
      <div>
        <span className={toneClass(item.tone)}>{item.due}</span>
        <h3>{item.label}</h3>
        <p>{item.outcome}</p>
      </div>
      <div className="desk-action__meta">
        <span>{item.channel}</span>
        <span>{item.owner}</span>
        <TransitionLink className="desk-link-button" to={item.href}>
          Open
          <ArrowRight aria-hidden height={16} width={16} />
        </TransitionLink>
      </div>
    </li>
  );
};

const GeneratedTaskRow = ({
  busy,
  onToggle,
  record,
}: {
  busy: boolean;
  onToggle: () => void;
  record: DeskBoardRecord;
}) => {
  const done = record.status === "done";
  return (
    <li className={`desk-action${done ? "desk-action--done" : ""}`}>
      <StatusToggleButton busy={busy} done={done} onToggle={onToggle} />
      <div>
        <span className="desk-pill desk-pill--neutral">
          {record.origin === "generated" ? "AI" : "Added"}
        </span>
        <h3>{record.title}</h3>
        {record.detail ? <p>{record.detail}</p> : null}
      </div>
      <div className="desk-action__meta">
        {record.channel ? <span>{record.channel}</span> : null}
        {record.href ? (
          <TransitionLink className="desk-link-button" to={record.href}>
            Open
            <ArrowRight aria-hidden height={16} width={16} />
          </TransitionLink>
        ) : null}
      </div>
    </li>
  );
};

const CalendarRow = ({
  busy,
  onStatusChange,
  record,
}: {
  busy: boolean;
  onStatusChange: (status: DeskBoardStatusValue) => void;
  record: DeskBoardRecord;
}) => (
  <li className="desk-calendar-row">
    <div className="desk-calendar-row__date">
      <Calendar aria-hidden height={16} width={16} />
      <span>{formatPublishDate(record.publishDate)}</span>
    </div>
    <div className="desk-calendar-row__body">
      <h3>{record.title}</h3>
      {record.detail ? <p>{record.detail}</p> : null}
      <div className="desk-calendar-row__tags">
        {record.pillar ? (
          <span className="desk-tag">{record.pillar}</span>
        ) : null}
        {record.buyerStage ? (
          <span className="desk-tag desk-tag--muted">{record.buyerStage}</span>
        ) : null}
        {record.channel ? (
          <span className="desk-tag desk-tag--muted">{record.channel}</span>
        ) : null}
      </div>
    </div>
    <WaSelect
      aria-label="Content status"
      appearance="outlined"
      className="desk-calendar-row__status"
      disabled={busy}
      onChange={(event) =>
        onStatusChange(waFieldValue(event) as DeskBoardStatusValue)
      }
      size="small"
      value={record.status}
    >
      {CONTENT_STATUS_ORDER.map((value) => (
        <WaOption key={value} value={value}>
          {CONTENT_STATUS_LABELS[value]}
        </WaOption>
      ))}
    </WaSelect>
  </li>
);

const neighborhoodLabelOf = (target: DeskAreaTarget): string =>
  target.neighborhoodLabel || target.tractLabel;

const targetToSnapshot = (target: DeskAreaTarget): CanvassNeighborhood => ({
  county: target.countyLabel,
  homes: target.olderHomeEstimate,
  label: target.tractLabel,
  latitude: target.latitude,
  longitude: target.longitude,
  neighborhood: neighborhoodLabelOf(target),
  postalCode: target.postalCode,
  tractFips: target.id,
});

const NeighborhoodRow = ({
  onToggle,
  selected,
  target,
}: {
  onToggle: (id: string) => void;
  selected: boolean;
  target: DeskAreaTarget;
}) => (
  <WaCheckbox
    checked={selected}
    className={
      selected
        ? "desk-canvass-row desk-canvass-row--selected"
        : "desk-canvass-row"
    }
    onChange={() => onToggle(target.id)}
  >
    <span className="desk-canvass-row__body">
      <strong>{neighborhoodLabelOf(target)}</strong>
      <span>
        {target.countyLabel}
        {target.postalCode ? ` · ${target.postalCode}` : ""}
      </span>
    </span>
    <span className="desk-canvass-row__homes">
      {formatNumber(target.olderHomeEstimate)}
      <small>homes</small>
    </span>
  </WaCheckbox>
);

const SavedTargetCard = ({
  isBusy,
  onDelete,
  onExport,
  onOpen,
  onStatusChange,
  target,
}: {
  isBusy: boolean;
  onDelete: (target: CanvassTargetRecord) => void;
  onExport: (target: CanvassTargetRecord) => void;
  onOpen: (target: CanvassTargetRecord) => void;
  onStatusChange: (target: CanvassTargetRecord, status: CanvassStatus) => void;
  target: CanvassTargetRecord;
}) => (
  <article className="desk-saved-target">
    <div className="desk-saved-target__head">
      <div>
        <strong>{target.name}</strong>
        <span>
          {formatNumber(target.homesTotal)} door hangers ·{" "}
          {target.neighborhoods.length} neighborhood
          {target.neighborhoods.length === 1 ? "" : "s"}
        </span>
      </div>
      <span className={`desk-status desk-status--${target.status}`}>
        {canvassStatusLabels[target.status as CanvassStatus] ?? target.status}
      </span>
    </div>
    <div className="desk-saved-target__actions">
      <WaButton
        appearance="plain"
        className="desk-action-button"
        onClick={() => onOpen(target)}
      >
        Open on map
      </WaButton>
      <label className="desk-status-select">
        <span className="desk-visually-hidden">Status for {target.name}</span>
        <WaSelect
          appearance="outlined"
          disabled={isBusy}
          onChange={(event) =>
            onStatusChange(target, waFieldValue(event) as CanvassStatus)
          }
          size="small"
          value={target.status}
        >
          {canvassStatusOrder.map((status) => (
            <WaOption key={status} value={status}>
              {canvassStatusLabels[status]}
            </WaOption>
          ))}
        </WaSelect>
      </label>
      <WaButton
        appearance="plain"
        className="desk-action-button"
        onClick={() => onExport(target)}
      >
        <BubbleDownload aria-hidden height={15} slot="start" width={15} />
        Walk sheet
      </WaButton>
      <TransitionLink className="desk-text-link" to="/ads">
        Door hanger
      </TransitionLink>
      <WaButton
        appearance="plain"
        className="desk-action-button desk-action-button--danger"
        disabled={isBusy}
        onClick={() => onDelete(target)}
      >
        Delete
      </WaButton>
    </div>
  </article>
);

const AreaCountyStrip = ({
  counties,
}: {
  counties: readonly DeskAreaCounty[];
}) => (
  <ul aria-label="County home totals" className="desk-area-counties">
    {counties.map((county) => (
      <li className="desk-area-county" key={county.countyFips}>
        <strong>{county.label}</strong>
        <span>
          {formatNumber(county.olderHomeEstimate)} likely owner-occupied older
          homes
        </span>
      </li>
    ))}
  </ul>
);

type AuthHeader = { Authorization: string } | null;

const useAreaIntel = () => {
  const [intel, setIntel] = useState<DeskAreaIntelResponse | null>(null);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [isLoadingIntel, setIsLoadingIntel] = useState(true);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        const response = await fetch("/api/desk-area-intel");
        const body = await parseDeskAreaIntelResponse(response);
        if (!isActive) {
          return;
        }
        if (response.ok && body.ok) {
          setIntel(body);
        } else {
          setIntelError(body.error ?? "Could not load neighborhood signals.");
        }
      } catch {
        if (isActive) {
          setIntelError("Could not load neighborhood signals.");
        }
      } finally {
        if (isActive) {
          setIsLoadingIntel(false);
        }
      }
    };
    load();
    return () => {
      isActive = false;
    };
  }, []);

  return { intel, intelError, isLoadingIntel };
};

interface SaveTargetPayload {
  id?: string;
  name: string;
  neighborhoods: CanvassNeighborhood[];
}

const useCanvassTargets = (authHeader: AuthHeader) => {
  const [saved, setSaved] = useState<CanvassTargetRecord[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadSaved = useCallback(async () => {
    if (!authHeader) {
      return;
    }
    setIsLoadingSaved(true);
    try {
      const response = await fetch("/api/desk-targets", {
        headers: authHeader,
      });
      const body = (await response.json()) as CanvassTargetResponse;
      if (response.ok && body.ok && body.targets) {
        setSaved(body.targets);
      }
    } catch {
      /* non-fatal — saved list stays empty */
    } finally {
      setIsLoadingSaved(false);
    }
  }, [authHeader]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const saveTarget = useCallback(
    async (
      payload: SaveTargetPayload
    ): Promise<{ error?: string; ok: boolean }> => {
      if (!authHeader) {
        return { error: "Sign in to save canvassing targets.", ok: false };
      }
      try {
        const response = await fetch("/api/desk-targets", {
          body: JSON.stringify(payload),
          headers: { ...authHeader, "Content-Type": "application/json" },
          method: "POST",
        });
        const body = (await response.json()) as CanvassTargetResponse;
        if (response.ok && body.ok && body.target) {
          await loadSaved();
          return { ok: true };
        }
        return { error: body.error, ok: false };
      } catch {
        return { error: "Could not save this target.", ok: false };
      }
    },
    [authHeader, loadSaved]
  );

  const changeStatus = useCallback(
    async (target: CanvassTargetRecord, status: CanvassStatus) => {
      if (!authHeader) {
        return;
      }
      setBusyId(target.id);
      try {
        await fetch("/api/desk-targets", {
          body: JSON.stringify({
            id: target.id,
            name: target.name,
            neighborhoods: target.neighborhoods,
            notes: target.notes,
            status,
          }),
          headers: { ...authHeader, "Content-Type": "application/json" },
          method: "POST",
        });
        await loadSaved();
      } catch {
        /* non-fatal */
      } finally {
        setBusyId(null);
      }
    },
    [authHeader, loadSaved]
  );

  const deleteTarget = useCallback(
    async (target: CanvassTargetRecord) => {
      if (!authHeader) {
        return;
      }
      setBusyId(target.id);
      try {
        await fetch(`/api/desk-targets?id=${encodeURIComponent(target.id)}`, {
          headers: authHeader,
          method: "DELETE",
        });
        await loadSaved();
      } catch {
        /* non-fatal */
      } finally {
        setBusyId(null);
      }
    },
    [authHeader, loadSaved]
  );

  return {
    busyId,
    changeStatus,
    deleteTarget,
    isLoadingSaved,
    saveTarget,
    saved,
  };
};

const useDeskBoard = (authHeader: AuthHeader) => {
  const [records, setRecords] = useState<DeskBoardRecord[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [generatingMode, setGeneratingMode] =
    useState<DeskPlanModeValue | null>(null);
  const [boardMessage, setBoardMessage] = useState<CaptureMessage | null>(null);

  const loadBoard = useCallback(async () => {
    setIsLoadingBoard(true);
    try {
      const response = await fetch("/api/desk-board", {
        headers: authHeader ?? undefined,
      });
      const body = (await response.json()) as DeskBoardResponse;
      if (response.ok && body.ok && body.items) {
        setRecords(body.items);
      }
    } catch {
      /* non-fatal — seed cards stay with default status */
    } finally {
      setIsLoadingBoard(false);
    }
  }, [authHeader]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const saveItem = useCallback(
    async (payload: Record<string, unknown>, busy: string): Promise<void> => {
      setBusyKey(busy);
      setBoardMessage(null);
      try {
        const response = await fetch("/api/desk-board", {
          body: JSON.stringify(payload),
          headers: authHeader
            ? { ...authHeader, "Content-Type": "application/json" }
            : { "Content-Type": "application/json" },
          method: "POST",
        });
        const body = (await response.json()) as DeskBoardResponse;
        if (response.ok && body.ok && body.item) {
          const saved = body.item;
          setRecords((current) => [
            ...current.filter((entry) => entry.id !== saved.id),
            saved,
          ]);
        } else {
          setBoardMessage({
            text: body.error ?? "Could not save this item.",
            tone: "error",
          });
        }
      } catch {
        setBoardMessage({ text: "Could not save this item.", tone: "error" });
      } finally {
        setBusyKey(null);
      }
    },
    [authHeader]
  );

  const generate = useCallback(
    async (mode: DeskPlanModeValue): Promise<void> => {
      setGeneratingMode(mode);
      setBoardMessage(null);
      try {
        const response = await fetch("/api/desk-plan", {
          body: JSON.stringify({ mode }),
          headers: authHeader
            ? { ...authHeader, "Content-Type": "application/json" }
            : { "Content-Type": "application/json" },
          method: "POST",
        });
        const body = (await response.json()) as DeskBoardResponse;
        if (response.ok && body.ok && body.items) {
          await loadBoard();
          const count = body.items.length;
          const plural = count === 1 ? "" : "s";
          setBoardMessage({
            text:
              mode === "content"
                ? `Added ${count} content idea${plural}.`
                : `Added ${count} task${plural}.`,
            tone: "success",
          });
        } else {
          setBoardMessage({
            text: body.error ?? "Could not generate new work.",
            tone: "error",
          });
        }
      } catch {
        setBoardMessage({
          text: "Could not generate new work.",
          tone: "error",
        });
      } finally {
        setGeneratingMode(null);
      }
    },
    [authHeader, loadBoard]
  );

  return {
    boardMessage,
    busyKey,
    generate,
    generatingMode,
    isLoadingBoard,
    records,
    saveItem,
  };
};

const saveValidationError = (
  signedIn: boolean,
  selectedCount: number,
  name: string
): string | null => {
  if (!signedIn) {
    return "Sign in to save canvassing targets.";
  }
  if (selectedCount === 0) {
    return "Pick neighborhoods on the map first.";
  }
  if (!name.trim()) {
    return "Give this target a name.";
  }
  return null;
};

const CanvassingPlanner = ({
  auth,
}: {
  auth: ReturnType<typeof useGoogleDashboardAuth>;
}) => {
  const { intel, intelError, isLoadingIntel } = useAreaIntel();
  const authHeader = useMemo<AuthHeader>(
    () => (auth.token ? { Authorization: `Bearer ${auth.token}` } : null),
    [auth.token]
  );
  const {
    busyId,
    changeStatus,
    deleteTarget: removeTarget,
    isLoadingSaved,
    saved,
    saveTarget,
  } = useCanvassTargets(authHeader);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusIds, setFocusIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<CaptureMessage | null>(null);

  const targets = useMemo(() => intel?.targets ?? [], [intel]);
  const counties = useMemo(() => intel?.counties ?? [], [intel]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }, []);

  const selectedTargets = useMemo(
    () => targets.filter((target) => selectedIds.includes(target.id)),
    [targets, selectedIds]
  );
  const selectedHomes = selectedTargets.reduce(
    (sum, target) => sum + target.olderHomeEstimate,
    0
  );

  const resetForm = useCallback(() => {
    setSelectedIds([]);
    setName("");
    setEditingId(null);
  }, []);

  const handleSave = useCallback(async () => {
    const invalid = saveValidationError(
      Boolean(authHeader),
      selectedTargets.length,
      name
    );
    if (invalid) {
      setMessage({ text: invalid, tone: "error" });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const result = await saveTarget({
      id: editingId ?? undefined,
      name,
      neighborhoods: selectedTargets.map(targetToSnapshot),
    });
    setIsSaving(false);
    if (result.ok) {
      setMessage({
        text: editingId ? "Target updated." : "Target saved.",
        tone: "success",
      });
      resetForm();
    } else {
      setMessage({
        text: result.error ?? "Could not save this target.",
        tone: "error",
      });
    }
  }, [authHeader, editingId, name, resetForm, saveTarget, selectedTargets]);

  const openTarget = useCallback((target: CanvassTargetRecord) => {
    const ids = target.neighborhoods
      .map((item) => item.tractFips)
      .filter(Boolean);
    setSelectedIds(ids);
    setFocusIds([...ids]);
    setName(target.name);
    setEditingId(target.id);
    setMessage(null);
  }, []);

  const deleteTarget = useCallback(
    async (target: CanvassTargetRecord) => {
      await removeTarget(target);
      setEditingId((current) => (current === target.id ? null : current));
    },
    [removeTarget]
  );

  const hasLoadedNoTargets =
    !isLoadingIntel && intelError === null && targets.length === 0;

  return (
    <section className="desk-section desk-area-intel">
      <div className="desk-section__heading">
        <StatsUpSquare aria-hidden height={22} width={22} />
        <div>
          <span>Canvassing planner</span>
          <h2>Where to hang door hangers</h2>
        </div>
      </div>

      <div className="desk-area-intel__intro">
        <p>
          Neighborhoods ranked by public housing signals — owner-occupied
          concentration and share of older homes. Click the ones worth walking,
          name the route, and save it as a door-hanger target.
        </p>
        <div className="desk-area-intel__source">
          <span>
            {intel
              ? `${intel.release} · ${intel.source}`
              : "Loading neighborhood signals..."}
          </span>
        </div>
      </div>

      {intelError ? <p className="desk-empty">{intelError}</p> : null}

      <div className="desk-area-intel__layout">
        <DeskAreaMap
          focusIds={focusIds}
          onToggleSelect={toggleSelect}
          selectedIds={selectedIds}
          targets={targets}
        />

        <div className="desk-canvass-builder">
          <div className="desk-canvass-summary">
            <div>
              <strong>{selectedTargets.length}</strong>
              <span>selected</span>
            </div>
            <div>
              <strong>{formatNumber(selectedHomes)}</strong>
              <span>door hangers</span>
            </div>
          </div>

          <div className="desk-canvass-name">
            <span>Target name</span>
            <WaInput
              onChange={(event) => setName(waFieldValue(event))}
              placeholder="Serenada — walk Saturday"
              type="text"
              value={name}
            />
          </div>

          {message ? (
            <p
              className={`desk-capture-message desk-capture-message--${message.tone}`}
            >
              {message.text}
            </p>
          ) : null}

          <div className="desk-canvass-builder__actions">
            <WaButton
              appearance="plain"
              className="desk-primary-link"
              disabled={isSaving || selectedTargets.length === 0}
              onClick={handleSave}
            >
              <CheckCircle aria-hidden height={18} slot="start" width={18} />
              {(() => {
                if (isSaving) {
                  return "Saving...";
                }
                return editingId ? "Update target" : "Save target";
              })()}
            </WaButton>
            {selectedTargets.length > 0 || editingId ? (
              <WaButton
                appearance="plain"
                className="desk-action-button"
                onClick={resetForm}
              >
                Clear
              </WaButton>
            ) : null}
          </div>

          <div className="desk-canvass-list">
            {isLoadingIntel ? (
              <p className="desk-empty">Loading neighborhoods...</p>
            ) : null}
            {targets.map((target) => (
              <NeighborhoodRow
                key={target.id}
                onToggle={toggleSelect}
                selected={selectedIds.includes(target.id)}
                target={target}
              />
            ))}
            {hasLoadedNoTargets ? (
              <p className="desk-empty">
                No neighborhoods passed the owner-occupied and older-home
                filters.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="desk-saved-targets">
        <h3>Saved canvassing targets</h3>
        {authHeader ? null : (
          <p className="desk-empty">Sign in to save and reopen targets.</p>
        )}
        {authHeader && isLoadingSaved && saved.length === 0 ? (
          <p className="desk-empty">Loading saved targets...</p>
        ) : null}
        {authHeader && !isLoadingSaved && saved.length === 0 ? (
          <p className="desk-empty">
            No saved targets yet. Select neighborhoods above and save your first
            door-hanger route.
          </p>
        ) : null}
        {saved.length > 0 ? (
          <div className="desk-saved-target-list">
            {saved.map((target) => (
              <SavedTargetCard
                isBusy={busyId === target.id}
                key={target.id}
                onDelete={deleteTarget}
                onExport={downloadWalkSheet}
                onOpen={openTarget}
                onStatusChange={changeStatus}
                target={target}
              />
            ))}
          </div>
        ) : null}
      </div>

      {counties.length > 0 ? <AreaCountyStrip counties={counties} /> : null}
    </section>
  );
};

const CampaignAssetRow = ({
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

const AuthPanel = ({
  auth,
}: {
  auth: ReturnType<typeof useGoogleDashboardAuth>;
}) => (
  <section className="desk-auth">
    <WarningTriangle aria-hidden height={22} width={22} />
    <div>
      <h1>Sign in to Desk</h1>
      <p>Private acquisition planning for Tandra&apos;s outreach work.</p>
      {auth.clientId ? <div ref={auth.buttonRef} /> : null}
      {auth.clientId ? null : (
        <p>
          Add <code>VITE_GOOGLE_CLIENT_ID</code> to enable dashboard sign-in.
        </p>
      )}
      {auth.authError ? <p>{auth.authError}</p> : null}
    </div>
  </section>
);

const DeskDashboard = ({
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
    generate,
    generatingMode,
    isLoadingBoard,
    records,
    saveItem,
  } = useDeskBoard(authHeader);

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

  const changeContentStatus = useCallback(
    (record: DeskBoardRecord, status: DeskBoardStatusValue) => {
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
    <div className={layoutClass.containerFull}>
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
            <TransitionLink className="desk-primary-link" to="/estimate">
              <Home aria-hidden height={18} width={18} />
              Open estimate page
            </TransitionLink>
            <TransitionLink className="desk-primary-link" to="/ads">
              <MediaImage aria-hidden height={18} width={18} />
              Build creative
            </TransitionLink>
            <TransitionLink className="desk-secondary-link" to="/emails">
              <Mail aria-hidden height={18} width={18} />
              Compose outreach
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
              <h2>Searchable-first content plan</h2>
            </div>
            <WaButton
              appearance="plain"
              className="desk-generate-button"
              disabled={generatingMode !== null}
              onClick={() => generate("content")}
            >
              <StatsUpSquare aria-hidden height={16} slot="start" width={16} />
              {generatingMode === "content"
                ? "Planning…"
                : "Generate content ideas"}
            </WaButton>
          </div>
          {contentRecords.length > 0 ? (
            <ul className="desk-calendar-list">
              {contentRecords.map((record) => (
                <CalendarRow
                  busy={busyKey === record.id}
                  key={record.id}
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
                : "No content planned yet. Generate ideas to build a searchable-first calendar."}
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

export const DeskPage = () => {
  const auth = useGoogleDashboardAuth();
  const posthog = usePostHog();
  const requireAuth = !import.meta.env.DEV && auth.clientId && !auth.token;

  usePageMetadata({
    description:
      "Internal Desk dashboard for proactive roofing outreach, campaign planning, and lead capture targets.",
    robots: "noindex, nofollow",
    title: "Desk | Tandra Peters",
  });

  useEffect(() => {
    posthog?.capture("desk_viewed");
  }, [posthog]);

  return (
    <SitePageChrome>
      {requireAuth ? (
        <div className={layoutClass.containerWide}>
          <AuthPanel auth={auth} />
        </div>
      ) : (
        <DeskDashboard auth={auth} />
      )}
    </SitePageChrome>
  );
};
