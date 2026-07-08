import { AddressAutofill } from "@mapbox/search-js-react";
import { usePostHog } from "@posthog/react";
import {
  ArrowRight,
  BubbleDownload,
  Calendar,
  CheckCircle,
  Community,
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
import {
  type ContentCalendarEntry,
  channelLabels,
  entriesForNextDays,
  statusLabels,
  toIsoDate,
} from "../lib/content-calendar";
import { layoutClass } from "../styles/layout-classes";

import "../styles/desk.css";

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

interface Channel {
  cost: string;
  firstUse: string;
  fit: string;
  name: string;
  risk: string;
  source: string;
}

interface CampaignAsset {
  action: string;
  href: string;
  label: string;
  status: string;
}

interface SelectOption {
  label: string;
  value: string;
}

interface LeadFormState {
  area: string;
  contactMethod: string;
  contactName: string;
  county: string;
  latitude: number | null;
  longitude: number | null;
  mailingAddress: string;
  need: string;
  nextStep: string;
  notes: string;
  postalCode: string;
  propertyAddress: string;
  source: string;
}

interface DeskLeadRecord {
  area: string;
  capturedAt: string;
  contactMethod: string;
  contactName: string;
  county?: string;
  id: string;
  mailingAddress?: string;
  need: string;
  nextStep: string;
  postalCode?: string;
  propertyAddress?: string;
  source: string;
  status: string;
}

interface DeskCaptureResponse {
  error?: string;
  lead?: DeskLeadRecord;
  leads?: DeskLeadRecord[];
  ok: boolean;
}

interface CaptureMessage {
  text: string;
  tone: "error" | "neutral" | "success";
}

interface LeadFollowUp {
  callOpener: string;
  messageDraft: string;
  nextAction: string;
  postAngle: string;
}

interface DeskAreaTarget {
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
  roofCheckPath: string;
  totalHousingUnits: number;
  tractLabel: string;
  why: string;
}

interface DeskAreaCounty {
  countyFips: string;
  label: string;
  olderHomeEstimate: number;
  olderHomeShare: number;
  ownerOccupied: number;
  ownerOccupiedShare: number;
  roofCheckPath: string;
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

const _sourceOptions: readonly SelectOption[] = [
  { label: "Neighbor referral", value: "neighbor-referral" },
  { label: "Postcard", value: "postcard" },
  { label: "Neighborhood post", value: "neighborhood-post" },
  { label: "Google post", value: "google-post" },
  { label: "Partner referral", value: "partner" },
  { label: "Roof-check page", value: "roof-check-page" },
  { label: "Website estimate", value: "website-estimate" },
  { label: "Other", value: "other" },
] as const;

const _nextStepOptions: readonly SelectOption[] = [
  { label: "Call today", value: "call-today" },
  { label: "Send checklist", value: "send-checklist" },
  { label: "Book inspection", value: "book-inspection" },
  { label: "Ask for photos", value: "ask-for-photos" },
  { label: "No action yet", value: "no-action-yet" },
] as const;

const WHITESPACE_RE = /\s+/u;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";

const _initialLeadForm: LeadFormState = {
  area: "",
  contactMethod: "",
  contactName: "",
  county: "",
  latitude: null,
  longitude: null,
  mailingAddress: "",
  need: "",
  nextStep: "call-today",
  notes: "",
  postalCode: "",
  propertyAddress: "",
  source: "neighbor-referral",
};

const leadDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
});

const metrics: readonly Metric[] = [
  {
    label: "Current lead base",
    note: "Assume zero until a real opt-in arrives.",
    value: "0",
  },
  {
    label: "First useful target",
    note: "Email captures from one focused roof-check page.",
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
    href: "/roof-check/georgetown",
    label: "Use /roof-check/georgetown for capture",
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
    label: "Render 15-second roof-check ad",
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
    label: "Connect roof-check CTA to the Desk capture flow",
    outcome: "First follow-up list from proactive traffic",
    owner: "Dallas",
    tone: "good",
  },
] as const;

