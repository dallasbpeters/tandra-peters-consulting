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
  Trash,
  VideoCamera,
  WarningTriangle,
} from "iconoir-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DeskAreaMap } from "../components/desk-area-map";
import type {
  DeskAreaMapFocusZone,
  DeskAreaMapZonePoint,
} from "../components/desk-area-map";
import { PostcardPdfDownload } from "../components/desk/postcard-pdf";
import type { PostcardSize } from "../components/desk/postcard-pdf";
import { SitePageChrome } from "../components/site-page-chrome";
import { TransitionLink } from "../components/transition-link";
import { useGoogleDashboardAuth } from "../context/dashboard-auth-context";
import { useAdVersions } from "../hooks/use-ad-versions";
import type { AdCreativeVersion } from "../hooks/use-ad-versions";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { buildQrDataUri } from "../lib/qr-code";
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

interface AreaPolygon {
  coordinates: number[][][];
  type: "Polygon";
}

interface AreaMultiPolygon {
  coordinates: number[][][][];
  type: "MultiPolygon";
}

type AreaGeometry = AreaMultiPolygon | AreaPolygon;

interface DeskAreaTarget {
  capturePath: string;
  countyFips: string;
  countyLabel: string;
  dataMethod: string;
  dataStatus: string;
  firstMove: string;
  geometry: AreaGeometry | null;
  id: string;
  latitude: number;
  longitude: number;
  mailingAudience: string;
  mailingCity: string;
  mailingOffer: string;
  mailingRouteName: string;
  medianHomeAge: number | null;
  medianIncome: number | null;
  medianYearBuilt: number | null;
  neighborhoodLabel: string;
  olderHomeEstimate: number;
  olderHomeShare: number;
  ownerOccupied: number;
  ownerOccupiedShare: number;
  postalCode: string;
  priorityScore: number;
  recommendedMailerCount: number;
  squareMiles: number | null;
  totalHousingUnits: number;
  tractCount: number;
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
  rentcastReady: boolean;
  source: string;
  targets: DeskAreaTarget[];
}

interface CanvassNeighborhood {
  county: string;
  dataStatus?: string;
  homes: number;
  label: string;
  latitude: number | null;
  longitude: number | null;
  medianHomeAge?: number | null;
  medianIncome?: number | null;
  medianYearBuilt?: number | null;
  neighborhood: string;
  postalCode: string;
  recommendedMailerCount?: number;
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

interface DirectMailProviderOption {
  approxCost: string;
  canTestProof: boolean;
  fit: string;
  key: string;
  name: string;
  ready: boolean;
  recommended: boolean;
  requiredEnv: string[];
  setupLabel: string;
  setupUrl: string;
  uploadMode: string;
}

interface ProviderConnectionResult {
  accountLabel?: string;
  configured: boolean;
  message: string;
  ok: boolean;
  provider: string;
  providerKey: string;
}

interface ProviderTestProofResult {
  message: string;
  ok: boolean;
  proofUrl?: string;
  provider: string;
  providerKey: string;
}

interface DirectMailPlanResponse {
  estimatedPieces: number;
  generatedAt: string;
  nextSteps: string[];
  ok: boolean;
  provider: string;
  providerKey: string;
  providerReady: boolean;
  providers: DirectMailProviderOption[];
  rentcast: {
    matchedProperties: number;
    neighborhoodsQueried: number;
    recipientReadyCount: number;
    sampleAddresses: string[];
    status: "configured" | "missing-key" | "not-requested" | "unavailable";
  };
  requiredEnv: string[];
  sendEnabled: boolean;
  status: "draft" | "ready-for-recipients" | "send-disabled";
}

interface DeskTargetZone {
  createdAt: string;
  id: string;
  kind: "circle" | "polygon";
  label: string;
  latitude: number;
  longitude: number;
  /** Hand-drawn outline ([lng, lat] ring) for polygon zones. */
  polygon?: [number, number][];
  radiusMiles: number;
  targetIds: string[];
}

interface ZoneValidationResult {
  detail: string;
  items: string[];
  title: string;
  tone: "error" | "good" | "neutral";
}

interface AdVersionSummary {
  body?: string;
  dimensions?: string;
  headline?: string;
  layout?: string;
  platformId?: string;
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

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

const DEFAULT_ZONE_RADIUS_MILES = 0.4;
const MAX_STORED_ZONES = 8;
const MIN_ZONE_MAIL_PIECES = 35;
const MAX_ZONE_MAIL_PIECES = 275;
const MAX_ZONE_TARGET_COUNT = 5;
const EARTH_RADIUS_MILES = 3958.8;

const zoneRadiusOptions: readonly { label: string; value: number }[] = [
  { label: "0.25 mi", value: 0.25 },
  { label: "0.4 mi", value: DEFAULT_ZONE_RADIUS_MILES },
  { label: "0.6 mi", value: 0.6 },
] as const;

const postcardReturnAddressLines = [
  "Tandra Peters",
  "Birdcreek Roofing",
  "{{return_address_line1}}",
  "{{return_address_city}}, {{return_address_state}} {{return_address_zip}}",
] as const;

const POSTCARD_LANDING_PATH = "/estimate";
const TRAILING_SLASH_RE = /\/+$/;

/**
 * Scan destination for the postcard QR. Always points at the production site
 * (never localhost) so a printed proof resolves, and tags the source so scans
 * are attributable in analytics.
 */
const postcardScanUrl = (
  zone: DeskTargetZone | null,
  batchName: string
): string => {
  const origin =
    import.meta.env.VITE_SITE_URL?.trim().replace(TRAILING_SLASH_RE, "") ||
    "https://www.tandra.me";
  const source = (zone?.label ?? batchName ?? "").trim();
  const campaign = source ? slugify(source) : "postcard";
  const params = new URLSearchParams({
    utm_campaign: campaign,
    utm_medium: "direct_mail",
    utm_source: "postcard",
  });
  return `${origin}${POSTCARD_LANDING_PATH}?${params.toString()}`;
};

interface PostcardBackCopy {
  body: string;
  cta: string;
  headline: string;
}

const BACK_COPY_STORAGE_KEY = "desk-postcard-back-copy";
const EMPTY_BACK_COPY: PostcardBackCopy = { body: "", cta: "", headline: "" };
const DEFAULT_BACK_CTA = "Scan for a roof check or text 512-968-3965.";

const defaultBackHeadline = (zoneName: string): string =>
  `Roof age check for ${zoneName}`;

const defaultBackBody = (roofAgePhrase: string): string =>
  `I’m checking older roofs in this area this week. If your roof is ${roofAgePhrase}, I can take a look and explain what matters before you file anything.`;

const loadBackCopy = (): PostcardBackCopy => {
  if (typeof window === "undefined") {
    return EMPTY_BACK_COPY;
  }
  try {
    const raw = window.localStorage.getItem(BACK_COPY_STORAGE_KEY);
    if (!raw) {
      return EMPTY_BACK_COPY;
    }
    const parsed = JSON.parse(raw) as Partial<PostcardBackCopy>;
    return {
      body: typeof parsed.body === "string" ? parsed.body : "",
      cta: typeof parsed.cta === "string" ? parsed.cta : "",
      headline: typeof parsed.headline === "string" ? parsed.headline : "",
    };
  } catch {
    return EMPTY_BACK_COPY;
  }
};

const isBackCopyCustomized = (copy: PostcardBackCopy): boolean =>
  Boolean(copy.headline.trim() || copy.body.trim() || copy.cta.trim());

const rentcastPreviewNote = (
  status: DirectMailPlanResponse["rentcast"]["status"]
): string => {
  switch (status) {
    case "missing-key": {
      return "Connect recipient matching (set RENTCAST_API_KEY) or upload a list to preview individual addresses.";
    }
    case "unavailable": {
      return "These areas have no coordinates for address matching — upload a recipient list instead.";
    }
    case "not-requested": {
      return "Prepare the batch to match individual mailing addresses.";
    }
    default: {
      return "No single-family homes (built 2009 or earlier) matched inside these areas. Widen the zone or review the rules.";
    }
  }
};

const formatCurrencyValue = (value: number | null | undefined): string =>
  typeof value === "number" ? currencyFormatter.format(value) : "No data";

const formatYearValue = (value: number | null | undefined): string =>
  typeof value === "number" ? String(value) : "No data";

const stringFromRecord = (
  record: Record<string, unknown>,
  key: string
): string | undefined => {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const numberFromRecord = (
  record: Record<string, unknown>,
  key: string
): number | undefined => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
};

const creativeRecordFromConfig = (
  config: string
): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(config) as Record<string, unknown>;
    const creative = parsed.creative;
    return creative && typeof creative === "object"
      ? (creative as Record<string, unknown>)
      : parsed;
  } catch {
    return null;
  }
};

