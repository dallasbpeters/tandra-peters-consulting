/**
 * Per-home walk (canvass) types + pure helpers shared by the walk UI and hook.
 *
 * This is the RICHER per-home layer. The neighborhood-level CSV export lives in
 * `desk-walk-sheet.ts` and stays untouched.
 *
 * Privacy: a `RosterHome` NEVER carries a homeowner name — the server strips it
 * in `collectHomeRoster` before anything reaches the client. Nothing here should
 * reintroduce owner PII.
 */

/** Single per-home canvass status (roofer-natural, 8-value enum). */
export type WalkStatus =
  | "not-started"
  | "no-answer"
  | "talked"
  | "not-interested"
  | "come-back"
  | "left-material"
  | "booked"
  | "skip";

export const DEFAULT_WALK_STATUS: WalkStatus = "not-started";

/** Ordered for the status chip grid + progress breakdown. */
export const WALK_STATUS_ORDER: readonly WalkStatus[] = [
  "not-started",
  "no-answer",
  "talked",
  "come-back",
  "left-material",
  "not-interested",
  "booked",
  "skip",
];

/** Full labels for menus / legends. */
export const walkStatusLabels: Record<WalkStatus, string> = {
  booked: "Booked",
  "come-back": "Come back",
  "left-material": "Left a door hanger",
  "no-answer": "No answer",
  "not-interested": "Not interested",
  "not-started": "Not knocked",
  skip: "Do not contact",
  talked: "Talked",
};

/** Short labels for thumb-sized chips where space is tight. */
export const walkStatusShortLabels: Record<WalkStatus, string> = {
  booked: "Booked",
  "come-back": "Come back",
  "left-material": "Hanger",
  "no-answer": "No answer",
  "not-interested": "Declined",
  "not-started": "Not yet",
  skip: "Skip",
  talked: "Talked",
};

/** Concrete pin colors for the per-home map (mirrors the `desk-walk-chip--*` CSS). */
export const walkStatusColors: Record<WalkStatus, string> = {
  booked: "#2f8f5b",
  "come-back": "#e0a92e",
  "left-material": "#8a5cc0",
  "no-answer": "#9aa6a0",
  "not-interested": "#c9503a",
  "not-started": "#c2ccc6",
  skip: "#5b6560",
  talked: "#3b6cb4",
};

/** A status counts as "knocked" once it moves off the default. */
export const isKnocked = (status: WalkStatus): boolean =>
  status !== "not-started";

const KNOWN_STATUSES = new Set<WalkStatus>(WALK_STATUS_ORDER);

export const isWalkStatus = (value: unknown): value is WalkStatus =>
  typeof value === "string" && KNOWN_STATUSES.has(value as WalkStatus);

export const coerceWalkStatus = (value: unknown): WalkStatus =>
  isWalkStatus(value) ? value : DEFAULT_WALK_STATUS;

/** Roster item — non-PII property signals from RentCast (read-only). */
export interface RosterHome {
  address: string;
  addressLine1: string;
  city: string;
  homeAge: number | null;
  homeKey: string;
  latitude: number | null;
  longitude: number | null;
  ownerOccupied: boolean | null;
  propertyType: string | null;
  squareFootage: number | null;
  state: string;
  yearBuilt: number | null;
  zip: string;
}

/** User-entered, persisted per-home visit state. */
export interface WalkVisit {
  createdAt?: string;
  createdBy?: string;
  followUpDate?: string;
  homeKey: string;
  notes?: string;
  status: WalkStatus;
  targetId: string;
  updatedAt?: string;
}

/** Roster ⊕ visit, the shape the UI renders per home. */
export interface WalkHome extends RosterHome {
  followUpDate?: string;
  notes?: string;
  status: WalkStatus;
  updatedAt?: string;
}

export interface WalkHomesResponse {
  capped?: boolean;
  error?: string;
  homes?: RosterHome[];
  ok: boolean;
  status?: "configured" | "missing-key" | "unavailable";
  total?: number;
}

export interface WalkVisitsResponse {
  error?: string;
  ok: boolean;
  visits?: WalkVisit[];
}

export interface WalkVisitResponse {
  error?: string;
  ok: boolean;
  visit?: WalkVisit;
}

export const MAX_WALK_NOTE_LENGTH = 1400;

// 32-bit FNV-1a → 8 hex chars. A deterministic, dependency-free, SYNC hash so
// the SAME homeKey can be derived in the browser, in vitest, and on the server
// without SubtleCrypto's async API. The server mirrors this exact algorithm in
// `api/lib/desk-direct-mail.ts` so a home maps to one stable key everywhere.
const FNV_OFFSET_BASIS = 0x81_1c_9d_c5;
const FNV_PRIME = 0x01_00_01_93;

const fnv1aHex = (input: string): string => {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.codePointAt(index) ?? 0;
    hash = Math.imul(hash, FNV_PRIME);
  }
  // Coerce the Math.imul (signed int32) result to unsigned before hex-formatting.
  const unsigned = hash < 0 ? hash + 0x1_00_00_00_00 : hash;
  return unsigned.toString(16).padStart(8, "0");
};

/**
 * Stable per-home id. Prefer the RentCast `id`; otherwise hash
 * `lower(addressLine1)|zip` so homes with no RentCast id still get one key.
 */
export const deriveHomeKey = (
  id: string | null | undefined,
  addressLine1: string,
  zip: string
): string => {
  const rentcastId = typeof id === "string" ? id.trim() : "";
  if (rentcastId) {
    return rentcastId;
  }
  return `addr-${fnv1aHex(`${addressLine1.trim().toLowerCase()}|${zip.trim()}`)}`;
};

const CURRENT_YEAR = new Date().getFullYear();

/** Home age from `yearBuilt`, else the zone median as a fallback. */
export const roofAgeYears = (
  home: Pick<RosterHome, "homeAge" | "yearBuilt">,
  fallbackHomeAge?: number | null
): number | null => {
  if (typeof home.homeAge === "number") {
    return home.homeAge;
  }
  if (typeof home.yearBuilt === "number") {
    return Math.max(0, CURRENT_YEAR - home.yearBuilt);
  }
  return typeof fallbackHomeAge === "number" ? fallbackHomeAge : null;
};

/**
 * Merge the RentCast roster with persisted visits by `homeKey`. Homes with no
 * visit default to `not-started`. Locally-queued edits (offline layer) are
 * applied last so optimistic changes always win over the last server snapshot.
 */
export const mergeRosterWithVisits = (
  homes: readonly RosterHome[],
  visits: readonly WalkVisit[]
): WalkHome[] => {
  const visitByKey = new Map<string, WalkVisit>();
  for (const visit of visits) {
    visitByKey.set(visit.homeKey, visit);
  }
  return homes.map((home) => {
    const visit = visitByKey.get(home.homeKey);
    return {
      ...home,
      followUpDate: visit?.followUpDate,
      notes: visit?.notes,
      status: coerceWalkStatus(visit?.status),
      updatedAt: visit?.updatedAt,
    };
  });
};

export interface WalkProgress {
  byStatus: Record<WalkStatus, number>;
  knocked: number;
  total: number;
}

/** Progress summary for the sticky header + breakdown. */
export const summarizeWalk = (homes: readonly WalkHome[]): WalkProgress => {
  const byStatus = Object.fromEntries(
    WALK_STATUS_ORDER.map((status) => [status, 0])
  ) as Record<WalkStatus, number>;
  let knocked = 0;
  for (const home of homes) {
    byStatus[home.status] += 1;
    if (isKnocked(home.status)) {
      knocked += 1;
    }
  }
  return { byStatus, knocked, total: homes.length };
};