const channels: readonly Channel[] = [
  {
    cost: "Free area data, paid postage",
    firstUse:
      "Pick 1-3 Georgetown mailing areas and send a scan-link postcard.",
    fit: "Best proactive homeowner reach without buying bad email lists.",
    name: "Neighborhood postcards",
    risk: "Low",
    source: "USPS mailing areas",
  },
  {
    cost: "Free / manual",
    firstUse:
      "Post short repair-vs-replace and inspection checklists around common homeowner triggers.",
    fit: "Neighborhood trust, roof-age questions, and timely weather follow-up.",
    name: "Nextdoor + Facebook",
    risk: "Low",
    source: "Community feeds",
  },
  {
    cost: "Free / manual",
    firstUse: "Send short personal notes to realtors, inspectors, and agents.",
    fit: "B2B relationships that can refer homeowners before they search.",
    name: "Partner email",
    risk: "Medium",
    source: "Public business contacts",
  },
  {
    cost: "Free",
    firstUse: "Publish the same roof-check angle as a Google profile update.",
    fit: "Local visibility and fresh proof that Tandra is actively helping homeowners.",
    name: "Google profile",
    risk: "Low",
    source: "Owned profile",
  },
  {
    cost: "Free public data",
    firstUse: "Use county records only to choose neighborhoods first.",
    fit: "Target neighborhoods by property age and owner/address patterns.",
    name: "County property records",
    risk: "Medium",
    source: "Property records",
  },
  {
    cost: "Free",
    firstUse:
      "Track hail/wind by county and generate daily priority-area cards.",
    fit: "One trigger for timing routes and choosing the message angle.",
    name: "Weather signals",
    risk: "Low",
    source: "NOAA / NWS",
  },
] as const;