const summarizeAdVersion = (
  version: AdCreativeVersion | null
): AdVersionSummary | null => {
  if (!version) {
    return null;
  }
  const creative = creativeRecordFromConfig(version.config);
  if (!creative) {
    return null;
  }
  const width = numberFromRecord(creative, "adWidth");
  const height = numberFromRecord(creative, "adHeight");
  const unit = stringFromRecord(creative, "unit") ?? "px";
  return {
    body: stringFromRecord(creative, "body"),
    dimensions:
      typeof width === "number" && typeof height === "number"
        ? `${width} x ${height}${unit === "in" ? "in" : "px"}`
        : undefined,
    headline: stringFromRecord(creative, "headline"),
    layout: stringFromRecord(creative, "layout"),
    platformId: stringFromRecord(creative, "platformId"),
  };
};

const formatSavedCreativeDate = (savedAt?: string): string => {
  if (!savedAt) {
    return "Saved creative";
  }
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) {
    return "Saved creative";
  }
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date);
};

const degreesToRadians = (value: number): number => (value * Math.PI) / 180;

const milesBetween = (
  first: DeskAreaMapZonePoint,
  second: DeskAreaMapZonePoint
): number => {
  const lat1 = degreesToRadians(first.latitude);
  const lat2 = degreesToRadians(second.latitude);
  const deltaLat = degreesToRadians(second.latitude - first.latitude);
  const deltaLng = degreesToRadians(second.longitude - first.longitude);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return (
    EARTH_RADIUS_MILES *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
};

const createZoneId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `zone-${Date.now().toString(36)}`;

const closestTargets = (
  point: DeskAreaMapZonePoint,
  targets: readonly DeskAreaTarget[]
): DeskAreaTarget[] =>
  targets
    .map((target) => ({
      distance: milesBetween(point, {
        latitude: target.latitude,
        longitude: target.longitude,
      }),
      target,
    }))
    .toSorted((first, second) => first.distance - second.distance)
    .slice(0, 1)
    .map(({ target }) => target);

const targetsInsideZone = (
  point: DeskAreaMapZonePoint,
  radiusMiles: number,
  targets: readonly DeskAreaTarget[]
): DeskAreaTarget[] => {
  const inside = targets.filter(
    (target) =>
      milesBetween(point, {
        latitude: target.latitude,
        longitude: target.longitude,
      }) <= radiusMiles
  );
  return inside.length > 0 ? inside : closestTargets(point, targets);
};

const zoneLabelFor = (
  zoneTargets: readonly DeskAreaTarget[],
  radiusMiles: number
): string => {
  const primary = zoneTargets[0]?.neighborhoodLabel ?? "Austin";
  return `${primary} ${radiusMiles} mi mail zone`;
};

const selectedZoneTargets = (
  zone: DeskTargetZone | null,
  targets: readonly DeskAreaTarget[]
): DeskAreaTarget[] => {
  if (!zone) {
    return [];
  }
  const zoneIds = new Set(zone.targetIds);
  return targets.filter((target) => zoneIds.has(target.id));
};

const averageValue = (
  values: readonly (number | null | undefined)[]
): number | null => {
  const usable = values.filter(
    (value): value is number => typeof value === "number"
  );
  if (usable.length === 0) {
    return null;
  }
  return Math.round(
    usable.reduce((sum, value) => sum + value, 0) / usable.length
  );
};

const zoneCircleAreaSqMiles = (radiusMiles: number): number =>
  Math.PI * radiusMiles * radiusMiles;

const METERS_PER_DEGREE_LAT = 111_320;
const SQ_METERS_PER_SQ_MILE = 2_589_988.11;

/** Approximate polygon area using a local equirectangular projection + shoelace. */
const polygonAreaSqMiles = (ring: readonly [number, number][]): number => {
  if (ring.length < 3) {
    return 0;
  }
  const latRef = degreesToRadians(
    ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length
  );
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos(latRef);
  let doubleArea = 0;
  for (let index = 0; index < ring.length; index++) {
    const [lng1, lat1] = ring[index];
    const [lng2, lat2] = ring[(index + 1) % ring.length];
    const x1 = lng1 * metersPerDegreeLng;
    const y1 = lat1 * METERS_PER_DEGREE_LAT;
    const x2 = lng2 * metersPerDegreeLng;
    const y2 = lat2 * METERS_PER_DEGREE_LAT;
    doubleArea += x1 * y2 - x2 * y1;
  }
  return Math.abs(doubleArea) / 2 / SQ_METERS_PER_SQ_MILE;
};

/** Ray-casting point-in-polygon test against a [lng, lat] ring. */
const pointInRing = (
  lng: number,
  lat: number,
  ring: readonly [number, number][]
): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
};

