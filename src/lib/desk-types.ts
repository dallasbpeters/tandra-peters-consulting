export type Tone = "critical" | "warm" | "good" | "neutral";

export interface Metric {
  label: string;
  note: string;
  value: string;
}

export interface ActionItem {
  channel: string;
  due: string;
  href: string;
  label: string;
  outcome: string;
  owner: string;
  tone: Tone;
}

export interface CampaignAsset {
  action: string;
  href: string;
  label: string;
  status: string;
}

export type DeskBoardKindValue = "content" | "task";
export type DeskBoardStatusValue =
  | "done"
  | "idea"
  | "published"
  | "scheduled"
  | "todo";
export type DeskPlanModeValue = "content" | "tasks";

export interface DeskBoardRecord {
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

export interface DeskBoardResponse {
  error?: string;
  item?: DeskBoardRecord;
  items?: DeskBoardRecord[];
  ok: boolean;
}

export interface CaptureMessage {
  text: string;
  tone: "error" | "neutral" | "success";
}

export interface AreaPolygon {
  coordinates: number[][][];
  type: "Polygon";
}

export interface AreaMultiPolygon {
  coordinates: number[][][][];
  type: "MultiPolygon";
}

export type AreaGeometry = AreaMultiPolygon | AreaPolygon;

export interface DeskAreaTarget {
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

export interface DeskAreaCounty {
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

export interface DeskAreaIntelResponse {
  counties: DeskAreaCounty[];
  error?: string;
  generatedAt: string;
  ok: boolean;
  release: string;
  rentcastReady: boolean;
  source: string;
  targets: DeskAreaTarget[];
}

export interface CanvassNeighborhood {
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

/**
 * Persisted geometry for a saved area so it can be reloaded into the builder.
 * A `polygon` (drawn) save carries the outline + area-based estimate and NO
 * tract ids; a `circle` (radius) save carries the centroid + radius.
 */
export interface SavedTargetZone {
  estimatedPieces?: number;
  kind: "circle" | "polygon";
  latitude: number;
  longitude: number;
  /** Outline ([lng, lat] ring) for polygon zones. */
  polygon?: [number, number][];
  radiusMiles: number;
}

export interface CanvassTargetRecord {
  createdAt: string;
  createdBy: string;
  homesTotal: number;
  id: string;
  name: string;
  neighborhoods: CanvassNeighborhood[];
  notes?: string;
  status: string;
  updatedAt: string;
  /** Geometry captured at save time, used to reload the area into the builder. */
  zone?: SavedTargetZone;
}

export interface CanvassTargetResponse {
  error?: string;
  ok: boolean;
  target?: CanvassTargetRecord;
  targets?: CanvassTargetRecord[];
}

export interface DirectMailProviderOption {
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

export interface ProviderConnectionResult {
  accountLabel?: string;
  configured: boolean;
  message: string;
  ok: boolean;
  provider: string;
  providerKey: string;
}

export interface ProviderTestProofResult {
  message: string;
  ok: boolean;
  proofUrl?: string;
  provider: string;
  providerKey: string;
}

export interface ProviderSubmitResult {
  message: string;
  mode: "live" | "test";
  ok: boolean;
  orderCount?: number;
  orderId?: string;
  previewUrl?: string;
  provider: string;
  providerKey: string;
}

export interface ProviderKeyFieldStatus {
  configured: boolean;
  /** Masked hint only — e.g. "••••1234". Never the raw key value. */
  hint: string;
  name: string;
  source: "env" | "missing" | "stored";
}

export interface ProviderKeysStatusResult {
  keys: ProviderKeyFieldStatus[];
  providerKey: string;
  secretStoreReady: boolean;
}

export interface DirectMailPlanResponse {
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

export interface DirectMailAddressListResponse {
  addresses: string[];
  capped: boolean;
  matchedProperties: number;
  neighborhoodsQueried: number;
  ok: boolean;
  status: "configured" | "missing-key" | "unavailable";
  totalAddresses: number;
}

export interface DeskTargetZone {
  createdAt: string;
  /**
   * Audience size for a self-contained drawn (polygon) zone, derived from the
   * polygon's area × local homeowner density. Draw mode selects no tracts, so
   * this — not `targetIds` — carries the mail-piece estimate for polygon zones.
   */
  estimatedPieces?: number;
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

export interface ZoneValidationResult {
  detail: string;
  items: string[];
  title: string;
  tone: "error" | "good" | "neutral";
}

export interface AdVersionSummary {
  body?: string;
  dimensions?: string;
  headline?: string;
  layout?: string;
  platformId?: string;
}

export type CanvassStatus = "planned" | "walking" | "done";

export interface PostcardBackCopy {
  body: string;
  cta: string;
  headline: string;
}

export interface PostcardReturnAddress {
  city: string;
  company: string;
  line1: string;
  line2: string;
  name: string;
  state: string;
  zip: string;
}

export type AuthHeader = { Authorization: string } | null;

export interface SaveTargetPayload {
  id?: string;
  name: string;
  neighborhoods: CanvassNeighborhood[];
  notes?: string;
  zone?: SavedTargetZone;
}