const campaignAssets: readonly CampaignAsset[] = [
  {
    action: "Use live page",
    href: "/roof-check/georgetown",
    label: "Roof-check landing page",
    status: "Live",
  },
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

const _labelFor = (
  value: string,
  options: readonly SelectOption[],
  fallback: string
): string =>
  options.find((option) => option.value === value)?.label ?? fallback;

const firstName = (value: string): string =>
  value.trim().split(WHITESPACE_RE)[0] ?? value;

const truncateSentence = (value: string, maxLength: number): string => {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1).trim()}...`;
};

const numberFormatter = new Intl.NumberFormat("en-US");

const formatNumber = (value: number): string => numberFormatter.format(value);

interface MapboxAddressParts {
  city: string;
  coords: [number, number] | null;
  county: string;
  full: string;
  neighborhood: string;
  postalCode: string;
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const stringValue = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const contextName = (
  context: Record<string, unknown>,
  keys: readonly string[]
): string => {
  for (const key of keys) {
    const entry = toRecord(context[key]);
    const name = stringValue(entry.name) || stringValue(entry.text);
    if (name) {
      return name;
    }
  }
  return "";
};

const mapboxCoordinates = (
  feature: Record<string, unknown>
): [number, number] | null => {
  const geometryCoords = toRecord(feature.geometry).coordinates;
  if (
    Array.isArray(geometryCoords) &&
    typeof geometryCoords[0] === "number" &&
    typeof geometryCoords[1] === "number"
  ) {
    return [geometryCoords[0], geometryCoords[1]];
  }

  const coordinates = toRecord(toRecord(feature.properties).coordinates);
  const { latitude, longitude } = coordinates;
  if (typeof longitude === "number" && typeof latitude === "number") {
    return [longitude, latitude];
  }

  return null;
};

const _getMapboxAddressParts = (res: unknown): MapboxAddressParts => {
  const { features } = toRecord(res);
  const feature = Array.isArray(features) ? toRecord(features[0]) : {};
  const props = toRecord(feature.properties);
  const context = toRecord(props.context);

  return {
    city: contextName(context, ["place", "locality"]),
    coords: mapboxCoordinates(feature),
    county: contextName(context, ["district"]),
    full: stringValue(props.full_address) || stringValue(props.place_name),
    neighborhood: contextName(context, ["neighborhood"]),
    postalCode: contextName(context, ["postcode"]),
  };
};

const _coalesceArea = (parts: MapboxAddressParts, fallback: string): string =>
  parts.neighborhood || parts.city || fallback;

interface DeskAddressInputProps {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  onRetrieve: (result: unknown) => void;
  placeholder: string;
  required?: boolean;
  value: string;
}

const _DeskAddressInput = ({
  disabled,
  id,
  label,
  onChange,
  onRetrieve,
  placeholder,
  required = false,
  value,
}: DeskAddressInputProps) => {
  const input = (
    <input
      autoComplete="street-address"
      disabled={disabled}
      id={id}
      maxLength={500}
      onChange={(event) => onChange(event.currentTarget.value)}
      placeholder={placeholder}
      required={required}
      type="text"
      value={value}
    />
  );

  return (
    <label htmlFor={id}>
      <span>{label}</span>
      {MAPBOX_TOKEN ? (
        <AddressAutofill
          accessToken={MAPBOX_TOKEN}
          onRetrieve={onRetrieve}
          options={{ country: "US", language: "en" }}
        >
          {input}
        </AddressAutofill>
      ) : (
        input
      )}
    </label>
  );
};

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

const _formatLeadDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }
  return leadDateFormatter.format(date);
};

const _parseDeskCaptureResponse = async (
  response: Response
): Promise<DeskCaptureResponse> => {
  try {
    return (await response.json()) as DeskCaptureResponse;
  } catch {
    return {
      error: response.ok
        ? undefined
        : "Desk capture returned an empty response.",
      ok: response.ok,
    };
  }
};

const nextActionFor = (lead: DeskLeadRecord): string => {
  switch (lead.nextStep) {
    case "send-checklist": {
      return "Send the roof-check checklist, then ask for exterior photos and any ceiling-stain photos.";
    }
    case "book-inspection": {
      return "Offer two inspection windows and ask who should be there for the roof walk.";
    }
    case "ask-for-photos": {
      return "Ask for roof, attic, ceiling, and damage photos before recommending an inspection.";
    }
    case "no-action-yet": {
      return "Hold this as a warm record, then follow up when the neighborhood campaign goes out.";
    }
    default: {
      return "Call today, confirm the concern, and offer a clear next step without pushing a claim.";
    }
  }
};

const _buildLeadFollowUp = (lead: DeskLeadRecord): LeadFollowUp => {
  const name = firstName(lead.contactName);
  const need = truncateSentence(lead.need, 140);

  return {
    callOpener: `Hi ${name}, this is Tandra with Birdcreek Roofing. I saw the note about ${need}. I'm calling to help you get a plain read on whether this needs a repair, an inspection, or just watching for now.`,
    messageDraft: `Hi ${name}, this is Tandra with Birdcreek Roofing. I can help you get a clear read on the roof around ${lead.area}. If you can send a few photos and the main concern, I'll tell you what I'd check first and whether it is worth scheduling an inspection.`,
    nextAction: nextActionFor(lead),
    postAngle: `For homeowners around ${lead.area}: if your roof is older, recently repaired, or you are seeing stains, missing shingles, or soft spots, I can help you understand what is urgent and what can wait before you call insurance or sign anything.`,
  };
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