const ringCentroid = (
  ring: readonly [number, number][]
): DeskAreaMapZonePoint => {
  const sum = ring.reduce(
    (acc, [lng, lat]) => ({
      latitude: acc.latitude + lat,
      longitude: acc.longitude + lng,
    }),
    { latitude: 0, longitude: 0 }
  );
  return {
    latitude: sum.latitude / ring.length,
    longitude: sum.longitude / ring.length,
  };
};

const targetsInPolygon = (
  ring: readonly [number, number][],
  targets: readonly DeskAreaTarget[]
): DeskAreaTarget[] => {
  const inside = targets.filter((target) =>
    pointInRing(target.longitude, target.latitude, ring)
  );
  return inside.length > 0
    ? inside
    : closestTargets(ringCentroid(ring), targets);
};

const zoneFootprintSqMiles = (zone: DeskTargetZone): number =>
  zone.kind === "polygon" && zone.polygon && zone.polygon.length >= 3
    ? polygonAreaSqMiles(zone.polygon)
    : zoneCircleAreaSqMiles(zone.radiusMiles);

/**
 * A zone snaps to whole neighborhoods, but it only mails the homes inside its
 * small footprint. Scale each neighborhood's mailer count by how much of it the
 * zone actually covers (footprint area ÷ neighborhood area) so the size changes
 * the count — otherwise every zone inherits the full tract and always reads
 * "too broad."
 */
const estimateMailPiecesForFootprint = (
  footprintSqMiles: number,
  zoneTargets: readonly DeskAreaTarget[]
): number => {
  const totalCount = zoneTargets.reduce(
    (sum, target) => sum + target.recommendedMailerCount,
    0
  );
  const totalArea = zoneTargets.reduce(
    (sum, target) =>
      sum +
      (typeof target.squareMiles === "number" && target.squareMiles > 0
        ? target.squareMiles
        : 0),
    0
  );
  if (totalArea <= 0) {
    return totalCount;
  }
  const density = totalCount / totalArea;
  return Math.min(
    totalCount,
    Math.max(1, Math.round(density * footprintSqMiles))
  );
};

const zoneMailPieceEstimate = (
  zone: DeskTargetZone,
  zoneTargets: readonly DeskAreaTarget[]
): number =>
  estimateMailPiecesForFootprint(zoneFootprintSqMiles(zone), zoneTargets);

const zoneValidationFor = (
  zone: DeskTargetZone | null,
  targets: readonly DeskAreaTarget[],
  mailPieces: number
): ZoneValidationResult => {
  if (!zone) {
    return {
      detail: "Turn on zone mode, choose a radius, then click the map.",
      items: ["No zone has been created yet."],
      title: "Create a small send zone",
      tone: "neutral",
    };
  }
  if (targets.length === 0 || mailPieces === 0) {
    return {
      detail: "This click did not land close enough to a mapped mail target.",
      items: ["Try a larger radius or click closer to a labeled area."],
      title: "No sendable homes found",
      tone: "error",
    };
  }
  if (
    mailPieces > MAX_ZONE_MAIL_PIECES ||
    targets.length > MAX_ZONE_TARGET_COUNT
  ) {
    return {
      detail: "This is likely bigger than Tandra should test first.",
      items: [
        "Lower the radius and click again.",
        "Split the area into two smaller postcard tests.",
      ],
      title: "Zone is too broad",
      tone: "error",
    };
  }
  if (mailPieces < MIN_ZONE_MAIL_PIECES) {
    return {
      detail:
        "This is small enough to be safe, but may be inefficient to print.",
      items: [
        "Increase the radius if the provider minimum is higher.",
        "Keep it if this is a hand-picked street cluster.",
      ],
      title: "Zone is very small",
      tone: "neutral",
    };
  }
  return {
    detail: "This is a reasonable first-send size for creative validation.",
    items: [
      "Save this target before changing the map.",
      "Prepare the mail batch and review addresses before sending.",
    ],
    title: "Zone is testable",
    tone: "good",
  };
};