const ActionRow = ({ item }: { item: ActionItem }) => (
  <li className="desk-action">
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
  <button
    aria-pressed={selected}
    className={`desk-canvass-row${selected ? "desk-canvass-row--selected" : " "}`}
    onClick={() => onToggle(target.id)}
    type="button"
  >
    <span aria-hidden className="desk-canvass-row__check">
      {selected ? <CheckCircle height={16} width={16} /> : null}
    </span>
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
  </button>
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
      <button
        className="desk-text-link"
        onClick={() => onOpen(target)}
        type="button"
      >
        Open on map
      </button>
      <label className="desk-status-select">
        <span className="desk-visually-hidden">Status for {target.name}</span>
        <select
          disabled={isBusy}
          onChange={(event) =>
            onStatusChange(target, event.currentTarget.value as CanvassStatus)
          }
          value={target.status}
        >
          {canvassStatusOrder.map((status) => (
            <option key={status} value={status}>
              {canvassStatusLabels[status]}
            </option>
          ))}
        </select>
      </label>
      <button
        className="desk-text-link"
        onClick={() => onExport(target)}
        type="button"
      >
        <BubbleDownload aria-hidden height={15} width={15} />
        Walk sheet
      </button>
      <TransitionLink className="desk-text-link" to="/ads">
        Door hanger
      </TransitionLink>
      <button
        className="desk-text-link desk-text-link--danger"
        disabled={isBusy}
        onClick={() => onDelete(target)}
        type="button"
      >
        Delete
      </button>
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

const DESK_CALENDAR_PREVIEW_DAYS = 30;
const DESK_CALENDAR_PREVIEW_LIMIT = 6;

interface CalendarEntriesResponse {
  entries?: ContentCalendarEntry[];
  error?: string;
  ok: boolean;
}

const useDeskCalendarEntries = (authHeader: AuthHeader) => {
  const [entries, setEntries] = useState<ContentCalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authHeader) {
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const today = new Date();
      const rangeEnd = new Date(today);
      rangeEnd.setDate(rangeEnd.getDate() + DESK_CALENDAR_PREVIEW_DAYS);
      const params = new URLSearchParams({
        end: toIsoDate(rangeEnd),
        start: toIsoDate(today),
      });
      const response = await fetch(`/api/content-calendar?${params}`, {
        headers: authHeader,
      });
      const body = (await response.json()) as CalendarEntriesResponse;
      if (response.ok && body.ok && body.entries) {
        setEntries(
          entriesForNextDays(
            body.entries,
            DESK_CALENDAR_PREVIEW_DAYS,
            today
          ).slice(0, DESK_CALENDAR_PREVIEW_LIMIT)
        );
      } else {
        setLoadError(body.error ?? "Could not load the content calendar.");
      }
    } catch {
      setLoadError("Could not load the content calendar.");
    } finally {
      setIsLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, isLoading, loadError };
};

const readableCalendarDate = (iso: string): string => {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!(year && month && day)) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
};