const zoneNotes = (
  zone: DeskTargetZone | null,
  mailPieces: number
): string | undefined => {
  if (!zone) {
    return undefined;
  }
  return [
    "Small-zone mail target",
    `Center: ${zone.latitude.toFixed(5)}, ${zone.longitude.toFixed(5)}`,
    `Radius: ${zone.radiusMiles} miles`,
    `Estimated pieces: ${mailPieces}`,
    `Mapped target ids: ${zone.targetIds.join(", ")}`,
  ].join("\n");
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
    [
      "neighborhood",
      "county",
      "zip",
      "mail_pieces",
      "older_owner_homes",
      "median_income",
      "median_year_built",
      "median_home_age",
      "walked",
    ],
  ];
  for (const item of target.neighborhoods) {
    rows.push([
      item.neighborhood || item.label,
      item.county,
      item.postalCode,
      item.recommendedMailerCount ?? item.homes,
      item.homes,
      item.medianIncome ?? "",
      item.medianYearBuilt ?? "",
      item.medianHomeAge ?? "",
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
      rentcastReady: false,
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
  deletePending,
  onCancelDelete,
  onConfirmDelete,
  onRequestDelete,
  onStatusChange,
  record,
}: {
  busy: boolean;
  deletePending: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onRequestDelete: () => void;
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
    <div className="desk-calendar-row__actions">
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
      {deletePending ? (
        <div className="desk-calendar-row__delete-confirm">
          <button
            className="desk-delete-button desk-delete-button--confirm"
            disabled={busy}
            onClick={onConfirmDelete}
            type="button"
          >
            Delete
          </button>
          <button
            className="desk-delete-button"
            disabled={busy}
            onClick={onCancelDelete}
            type="button"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          aria-label={`Delete ${record.title}`}
          className="desk-delete-button"
          disabled={busy}
          onClick={onRequestDelete}
          type="button"
        >
          <Trash aria-hidden height={15} width={15} />
          Delete
        </button>
      )}
    </div>
  </li>
);

const neighborhoodLabelOf = (target: DeskAreaTarget): string =>
  target.neighborhoodLabel || target.tractLabel;

const targetToSnapshot = (target: DeskAreaTarget): CanvassNeighborhood => ({
  county: target.countyLabel,
  dataStatus: target.dataStatus,
  homes: target.olderHomeEstimate,
  label: target.tractLabel,
  latitude: target.latitude,
  longitude: target.longitude,
  medianHomeAge: target.medianHomeAge,
  medianIncome: target.medianIncome,
  medianYearBuilt: target.medianYearBuilt,
  neighborhood: neighborhoodLabelOf(target),
  postalCode: target.postalCode,
  recommendedMailerCount: target.recommendedMailerCount,
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
      <span>
        Income {formatCurrencyValue(target.medianIncome)} · Built{" "}
        {formatYearValue(target.medianYearBuilt)}
        {target.medianHomeAge ? ` · ${target.medianHomeAge} yrs` : ""}
      </span>
    </span>
    <span className="desk-canvass-row__homes">
      {formatNumber(target.recommendedMailerCount)}
      <small>mail pieces</small>
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
          {formatNumber(target.homesTotal)} mail pieces ·{" "}
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
        Creative
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

const directMailProviderStatus = (plan: DirectMailPlanResponse): string => {
  if (plan.providerKey === "mock") {
    return "planning only";
  }
  return plan.providerReady ? "send service ready" : "setup needed";
};

const validationMessageTone = (
  tone: ZoneValidationResult["tone"]
): CaptureMessage["tone"] => {
  if (tone === "good") {
    return "success";
  }
  if (tone === "error") {
    return "error";
  }
  return "neutral";
};

const ZoneBuilderPanel = ({
  activeZone,
  isDrawMode,
  isZoneMode,
  onDeleteZone,
  onOpenZone,
  onRadiusChange,
  onToggleDrawMode,
  onToggleZoneMode,
  onValidate,
  radiusMiles,
  validation,
  zones,
}: {
  activeZone: DeskTargetZone | null;
  isDrawMode: boolean;
  isZoneMode: boolean;
  onDeleteZone: (id: string) => void;
  onOpenZone: (zone: DeskTargetZone) => void;
  onRadiusChange: (value: string) => void;
  onToggleDrawMode: () => void;
  onToggleZoneMode: () => void;
  onValidate: () => void;
  radiusMiles: number;
  validation: ZoneValidationResult;
  zones: readonly DeskTargetZone[];
}) => (
  <div className="desk-zone-builder">
    <div className="desk-zone-builder__header">
      <div>
        <span>Small zone builder</span>
        <strong>Drop a quick radius or draw the exact streets.</strong>
      </div>
      <div className="desk-zone-builder__modes">
        <WaButton
          appearance="plain"
          className={isZoneMode ? "desk-primary-link" : "desk-action-button"}
          onClick={onToggleZoneMode}
        >
          {isZoneMode ? "Clicking map" : "Radius zone"}
        </WaButton>
        <WaButton
          appearance="plain"
          className={isDrawMode ? "desk-primary-link" : "desk-action-button"}
          onClick={onToggleDrawMode}
        >
          {isDrawMode ? "Drawing…" : "Draw polygon"}
        </WaButton>
      </div>
    </div>
    <label className="desk-zone-radius">
      <span>Radius</span>
      <WaSelect
        appearance="outlined"
        disabled={isDrawMode}
        onChange={(event) => onRadiusChange(waFieldValue(event))}
        size="small"
        value={String(radiusMiles)}
      >
        {zoneRadiusOptions.map((option) => (
          <WaOption key={option.value} value={String(option.value)}>
            {option.label}
          </WaOption>
        ))}
      </WaSelect>
    </label>
    {isDrawMode ? (
      <p className="desk-zone-draw-hint">
        Click to drop each corner around the streets you want, then click the
        first point (or double-click) to close the shape.
      </p>
    ) : null}
    <div
      className={`desk-zone-validation desk-zone-validation--${validation.tone}`}
    >
      <strong>{validation.title}</strong>
      <p>{validation.detail}</p>
      <ul>
        {validation.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <WaButton
        appearance="plain"
        className="desk-action-button"
        disabled={!activeZone}
        onClick={onValidate}
      >
        Validate zone
      </WaButton>
    </div>
    {zones.length > 0 ? (
      <ul className="desk-zone-list" aria-label="Clicked zones">
        {zones.map((zone) => (
          <li className="desk-zone-list__row" key={zone.id}>
            <button
              className={zone.id === activeZone?.id ? "is-active" : ""}
              onClick={() => onOpenZone(zone)}
              type="button"
            >
              <strong>{zone.label}</strong>
              <span>
                {zone.kind === "polygon"
                  ? "Drawn outline"
                  : `${zone.radiusMiles} mi radius`}
              </span>
            </button>
            <button
              aria-label={`Remove ${zone.label}`}
              className="desk-zone-list__remove"
              onClick={() => onDeleteZone(zone.id)}
              type="button"
            >
              <Trash aria-hidden height={15} width={15} />
            </button>
          </li>
        ))}
      </ul>
    ) : null}
  </div>
);

const CreativeVersionSelector = ({
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

const CapturedAreasPreview = ({
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

const roofAgePhraseFor = (
  selectedTargets: readonly DeskAreaTarget[]
): string => {
  const averageHomeAge = averageValue(
    selectedTargets.map((target) => target.medianHomeAge)
  );
  return averageHomeAge
    ? `around ${averageHomeAge} years old`
    : "15+ years old";
};

const PostcardBackEditor = ({
  batchName,
  copy,
  onChange,
  onReset,
  selectedTargets,
  zone,
}: {
  batchName: string;
  copy: PostcardBackCopy;
  onChange: (field: keyof PostcardBackCopy, value: string) => void;
  onReset: () => void;
  selectedTargets: readonly DeskAreaTarget[];
  zone: DeskTargetZone | null;
}) => {
  const zoneName = zone?.label ?? (batchName || "selected Austin area");
  const roofAgePhrase = roofAgePhraseFor(selectedTargets);
  const customized = isBackCopyCustomized(copy);
  return (
    <details className="desk-back-editor">
      <summary>Edit back copy{customized ? " · customized" : ""}</summary>
      <div className="desk-back-editor__fields">
        <label className="desk-back-editor__field">
          <span>Headline</span>
          <input
            onChange={(event) => onChange("headline", event.target.value)}
            placeholder={defaultBackHeadline(zoneName)}
            type="text"
            value={copy.headline}
          />
        </label>
        <label className="desk-back-editor__field">
          <span>Message</span>
          <textarea
            onChange={(event) => onChange("body", event.target.value)}
            placeholder={defaultBackBody(roofAgePhrase)}
            rows={4}
            value={copy.body}
          />
        </label>
        <label className="desk-back-editor__field">
          <span>Call to action</span>
          <input
            onChange={(event) => onChange("cta", event.target.value)}
            placeholder={DEFAULT_BACK_CTA}
            type="text"
            value={copy.cta}
          />
        </label>
        {customized ? (
          <button
            className="desk-action-button"
            onClick={onReset}
            type="button"
          >
            Reset to suggested copy
          </button>
        ) : (
          <p className="desk-back-editor__hint">
            Leave a field blank to use the suggested copy shown as placeholder
            text. Changes save automatically.
          </p>
        )}
      </div>
    </details>
  );
};

const PostcardBackTemplate = ({
  batchName,
  copy,
  selectedCreativeVersion,
  selectedTargets,
  size,
  zone,
}: {
  batchName: string;
  copy: PostcardBackCopy;
  selectedCreativeVersion: AdCreativeVersion | null;
  selectedTargets: readonly DeskAreaTarget[];
  size: PostcardSize;
  zone: DeskTargetZone | null;
}) => {
  const zoneName = zone?.label ?? (batchName || "selected Austin area");
  const roofAgePhrase = roofAgePhraseFor(selectedTargets);
  const scanUrl = postcardScanUrl(zone, batchName);
  const qrSrc = buildQrDataUri(scanUrl, "#123a34", "#ffffff");
  const headline = copy.headline.trim() || defaultBackHeadline(zoneName);
  const body = copy.body.trim() || defaultBackBody(roofAgePhrase);
  const cta = copy.cta.trim() || DEFAULT_BACK_CTA;

  return (
    <div className="desk-postcard-template">
      <div className="desk-postcard-template__heading">
        <div>
          <span>Postcard back</span>
          <strong>
            {selectedCreativeVersion
              ? `Back side paired with ${selectedCreativeVersion.name}.`
              : "Address-ready back side for print upload."}
          </strong>
        </div>
        <span className="desk-postcard-size-label">
          {size === "4x6" ? '4" × 6"' : '6" × 9"'}
        </span>
      </div>
      <div
        aria-label="Postcard back preview"
        className="desk-postcard-back"
        role="group"
      >
        <div className="desk-postcard-back__return">
          {postcardReturnAddressLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
        <div className="desk-postcard-back__postage">postage / indicia</div>
        <div className="desk-postcard-back__message">
          <strong>{headline}</strong>
          <p>{body}</p>
          <span>{cta}</span>
        </div>
        <div className="desk-postcard-back__qr">
          <img alt={`QR code linking to ${scanUrl}`} src={qrSrc} />
        </div>
        <address className="desk-postcard-back__recipient">
          <span>{"{{recipient_full_name}}"}</span>
          <span>{"{{mailing_address_line1}}"}</span>
          <span>{"{{mailing_address_line2}}"}</span>
          <span>{"{{mailing_city}}, {{mailing_state}} {{mailing_zip}}"}</span>
        </address>
      </div>
      <div className="desk-postcard-template__actions">
        <PostcardPdfDownload
          batchName={batchName}
          body={body}
          cta={cta}
          frontImageDataUri={selectedCreativeVersion?.thumbnail}
          headline={headline}
          qrDataUri={qrSrc}
          size={size}
        />
      </div>
    </div>
  );
};

const ProviderNote = ({
  ok,
  text,
  url,
  urlLabel,
}: {
  ok: boolean;
  text: string;
  url?: string;
  urlLabel?: string;
}) => (
  <p
    className={`desk-provider-note desk-provider-note--${ok ? "good" : "error"}`}
  >
    {text}
    {url ? (
      <a href={url} rel="noopener noreferrer" target="_blank">
        {urlLabel ?? "Open"}
      </a>
    ) : null}
  </p>
);

const ProviderRow = ({
  connection,
  hasCreative,
  isSelected,
  onTestProof,
  onUse,
  onVerify,
  proof,
  provider,
  testing,
  verifying,
}: {
  connection: ProviderConnectionResult | null;
  hasCreative: boolean;
  isSelected: boolean;
  onTestProof: (key: string) => void;
  onUse: (key: string) => void;
  onVerify: (key: string) => void;
  proof: ProviderTestProofResult | null;
  provider: DirectMailProviderOption;
  testing: boolean;
  verifying: boolean;
}) => {
  const showConnection = connection?.providerKey === provider.key;
  const showProof = proof?.providerKey === provider.key;
  return (
    <li className={isSelected ? "is-selected" : ""}>
      <div>
        <strong>
          {provider.name}
          {provider.recommended ? (
            <span className="desk-provider-badge">Recommended</span>
          ) : null}
        </strong>
        <small>{provider.fit}</small>
        <small>{provider.approxCost}</small>
        <small>Upload: {provider.uploadMode}</small>
        <em>{provider.ready ? "Connected" : "Setup needed"}</em>
      </div>
      <div className="desk-mail-plan__provider-actions">
        <WaButton
          appearance="plain"
          className="desk-action-button"
          disabled={verifying}
          onClick={() => onVerify(provider.key)}
        >
          {verifying ? "Checking…" : "Test connection"}
        </WaButton>
        <WaButton
          appearance="plain"
          className="desk-action-button"
          onClick={() => onUse(provider.key)}
        >
          {isSelected ? "Selected" : "Use this"}
        </WaButton>
        {provider.canTestProof ? (
          <WaButton
            appearance="plain"
            className="desk-action-button"
            disabled={testing || !hasCreative}
            onClick={() => onTestProof(provider.key)}
          >
            {testing ? "Sending…" : "Send test proof"}
          </WaButton>
        ) : null}
        {provider.setupUrl ? (
          <a href={provider.setupUrl} rel="noopener noreferrer" target="_blank">
            {provider.setupLabel}
          </a>
        ) : null}
      </div>
      {showConnection && connection ? (
        <ProviderNote
          ok={connection.ok}
          text={
            connection.accountLabel
              ? `${connection.message} · ${connection.accountLabel}`
              : connection.message
          }
        />
      ) : null}
      {showProof && proof ? (
        <ProviderNote
          ok={proof.ok}
          text={proof.message}
          url={proof.proofUrl}
          urlLabel="View proof PDF"
        />
      ) : null}
    </li>
  );
};

const DirectMailPlanPanel = ({
  adVersionsError,
  adVersionsLoading,
  backCopy,
  batchName,
  connection,
  creativeVersions,
  isPreparing,
  onBackCopyChange,
  onBackCopyReset,
  onPrepare,
  onSelectCreativeVersion,
  onSizeChange,
  onTestProof,
  onVerify,
  plan,
  proof,
  selectedCreativeVersion,
  selectedCount,
  selectedTargets,
  size,
  testingKey,
  verifyingKey,
  zone,
}: {
  adVersionsError: string | null;
  adVersionsLoading: boolean;
  backCopy: PostcardBackCopy;
  batchName: string;
  connection: ProviderConnectionResult | null;
  creativeVersions: readonly AdCreativeVersion[];
  isPreparing: boolean;
  onBackCopyChange: (field: keyof PostcardBackCopy, value: string) => void;
  onBackCopyReset: () => void;
  onPrepare: (provider?: string) => void;
  onSelectCreativeVersion: (id: string) => void;
  onSizeChange: (size: PostcardSize) => void;
  onTestProof: (key: string) => void;
  onVerify: (key: string) => void;
  plan: DirectMailPlanResponse | null;
  proof: ProviderTestProofResult | null;
  selectedCreativeVersion: AdCreativeVersion | null;
  selectedCount: number;
  selectedTargets: readonly DeskAreaTarget[];
  size: PostcardSize;
  testingKey: string | null;
  verifyingKey: string | null;
  zone: DeskTargetZone | null;
}) => {
  const hasSelection = selectedCount > 0;
  const selectedProviderKey = plan?.providerKey ?? "";
  const hasCreative = selectedCreativeVersion !== null;
  return (
    <div className="desk-mail-plan">
      <div>
        <span>Mail batch</span>
        <strong>
          {hasSelection
            ? "Prepare this zone, then connect a print/mail service."
            : "Create a zone first."}
        </strong>
        <p>
          {hasSelection
            ? "Pick a service below, test the connection, and send a no-charge proof. Nothing mails live until sending is enabled."
            : "Turn on zone mode and click the map, or manually select areas from the list."}
        </p>
      </div>
      {hasSelection ? (
        <CreativeVersionSelector
          error={adVersionsError}
          loading={adVersionsLoading}
          onSelect={onSelectCreativeVersion}
          selectedVersion={selectedCreativeVersion}
          versions={creativeVersions}
        />
      ) : null}
      <WaButton
        appearance="plain"
        className="desk-primary-link"
        disabled={isPreparing || !hasSelection}
        onClick={() => onPrepare()}
      >
        <Mail aria-hidden height={18} slot="start" width={18} />
        {isPreparing ? "Preparing..." : "Prepare mail batch"}
      </WaButton>
      {hasSelection ? (
        <CapturedAreasPreview plan={plan} selectedTargets={selectedTargets} />
      ) : null}
      {plan ? (
        <div className="desk-mail-plan__result">
          <div>
            <strong>{formatNumber(plan.estimatedPieces)}</strong>
            <span>planned mail pieces</span>
          </div>
          <div>
            <strong>{plan.provider}</strong>
            <span>{directMailProviderStatus(plan)}</span>
          </div>
          <div>
            <strong>{formatNumber(plan.rentcast.recipientReadyCount)}</strong>
            <span>matched mailing addresses</span>
          </div>
          {plan.nextSteps.length > 0 ? (
            <ul>
              {plan.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          ) : null}
          {plan.providers.length > 0 ? (
            <div className="desk-mail-plan__providers">
              <span>Print/mail services</span>
              <ul>
                {plan.providers.map((provider) => (
                  <ProviderRow
                    connection={connection}
                    hasCreative={hasCreative}
                    isSelected={provider.key === selectedProviderKey}
                    key={provider.key}
                    onTestProof={onTestProof}
                    onUse={onPrepare}
                    onVerify={onVerify}
                    proof={proof}
                    provider={provider}
                    testing={testingKey === provider.key}
                    verifying={verifyingKey === provider.key}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      {hasSelection ? (
        <>
          <PostcardBackEditor
            batchName={batchName}
            copy={backCopy}
            onChange={onBackCopyChange}
            onReset={onBackCopyReset}
            selectedTargets={selectedTargets}
            zone={zone}
          />
          <fieldset className="desk-postcard-size-picker">
            <legend>Postcard size</legend>
            {(["4x6", "6x9"] as const).map((s) => (
              <label key={s}>
                <input
                  checked={size === s}
                  name="postcard-size"
                  onChange={() => onSizeChange(s)}
                  type="radio"
                  value={s}
                />
                {s === "4x6" ? '4" × 6"' : '6" × 9"'}
              </label>
            ))}
          </fieldset>
          <PostcardBackTemplate
            batchName={batchName}
            copy={backCopy}
            selectedCreativeVersion={selectedCreativeVersion}
            selectedTargets={selectedTargets}
            size={size}
            zone={zone}
          />
        </>
      ) : null}
    </div>
  );
};

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
  notes?: string;
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

  const deleteItem = useCallback(
    async (record: DeskBoardRecord): Promise<void> => {
      setBusyKey(record.id);
      setBoardMessage(null);
      try {
        const response = await fetch(
          `/api/desk-board?id=${encodeURIComponent(record.id)}`,
          {
            headers: authHeader ?? undefined,
            method: "DELETE",
          }
        );
        const body = (await response.json()) as DeskBoardResponse;
        if (response.ok && body.ok) {
          setRecords((current) =>
            current.filter((entry) => entry.id !== record.id)
          );
          setBoardMessage({
            text: "Deleted planned content.",
            tone: "success",
          });
          return;
        }
        setBoardMessage({
          text: body.error ?? "Could not delete this planned content.",
          tone: "error",
        });
      } catch {
        setBoardMessage({
          text: "Could not delete this planned content.",
          tone: "error",
        });
      } finally {
        setBusyKey(null);
      }
    },
    [authHeader]
  );

  return {
    boardMessage,
    busyKey,
    deleteItem,
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
  const adVersions = useAdVersions();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusIds, setFocusIds] = useState<string[]>([]);
  const [focusZone, setFocusZone] = useState<DeskAreaMapFocusZone | null>(null);
  const [backCopy, setBackCopy] = useState<PostcardBackCopy>(loadBackCopy);
  const [postcardSize, setPostcardSize] = useState<PostcardSize>("6x9");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreparingMail, setIsPreparingMail] = useState(false);
  const [mailPlan, setMailPlan] = useState<DirectMailPlanResponse | null>(null);
  const [message, setMessage] = useState<CaptureMessage | null>(null);
  const [zones, setZones] = useState<DeskTargetZone[]>([]);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [isZoneMode, setIsZoneMode] = useState(false);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [zoneRadiusMiles, setZoneRadiusMiles] = useState(
    DEFAULT_ZONE_RADIUS_MILES
  );
  const [selectedCreativeVersionId, setSelectedCreativeVersionId] =
    useState("");
  const [connection, setConnection] = useState<ProviderConnectionResult | null>(
    null
  );
  const [proof, setProof] = useState<ProviderTestProofResult | null>(null);
  const [verifyingKey, setVerifyingKey] = useState<string | null>(null);
  const [testingKey, setTestingKey] = useState<string | null>(null);

  const targets = useMemo(() => intel?.targets ?? [], [intel]);
  const counties = useMemo(() => intel?.counties ?? [], [intel]);

  const toggleSelect = useCallback((id: string) => {
    setActiveZoneId(null);
    setMailPlan(null);
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
  const selectedMailPieces = selectedTargets.reduce(
    (sum, target) => sum + target.recommendedMailerCount,
    0
  );
  const hasSelection = selectedTargets.length > 0;
  const activeZone = useMemo(
    () => zones.find((zone) => zone.id === activeZoneId) ?? null,
    [activeZoneId, zones]
  );
  const selectedCreativeVersion = useMemo(
    () =>
      adVersions.versions.find(
        (version) => version.id === selectedCreativeVersionId
      ) ?? null,
    [adVersions.versions, selectedCreativeVersionId]
  );
  const zoneMailPieces = useMemo(() => {
    if (!activeZone) {
      return selectedMailPieces;
    }
    return zoneMailPieceEstimate(
      activeZone,
      selectedZoneTargets(activeZone, targets)
    );
  }, [activeZone, selectedMailPieces, targets]);
  const zoneValidation = useMemo(
    () => zoneValidationFor(activeZone, selectedTargets, zoneMailPieces),
    [activeZone, selectedTargets, zoneMailPieces]
  );
  const mapZones = useMemo(
    () =>
      zones.map((zone) => {
        const zoneTargets = selectedZoneTargets(zone, targets);
        const mailPieces = zoneMailPieceEstimate(zone, zoneTargets);
        return {
          id: zone.id,
          label: zone.label,
          latitude: zone.latitude,
          longitude: zone.longitude,
          mailPieces,
          polygon: zone.polygon,
          radiusMiles: zone.radiusMiles,
          selected: zone.id === activeZoneId,
          targetCount: zoneTargets.length,
        };
      }),
    [activeZoneId, targets, zones]
  );

  const resetForm = useCallback(() => {
    setSelectedIds([]);
    setActiveZoneId(null);
    setName("");
    setEditingId(null);
    setMailPlan(null);
  }, []);

  const openZone = useCallback(
    (zone: DeskTargetZone) => {
      const zoneTargets = selectedZoneTargets(zone, targets);
      const ids = zoneTargets.map((target) => target.id);
      setActiveZoneId(zone.id);
      setSelectedIds(ids);
      setFocusZone({
        latitude: zone.latitude,
        longitude: zone.longitude,
        radiusMiles: zone.radiusMiles,
      });
      setName(zone.label);
      setMailPlan(null);
      setMessage(null);
    },
    [targets]
  );

  const handleDeleteZone = useCallback(
    (id: string) => {
      setZones((current) => current.filter((zone) => zone.id !== id));
      if (activeZoneId === id) {
        setActiveZoneId(null);
        setSelectedIds([]);
        setFocusZone(null);
        setName("");
        setMailPlan(null);
        setMessage(null);
      }
    },
    [activeZoneId]
  );

  useEffect(() => {
    window.localStorage.setItem(
      BACK_COPY_STORAGE_KEY,
      JSON.stringify(backCopy)
    );
  }, [backCopy]);

  const handleBackCopyChange = useCallback(
    (field: keyof PostcardBackCopy, value: string) => {
      setBackCopy((current) => ({ ...current, [field]: value }));
    },
    []
  );

  const handleBackCopyReset = useCallback(() => {
    setBackCopy(EMPTY_BACK_COPY);
  }, []);

  const handleCreateZone = useCallback(
    (point: DeskAreaMapZonePoint) => {
      const zoneTargets = targetsInsideZone(point, zoneRadiusMiles, targets);
      const targetIds = zoneTargets.map((target) => target.id);
      const zone: DeskTargetZone = {
        createdAt: new Date().toISOString(),
        id: createZoneId(),
        kind: "circle",
        label: zoneLabelFor(zoneTargets, zoneRadiusMiles),
        latitude: point.latitude,
        longitude: point.longitude,
        radiusMiles: zoneRadiusMiles,
        targetIds,
      };
      setZones((current) => [zone, ...current].slice(0, MAX_STORED_ZONES));
      setActiveZoneId(zone.id);
      setSelectedIds(targetIds);
      // Keep the camera on the spot the user clicked — do not refit to the
      // matched targets' bounds, which yanks the map to a different center.
      setName(zone.label);
      setMailPlan(null);
      setMessage({
        text:
          targetIds.length > 0
            ? "Zone created. Validate it before sending."
            : "No mapped mail targets were found near that click.",
        tone: targetIds.length > 0 ? "success" : "error",
      });
    },
    [targets, zoneRadiusMiles]
  );

  const handleDrawZone = useCallback(
    (ring: [number, number][]) => {
      const zoneTargets = targetsInPolygon(ring, targets);
      const targetIds = zoneTargets.map((target) => target.id);
      const center = ringCentroid(ring);
      // Equivalent radius keeps the camera-focus + circle fallbacks sensible.
      const equivalentRadius = Math.sqrt(polygonAreaSqMiles(ring) / Math.PI);
      const zone: DeskTargetZone = {
        createdAt: new Date().toISOString(),
        id: createZoneId(),
        kind: "polygon",
        label: `${zoneTargets[0]?.neighborhoodLabel ?? "Austin"} custom zone`,
        latitude: center.latitude,
        longitude: center.longitude,
        polygon: ring,
        radiusMiles: Math.max(0.05, Math.round(equivalentRadius * 100) / 100),
        targetIds,
      };
      setZones((current) => [zone, ...current].slice(0, MAX_STORED_ZONES));
      setActiveZoneId(zone.id);
      setSelectedIds(targetIds);
      setIsDrawMode(false);
      setName(zone.label);
      setMailPlan(null);
      setMessage({
        text:
          targetIds.length > 0
            ? "Zone drawn. Validate it before sending."
            : "No mapped mail targets fell inside that outline.",
        tone: targetIds.length > 0 ? "success" : "error",
      });
    },
    [targets]
  );

  const toggleZoneMode = useCallback(() => {
    setIsDrawMode(false);
    setIsZoneMode((current) => !current);
  }, []);

  const toggleDrawMode = useCallback(() => {
    setIsZoneMode(false);
    setIsDrawMode((current) => !current);
  }, []);

  const handleRadiusChange = useCallback((value: string) => {
    const nextRadius = Number(value);
    if (Number.isFinite(nextRadius)) {
      setZoneRadiusMiles(nextRadius);
    }
  }, []);

  const handleValidateZone = useCallback(() => {
    setMessage({
      text: `${zoneValidation.title}: ${zoneValidation.detail}`,
      tone: validationMessageTone(zoneValidation.tone),
    });
  }, [zoneValidation]);

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
      notes: zoneNotes(activeZone, zoneMailPieces),
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
  }, [
    activeZone,
    authHeader,
    editingId,
    name,
    resetForm,
    saveTarget,
    selectedTargets,
    zoneMailPieces,
  ]);

  const handlePrepareMail = useCallback(
    async (provider?: string) => {
      const invalid = saveValidationError(
        Boolean(authHeader),
        selectedTargets.length,
        name || "Mail batch"
      );
      if (invalid) {
        setMessage({ text: invalid, tone: "error" });
        return;
      }

      setIsPreparingMail(true);
      setMessage(null);
      setMailPlan(null);
      try {
        const response = await fetch("/api/desk-direct-mail", {
          body: JSON.stringify({
            includeRecipients: true,
            name: name || "Austin neighborhood mail batch",
            neighborhoods: selectedTargets.map(targetToSnapshot),
            provider,
            selectedCreative: selectedCreativeVersion
              ? {
                  id: selectedCreativeVersion.id,
                  name: selectedCreativeVersion.name,
                  savedAt: selectedCreativeVersion.savedAt,
                }
              : undefined,
            zone: activeZone
              ? {
                  id: activeZone.id,
                  label: activeZone.label,
                  latitude: activeZone.latitude,
                  longitude: activeZone.longitude,
                  radiusMiles: activeZone.radiusMiles,
                }
              : undefined,
          }),
          headers: {
            ...authHeader,
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const body = (await response.json()) as DirectMailPlanResponse & {
          error?: string;
        };
        if (response.ok && body.ok) {
          setMailPlan(body);
          return;
        }
        setMessage({
          text: body.error ?? "Could not prepare this mail batch.",
          tone: "error",
        });
      } catch {
        setMessage({
          text: "Could not prepare this mail batch.",
          tone: "error",
        });
      } finally {
        setIsPreparingMail(false);
      }
    },
    [activeZone, authHeader, name, selectedCreativeVersion, selectedTargets]
  );

  const handleVerifyProvider = useCallback(
    async (providerKey: string) => {
      setVerifyingKey(providerKey);
      setConnection(null);
      try {
        const response = await fetch("/api/desk-direct-mail", {
          body: JSON.stringify({ action: "verify", provider: providerKey }),
          headers: { ...authHeader, "Content-Type": "application/json" },
          method: "POST",
        });
        const body = (await response.json()) as {
          connection?: ProviderConnectionResult;
        };
        setConnection(
          body.connection ?? {
            configured: false,
            message: "The connection check returned nothing.",
            ok: false,
            provider: providerKey,
            providerKey,
          }
        );
      } catch {
        setConnection({
          configured: false,
          message: "Could not reach the connection check.",
          ok: false,
          provider: providerKey,
          providerKey,
        });
      } finally {
        setVerifyingKey(null);
      }
    },
    [authHeader]
  );

  const handleTestProof = useCallback(
    async (providerKey: string) => {
      setTestingKey(providerKey);
      setProof(null);
      try {
        const response = await fetch("/api/desk-direct-mail", {
          body: JSON.stringify({
            action: "test",
            front: selectedCreativeVersion?.thumbnail,
            provider: providerKey,
            size: postcardSize,
          }),
          headers: { ...authHeader, "Content-Type": "application/json" },
          method: "POST",
        });
        const body = (await response.json()) as {
          proof?: ProviderTestProofResult;
        };
        setProof(
          body.proof ?? {
            message: "The test proof service returned nothing.",
            ok: false,
            provider: providerKey,
            providerKey,
          }
        );
      } catch {
        setProof({
          message: "Could not reach the test proof service.",
          ok: false,
          provider: providerKey,
          providerKey,
        });
      } finally {
        setTestingKey(null);
      }
    },
    [authHeader, selectedCreativeVersion]
  );

  const openTarget = useCallback((target: CanvassTargetRecord) => {
    const ids = target.neighborhoods
      .map((item) => item.tractFips)
      .filter(Boolean);
    setSelectedIds(ids);
    setActiveZoneId(null);
    setFocusIds([...ids]);
    setName(target.name);
    setEditingId(target.id);
    setMailPlan(null);
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
          <span>Austin neighborhood map</span>
          <h2>Where to send first postcards</h2>
        </div>
      </div>

      <div className="desk-area-intel__intro">
        <p>
          Every City of Austin neighborhood boundary is mapped with household
          income, median home age, owner-occupied concentration, and older-home
          share. Click the map to create a smaller send zone, validate the
          count, then prepare a recipient batch.
        </p>
        <div className="desk-area-intel__source">
          <span>
            {intel
              ? "Live neighborhood and household signals"
              : "Loading neighborhood signals..."}
          </span>
        </div>
      </div>

      {intelError ? <p className="desk-empty">{intelError}</p> : null}

      <div className="desk-area-intel__layout">
        <DeskAreaMap
          drawMode={isDrawMode}
          focusIds={focusIds}
          focusZone={focusZone}
          onCreateZone={handleCreateZone}
          onDrawZone={handleDrawZone}
          onToggleSelect={toggleSelect}
          selectedIds={selectedIds}
          targets={targets}
          zoneMode={isZoneMode}
          zones={mapZones}
        />

        <div className="desk-canvass-builder">
          <div className="desk-canvass-summary">
            <div>
              <strong>{selectedTargets.length}</strong>
              <span>selected</span>
            </div>
            <div>
              <strong>{formatNumber(zoneMailPieces)}</strong>
              <span>mail pieces</span>
            </div>
          </div>

          <ZoneBuilderPanel
            activeZone={activeZone}
            isDrawMode={isDrawMode}
            isZoneMode={isZoneMode}
            onDeleteZone={handleDeleteZone}
            onOpenZone={openZone}
            onRadiusChange={handleRadiusChange}
            onToggleDrawMode={toggleDrawMode}
            onToggleZoneMode={toggleZoneMode}
            onValidate={handleValidateZone}
            radiusMiles={zoneRadiusMiles}
            validation={zoneValidation}
            zones={zones}
          />

          {hasSelection ? (
            <div className="desk-canvass-name">
              <span>Target name</span>
              <WaInput
                onChange={(event) => setName(waFieldValue(event))}
                placeholder="Serenada — walk Saturday"
                type="text"
                value={name}
              />
            </div>
          ) : (
            <p className="desk-selection-empty">
              Create a zone from the map, or manually select areas from the
              list, to unlock saving and mail batch prep.
            </p>
          )}

          {message ? (
            <p
              className={`desk-capture-message desk-capture-message--${message.tone}`}
            >
              {message.text}
            </p>
          ) : null}

          {hasSelection ? (
            <div className="desk-canvass-builder__actions">
              <WaButton
                appearance="plain"
                className="desk-primary-link"
                disabled={isSaving}
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
              <WaButton
                appearance="plain"
                className="desk-action-button"
                onClick={resetForm}
              >
                Clear
              </WaButton>
            </div>
          ) : null}

          <DirectMailPlanPanel
            adVersionsError={adVersions.error}
            adVersionsLoading={adVersions.loading}
            backCopy={backCopy}
            batchName={name}
            connection={connection}
            creativeVersions={adVersions.versions}
            isPreparing={isPreparingMail}
            onBackCopyChange={handleBackCopyChange}
            onBackCopyReset={handleBackCopyReset}
            onPrepare={handlePrepareMail}
            onSelectCreativeVersion={setSelectedCreativeVersionId}
            onSizeChange={setPostcardSize}
            onTestProof={handleTestProof}
            onVerify={handleVerifyProvider}
            plan={mailPlan}
            proof={proof}
            selectedCreativeVersion={selectedCreativeVersion}
            selectedCount={selectedTargets.length}
            selectedTargets={selectedTargets}
            size={postcardSize}
            testingKey={testingKey}
            verifyingKey={verifyingKey}
            zone={activeZone}
          />

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
                No Austin neighborhoods returned from the live data APIs.
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
            postcard test.
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