const ContentCalendarWidget = ({
  auth,
}: {
  auth: ReturnType<typeof useGoogleDashboardAuth>;
}) => {
  const authHeader = useMemo<AuthHeader>(
    () => (auth.token ? { Authorization: `Bearer ${auth.token}` } : null),
    [auth.token]
  );
  const { entries, isLoading, loadError } = useDeskCalendarEntries(authHeader);

  return (
    <div className="desk-section">
      <div className="desk-section__heading">
        <Calendar aria-hidden height={22} width={22} />
        <div>
          <span>Content calendar</span>
          <h2>Upcoming planned content</h2>
        </div>
      </div>

      {authHeader ? null : (
        <p className="desk-empty">Sign in to load the content calendar.</p>
      )}
      {loadError ? <p className="desk-empty">{loadError}</p> : null}
      {authHeader && !loadError && isLoading && entries.length === 0 ? (
        <p className="desk-empty">Loading the content calendar...</p>
      ) : null}
      {authHeader && !isLoading && !loadError && entries.length === 0 ? (
        <p className="desk-empty">Nothing planned in the next 30 days.</p>
      ) : null}

      {entries.length > 0 ? (
        <ul className="desk-actions">
          {entries.map((entry) => (
            <li className="desk-action" key={entry.id}>
              <div>
                <time
                  className="desk-pill desk-pill--neutral"
                  dateTime={entry.scheduledFor}
                >
                  {readableCalendarDate(entry.scheduledFor)}
                </time>
                <h3>{entry.title}</h3>
                {entry.area ? <p>{entry.area}</p> : null}
              </div>
              <div className="desk-action__meta">
                <span>{channelLabels[entry.channel]}</span>
                <span>{statusLabels[entry.status]}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <TransitionLink className="desk-primary-link" to="/calendar">
        Manage calendar
      </TransitionLink>
    </div>
  );
};

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

          <label className="desk-canvass-name">
            <span>Target name</span>
            <input
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="Serenada — walk Saturday"
              type="text"
              value={name}
            />
          </label>

          {message ? (
            <p
              className={`desk-capture-message desk-capture-message--${message.tone}`}
            >
              {message.text}
            </p>
          ) : null}

          <div className="desk-canvass-builder__actions">
            <button
              className="desk-primary-link"
              disabled={isSaving || selectedTargets.length === 0}
              onClick={handleSave}
              type="button"
            >
              <CheckCircle aria-hidden height={18} width={18} />
              {(() => {
                if (isSaving) {
                  return "Saving...";
                }
                return editingId ? "Update target" : "Save target";
              })()}
            </button>
            {selectedTargets.length > 0 || editingId ? (
              <button
                className="desk-text-link"
                onClick={resetForm}
                type="button"
              >
                Clear
              </button>
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

const ChannelCard = ({ channel }: { channel: Channel }) => (
  <article className="desk-channel">
    <div className="desk-channel__topline">
      <span>{channel.source}</span>
      <span>{channel.risk} risk</span>
    </div>
    <h3>{channel.name}</h3>
    <p>{channel.fit}</p>
    <dl>
      <div>
        <dt>Cost</dt>
        <dd>{channel.cost}</dd>
      </div>
      <div>
        <dt>First use</dt>
        <dd>{channel.firstUse}</dd>
      </div>
    </dl>
  </article>
);

const CampaignAssetRow = ({ asset }: { asset: CampaignAsset }) => (
  <li className="desk-asset">
    <div>
      <strong>{asset.label}</strong>
      <span>{asset.status}</span>
    </div>
    <TransitionLink className="desk-text-link" to={asset.href}>
      {asset.action}
    </TransitionLink>
  </li>
);

const AuthPanel = ({
  auth,
}: {
  auth: ReturnType<typeof useGoogleDashboardAuth>;
}) => (
  <section className="desk-auth">
    <WarningTriangle aria-hidden height={22} width={22} />
    <div>
      <h1>Sign in to Desk</h1>
      <p>Private acquisition planning for Tandra's outreach work.</p>
      {auth.clientId ? <div ref={auth.buttonRef} /> : null}
      {auth.clientId ? null : (
        <p>
          Add <code>VITE_GOOGLE_CLIENT_ID</code> to enable dashboard sign-in.
        </p>
      )}
      {auth.authError ? <p>{auth.authError}</p> : null}
      {auth.clientId && !auth.ready ? <p>Loading Google sign-in...</p> : null}
    </div>
  </section>
);

const DeskDashboard = ({
  auth,
}: {
  auth: ReturnType<typeof useGoogleDashboardAuth>;
}) => (
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
            Build daily outreach from roof-age signals, neighborhood targeting,
            partner relationships, weather moments, and opt-in capture instead
            of waiting for leads that do not exist yet.
          </p>
        </div>
        <nav aria-label="Desk shortcuts" className="desk-hero__actions">
          <TransitionLink
            className="desk-primary-link"
            to="/roof-check/georgetown"
          >
            <Home aria-hidden height={18} width={18} />
            Open roof-check page
          </TransitionLink>
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
        <ContentCalendarWidget auth={auth} />
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
          </div>
          <ul className="desk-actions">
            {actionItems.map((item) => (
              <ActionRow item={item} key={item.label} />
            ))}
          </ul>
        </div>

        <aside className="desk-campaign">
          <span className="desk-pill desk-pill--critical">First campaign</span>
          <h2>Georgetown roof-check pack</h2>
          <p>
            One market, one message, one scan link. This is the first campaign
            to prove the desk can create traffic before a lead list exists.
          </p>
          <ul>
            {campaignAssets.map((asset) => (
              <CampaignAssetRow asset={asset} key={asset.label} />
            ))}
          </ul>
        </aside>
      </section>

      <section className="desk-section">
        <div className="desk-section__heading">
          <Community aria-hidden height={22} width={22} />
          <div>
            <span>Cheap/free sources</span>
            <h2>Acquisition channels to wire in</h2>
          </div>
        </div>
        <div className="desk-channel-grid">
          {channels.map((channel) => (
            <ChannelCard channel={channel} key={channel.name} />
          ))}
        </div>
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

export const DeskPage = () => {
  const auth = useGoogleDashboardAuth();
  const posthog = usePostHog();
  const requireAuth = !auth.token;

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
