import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import { CheckCircle, MapPin, StatsUpSquare } from "iconoir-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useGoogleDashboardAuth } from "../../context/dashboard-auth-context";
import { useAdVersions } from "../../hooks/use-ad-versions";
import { useAreaIntel } from "../../hooks/use-area-intel";
import { useCanvassTargets } from "../../hooks/use-canvass-targets";
import { saveValidationError } from "../../hooks/use-desk-board";
import { waFieldValue, formatNumber } from "../../lib/desk-format";
import {
  DEFAULT_ZONE_RADIUS_MILES,
  MAX_STORED_ZONES,
  createZoneId,
  polygonAreaSqMiles,
  polygonZoneMailEstimate,
  previewAreaCount,
  ringCentroid,
  savedZoneFrom,
  savedZoneIsRestorable,
  selectedZoneTargets,
  targetContainingPoint,
  zoneFromSavedTarget,
  zoneMailPieceEstimate,
  zoneNotes,
  zoneValidationFor,
  zoneLabelFor,
} from "../../lib/desk-geo";
import {
  BACK_COPY_STORAGE_KEY,
  DEFAULT_RETURN_ADDRESS,
  EMPTY_BACK_COPY,
  loadBackCopy,
  loadReturnAddress,
  postcardScanUrl,
  resolveBackCopy,
  RETURN_ADDRESS_STORAGE_KEY,
  returnAddressError,
  returnAddressLines,
  roofAgePhraseFor,
} from "../../lib/desk-postcard";
import type { SelfMailRecipient } from "../../lib/desk-self-mail";
import type {
  AuthHeader,
  CanvassTargetRecord,
  CaptureMessage,
  DirectMailAddressListResponse,
  DirectMailPlanResponse,
  DeskTargetZone,
  PostcardBackCopy,
  PostcardReturnAddress,
  ProviderConnectionResult,
  ProviderKeysStatusResult,
  ProviderSubmitResult,
  ProviderTestProofResult,
} from "../../lib/desk-types";
import { downloadWalkSheet } from "../../lib/desk-walk-sheet";
import { buildQrDataUri } from "../../lib/qr-code";
import type { DeskAreaMapZonePoint } from "../desk-area-map";
import { DeskAreaMap } from "../desk-area-map";
import { AddressPreviewModal } from "./address-preview-modal";
import {
  DirectMailPlanPanel,
  validationMessageTone,
} from "./direct-mail-plan-panel";
import {
  NeighborhoodRow,
  SavedTargetCard,
  targetToSnapshot,
} from "./neighborhood-row";
import type { PostcardSize } from "./postcard-pdf";
import type { SelfMailProgress } from "./self-mail-pdf";
import { ZoneBuilderPanel, AreaCountyStrip } from "./zone-builder-panel";

export const CanvassingPlanner = ({
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
  const [backCopy, setBackCopy] = useState<PostcardBackCopy>(loadBackCopy);
  const [returnAddress, setReturnAddress] =
    useState<PostcardReturnAddress>(loadReturnAddress);
  const [postcardSize, setPostcardSize] = useState<PostcardSize>("6x9");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreparingMail, setIsPreparingMail] = useState(false);
  const [mailPlan, setMailPlan] = useState<DirectMailPlanResponse | null>(null);
  const [message, setMessage] = useState<CaptureMessage | null>(null);
  const [zones, setZones] = useState<DeskTargetZone[]>([]);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  // Id of the drawn polygon zone whose authoritative CAD home count is still
  // being fetched. While set, the MAIL PIECES box shows a "Counting…" state
  // instead of the unreliable area×density heuristic.
  const [countingZoneId, setCountingZoneId] = useState<string | null>(null);
  // Roof-age / owner-occupied refinement for the active drawn zone (the total
  // deliverable count is the headline; this is a secondary targeting stat).
  const [zoneTargeting, setZoneTargeting] = useState<{
    olderHomes: number;
    ownerOccupiedHomes: number;
    zoneId: string;
  } | null>(null);
  // Set when the authoritative count could NOT run (network/dev-server-stale),
  // so a heuristic fallback is never shown as if it were the real count.
  const [countError, setCountError] = useState<string | null>(null);
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
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [submission, setSubmission] = useState<ProviderSubmitResult | null>(
    null
  );
  const [keysStatus, setKeysStatus] = useState<ProviderKeysStatusResult | null>(
    null
  );
  const [savingKeysKey, setSavingKeysKey] = useState<string | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressList, setAddressList] =
    useState<DirectMailAddressListResponse | null>(null);
  const [selfMailBusy, setSelfMailBusy] = useState(false);
  const [selfMailProgress, setSelfMailProgress] =
    useState<SelfMailProgress | null>(null);
  const [selfMailMessage, setSelfMailMessage] = useState<CaptureMessage | null>(
    null
  );
  // Side builder container — scrolled into view when a saved area is loaded so
  // the populated builder/mail-batch panel is obviously in front of the user.
  const builderRef = useRef<HTMLDivElement>(null);
  // Cancels an in-flight authoritative-count fetch when a new zone is drawn or
  // opened before the previous count resolves.
  const countAbortRef = useRef<AbortController | null>(null);

  const targets = useMemo(() => intel?.targets ?? [], [intel]);
  const counties = useMemo(() => intel?.counties ?? [], [intel]);

  // Replace a drawn polygon's area×density HEURISTIC with the authoritative
  // count of real older single-family homes inside the outline. The heuristic
  // assumes a uniform citywide/neighborhood density, but East-side outlines
  // straddle river, floodplain, airport, and new-build land — so it can be off
  // by 10–100× in either direction. The server's `addresses` action queries the
  // drawn polygon against the county appraisal parcels (same audience: A1
  // single-family, built ≤2009) and returns the true mailable-address count, so
  // we settle the MAIL PIECES number on that once the outline is closed. The
  // heuristic remains only as an instant, offline-safe fallback.
  const refineZoneCount = useCallback(
    (zone: DeskTargetZone) => {
      if (zone.kind !== "polygon" || !zone.polygon || zone.polygon.length < 3) {
        return;
      }
      countAbortRef.current?.abort();
      const controller = new AbortController();
      countAbortRef.current = controller;
      setCountingZoneId(zone.id);
      setCountError(null);
      const zonePayload = {
        id: zone.id,
        kind: zone.kind,
        label: zone.label,
        latitude: zone.latitude,
        longitude: zone.longitude,
        mailPieces: zone.estimatedPieces ?? 0,
        polygon: zone.polygon,
        radiusMiles: zone.radiusMiles,
      };
      const run = async (): Promise<void> => {
        try {
          const response = await fetch("/api/desk-direct-mail", {
            body: JSON.stringify({
              action: "addresses",
              neighborhoods: [],
              zone: zonePayload,
            }),
            headers: {
              "Content-Type": "application/json",
              ...authHeader,
            },
            method: "POST",
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new Error(`Home count request failed (${response.status})`);
          }
          const body = (await response.json()) as DirectMailAddressListResponse;
          if (body.status !== "configured") {
            // Reached the server but it has no deliverable homes / geometry —
            // show 0 and say so rather than falling back to the heuristic.
            setZones((current) =>
              current.map((item) =>
                item.id === zone.id ? { ...item, estimatedPieces: 0 } : item
              )
            );
            setZoneTargeting(null);
            setCountError(
              "No mappable homes were found inside this outline. Draw over a residential area."
            );
            return;
          }
          // Headline = total deliverable homes; older/owner is a refinement.
          setZones((current) =>
            current.map((item) =>
              item.id === zone.id
                ? { ...item, estimatedPieces: body.totalAddresses }
                : item
            )
          );
          setZoneTargeting({
            olderHomes: body.olderHomes,
            ownerOccupiedHomes: body.ownerOccupiedHomes,
            zoneId: zone.id,
          });
        } catch (error) {
          if (controller.signal.aborted) {
            return;
          }
          // The live count could not run — surface it instead of silently
          // showing the rough heuristic as if it were the real number. The most
          // common cause is a dev server that predates this endpoint change:
          // `api/lib/*` is NOT hot-reloaded, so a full `pnpm dev` restart is
          // required (a hard refresh alone keeps the stale server code).
          // biome-ignore lint/suspicious/noConsole: surfacing a real failure.
          console.error("[desk] authoritative home count failed", error);
          setZoneTargeting(null);
          setCountError(
            "Couldn't reach the live home count, so this shows a rough estimate. If you just updated the code, restart `pnpm dev` (a hard refresh does not reload the API)."
          );
        } finally {
          if (countAbortRef.current === controller) {
            countAbortRef.current = null;
            setCountingZoneId((current) =>
              current === zone.id ? null : current
            );
          }
        }
      };
      run().catch(() => {
        // `run` swallows its own errors; this guard is purely defensive.
      });
    },
    [authHeader]
  );

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
  // The active drawn polygon's authoritative home count is still resolving —
  // show a "Counting…" placeholder instead of the unreliable heuristic number.
  const isCountingActiveZone =
    countingZoneId !== null && countingZoneId === activeZoneId;
  // Roof-age / owner-occupied refinement to show for the active zone only.
  const activeTargeting =
    zoneTargeting && zoneTargeting.zoneId === activeZoneId
      ? zoneTargeting
      : null;
  const zoneValidation = useMemo(
    () => zoneValidationFor(activeZone, selectedTargets, zoneMailPieces),
    [activeZone, selectedTargets, zoneMailPieces]
  );
  // Effective audience for save/prepare/preview gating. A drawn polygon zone has
  // zero selected tracts by design, so a valid drawn zone (positive estimate)
  // counts as an audience of one for the "did you pick something?" checks.
  const audienceCount = useMemo(() => {
    if (selectedTargets.length > 0) {
      return selectedTargets.length;
    }
    return activeZone && zoneMailPieces > 0 ? 1 : 0;
  }, [activeZone, selectedTargets.length, zoneMailPieces]);
  // True when there's something to mail: selected tracts OR a valid drawn zone.
  // Save/Preview/name gates use this so a tract-less drawn zone still unlocks.
  const hasAudience = audienceCount > 0;
  // "Areas" for the address-preview header. A tract selection counts its
  // tracts; a drawn polygon has NO selected tracts, so count the ACS tracts its
  // outline actually overlaps (the same estimate path) — otherwise a valid
  // polygon wrongly reads "0 areas". A radius/circle zone counts as one area.
  const areaCount = useMemo(
    () => previewAreaCount(selectedTargets.length, activeZone, targets),
    [activeZone, selectedTargets, targets]
  );
  // Zone descriptor sent to the backend so a tract-less polygon zone still runs
  // RentCast matching from its centroid + equivalent radius (with the polygon
  // ring for reference). Tract-based selections send neighborhoods and the
  // backend prefers those; this is the fallback for drawn zones.
  const zoneRequestPayload = useMemo(() => {
    if (!activeZone) {
      return;
    }
    return {
      id: activeZone.id,
      kind: activeZone.kind,
      label: activeZone.label,
      latitude: activeZone.latitude,
      longitude: activeZone.longitude,
      mailPieces: zoneMailPieces,
      polygon: activeZone.polygon,
      radiusMiles: activeZone.radiusMiles,
    };
  }, [activeZone, zoneMailPieces]);
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
    setIsZoneMode(false);
    setIsDrawMode(false);
    setZoneTargeting(null);
    setCountError(null);
  }, []);

  const openZone = useCallback(
    (zone: DeskTargetZone) => {
      const zoneTargets = selectedZoneTargets(zone, targets);
      const ids = zoneTargets.map((target) => target.id);
      setActiveZoneId(zone.id);
      setSelectedIds(ids);
      setName(zone.label);
      setMailPlan(null);
      setMessage(null);
      // Re-settle a reopened polygon zone on the live appraisal-parcel count in
      // case its saved estimate predates this reconciliation (or CAD changed).
      refineZoneCount(zone);
    },
    [refineZoneCount, targets]
  );

  const handleDeleteZone = useCallback(
    (id: string) => {
      setZones((current) => current.filter((zone) => zone.id !== id));
      if (activeZoneId === id) {
        setActiveZoneId(null);
        setSelectedIds([]);
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

  useEffect(() => {
    window.localStorage.setItem(
      RETURN_ADDRESS_STORAGE_KEY,
      JSON.stringify(returnAddress)
    );
  }, [returnAddress]);

  const handleBackCopyChange = useCallback(
    (field: keyof PostcardBackCopy, value: string) => {
      setBackCopy((current) => ({ ...current, [field]: value }));
    },
    []
  );

  const handleBackCopyReset = useCallback(() => {
    setBackCopy(EMPTY_BACK_COPY);
  }, []);

  const handleReturnAddressChange = useCallback(
    (field: keyof PostcardReturnAddress, value: string) => {
      setReturnAddress((current) => ({ ...current, [field]: value }));
    },
    []
  );

  const handleReturnAddressReset = useCallback(() => {
    setReturnAddress(DEFAULT_RETURN_ADDRESS);
  }, []);

  const returnAddressValidation = useMemo(
    () => returnAddressError(returnAddress),
    [returnAddress]
  );

  const handleCreateZone = useCallback(
    (point: DeskAreaMapZonePoint) => {
      // Capture only the tract the click actually landed inside — never nearby
      // tracts by centroid distance, which selected a neighborhood the user
      // didn't click and couldn't cleanly remove.
      const containing = targetContainingPoint(point, targets);
      const zoneTargets = containing ? [containing] : [];
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
      // Leave click-to-zone mode after a drop so the next map click edits the
      // selection (toggles a highlighted area off) instead of stacking a brand
      // new zone on every click — the "can't deselect" trap.
      setIsZoneMode(false);
      setName(zone.label);
      setMailPlan(null);
      setMessage({
        text:
          targetIds.length > 0
            ? "Zone created. Validate it before sending."
            : "That spot isn't inside a mapped neighborhood — click directly on a highlighted area.",
        tone: targetIds.length > 0 ? "success" : "error",
      });
    },
    [targets, zoneRadiusMiles]
  );

  const handleDrawZone = useCallback(
    (ring: [number, number][]) => {
      // Draw mode is SELECTION-FREE: the drawn polygon IS the zone. We never add
      // a predefined census tract to `selectedIds` and never highlight one on
      // the map. The tract under the centroid is read only to name the zone, and
      // the mail-piece estimate comes from the polygon's area × local density —
      // both internal lookups that never select/highlight a tract.
      const center = ringCentroid(ring);
      const estimatedPieces = polygonZoneMailEstimate(ring, targets);
      const labelTract = targetContainingPoint(center, targets);
      // Equivalent radius keeps the footprint estimate + RentCast query sensible.
      const equivalentRadius = Math.sqrt(polygonAreaSqMiles(ring) / Math.PI);
      const zone: DeskTargetZone = {
        createdAt: new Date().toISOString(),
        estimatedPieces,
        id: createZoneId(),
        kind: "polygon",
        label: `${labelTract?.neighborhoodLabel ?? "Austin"} custom zone`,
        latitude: center.latitude,
        longitude: center.longitude,
        polygon: ring,
        radiusMiles: Math.max(0.05, Math.round(equivalentRadius * 100) / 100),
        targetIds: [],
      };
      setZones((current) => [zone, ...current].slice(0, MAX_STORED_ZONES));
      setActiveZoneId(zone.id);
      setSelectedIds([]);
      setIsDrawMode(false);
      setName(zone.label);
      setMailPlan(null);
      setMessage({
        text:
          estimatedPieces > 0
            ? "Zone drawn. Counting the homes inside it…"
            : "That outline didn't cover any mappable homes — draw over a neighborhood.",
        tone: estimatedPieces > 0 ? "success" : "error",
      });
      // Settle MAIL PIECES on the real appraisal-parcel count, not the heuristic.
      refineZoneCount(zone);
    },
    [refineZoneCount, targets]
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
      audienceCount,
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
      zone: activeZone ? savedZoneFrom(activeZone, zoneMailPieces) : undefined,
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
    audienceCount,
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
        audienceCount,
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
            zone: zoneRequestPayload,
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
    [
      audienceCount,
      authHeader,
      name,
      selectedCreativeVersion,
      selectedTargets,
      zoneRequestPayload,
    ]
  );

  const handlePreviewAddresses = useCallback(async () => {
    if (audienceCount === 0) {
      setMessage({
        text: "Select or draw a zone first, then preview its addresses.",
        tone: "error",
      });
      return;
    }
    setIsAddressModalOpen(true);
    setAddressLoading(true);
    setAddressError(null);
    setAddressList(null);
    try {
      const response = await fetch("/api/desk-direct-mail", {
        body: JSON.stringify({
          action: "addresses",
          neighborhoods: selectedTargets.map(targetToSnapshot),
          zone: zoneRequestPayload,
        }),
        headers: { ...authHeader, "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as DirectMailAddressListResponse & {
        error?: string;
      };
      if (response.ok && body.ok) {
        setAddressList(body);
        return;
      }
      setAddressError(body.error ?? "Could not load addresses for this zone.");
    } catch {
      setAddressError("Could not load addresses for this zone.");
    } finally {
      setAddressLoading(false);
    }
  }, [audienceCount, authHeader, selectedTargets, zoneRequestPayload]);

  const handleCloseAddressModal = useCallback(() => {
    setIsAddressModalOpen(false);
  }, []);

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
            // Saved structured layers render to print-resolution HTML server-side
            // so the proof front is crisp; the thumbnail is only a fallback.
            frontConfig: selectedCreativeVersion?.config,
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
    [authHeader, selectedCreativeVersion, postcardSize]
  );

  const handleLoadKeysStatus = useCallback(
    async (providerKey: string) => {
      try {
        const response = await fetch("/api/desk-direct-mail", {
          body: JSON.stringify({
            action: "keys-status",
            provider: providerKey,
          }),
          headers: { ...authHeader, "Content-Type": "application/json" },
          method: "POST",
        });
        const body = (await response.json()) as {
          status?: ProviderKeysStatusResult;
        };
        setKeysStatus(body.status ?? null);
      } catch {
        setKeysStatus(null);
      }
    },
    [authHeader]
  );

  const handleSaveKeys = useCallback(
    async (providerKey: string, values: Record<string, string>) => {
      setSavingKeysKey(providerKey);
      try {
        const response = await fetch("/api/desk-direct-mail", {
          body: JSON.stringify({
            action: "save-keys",
            provider: providerKey,
            values,
          }),
          headers: { ...authHeader, "Content-Type": "application/json" },
          method: "POST",
        });
        const body = (await response.json()) as {
          error?: string;
          ok?: boolean;
          status?: ProviderKeysStatusResult;
        };
        if (response.ok && body.ok) {
          setKeysStatus(body.status ?? null);
          setMessage({
            text: "Keys saved. Checking the connection…",
            tone: "success",
          });
          await handleVerifyProvider(providerKey);
          return;
        }
        setMessage({
          text: body.error ?? "Could not save these keys.",
          tone: "error",
        });
      } catch {
        setMessage({ text: "Could not save these keys.", tone: "error" });
      } finally {
        setSavingKeysKey(null);
      }
    },
    [authHeader, handleVerifyProvider]
  );

  const handleSubmitToService = useCallback(
    async (providerKey: string) => {
      if (!selectedCreativeVersion) {
        setMessage({
          text: "Select a creative before submitting to a service.",
          tone: "error",
        });
        return;
      }
      setSubmittingKey(providerKey);
      setSubmission(null);
      const zoneName = activeZone?.label ?? (name || "selected Austin area");
      const resolvedCopy = resolveBackCopy(
        backCopy,
        zoneName,
        roofAgePhraseFor(selectedTargets)
      );
      const scanUrl = postcardScanUrl(activeZone, name);
      const qrDataUri = buildQrDataUri(scanUrl, "#123a34", "#ffffff");
      try {
        const response = await fetch("/api/desk-direct-mail", {
          body: JSON.stringify({
            action: "submit",
            batchName: name || "Austin neighborhood mail batch",
            body: resolvedCopy.body,
            cta: resolvedCopy.cta,
            front: selectedCreativeVersion.thumbnail,
            // The saved creative's structured layers (canvas doc + creative
            // state). The server renders these to print-resolution HTML so the
            // front is crisp — the thumbnail above is only a legacy fallback.
            frontConfig: selectedCreativeVersion.config,
            headline: resolvedCopy.headline,
            // Send the zone/neighborhoods so the server rebuilds the FULL
            // recipient list; the preview sample is only a display fallback.
            neighborhoods: selectedTargets.map(targetToSnapshot),
            provider: providerKey,
            qrDataUri,
            recipients: mailPlan?.rentcast.sampleAddresses ?? [],
            returnAddress,
            size: postcardSize,
            zone: zoneRequestPayload,
            zoneLabel: activeZone?.label,
          }),
          headers: { ...authHeader, "Content-Type": "application/json" },
          method: "POST",
        });
        const body = (await response.json()) as {
          submission?: ProviderSubmitResult;
        };
        setSubmission(
          body.submission ?? {
            message: "The submit service returned nothing.",
            mode: "test",
            ok: false,
            provider: providerKey,
            providerKey,
          }
        );
      } catch {
        setSubmission({
          message: "Could not reach the submit service.",
          mode: "test",
          ok: false,
          provider: providerKey,
          providerKey,
        });
      } finally {
        setSubmittingKey(null);
      }
    },
    [
      activeZone,
      authHeader,
      backCopy,
      mailPlan,
      name,
      postcardSize,
      returnAddress,
      selectedCreativeVersion,
      selectedTargets,
      zoneRequestPayload,
    ]
  );

  const handleGenerateSelfMail = useCallback(async () => {
    if (!selectedCreativeVersion) {
      setSelfMailMessage({
        text: "Select a saved creative before generating self-mail PDFs.",
        tone: "error",
      });
      return;
    }
    if (audienceCount === 0) {
      setSelfMailMessage({
        text: "Select or draw a zone first, then generate self-mail PDFs.",
        tone: "error",
      });
      return;
    }
    setSelfMailBusy(true);
    setSelfMailProgress(null);
    setSelfMailMessage(null);
    try {
      const response = await fetch("/api/desk-direct-mail", {
        body: JSON.stringify({
          action: "recipients",
          neighborhoods: selectedTargets.map(targetToSnapshot),
          zone: zoneRequestPayload,
        }),
        headers: { ...authHeader, "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as {
        error?: string;
        ok?: boolean;
        recipients?: SelfMailRecipient[];
        totalMatched?: number;
      };
      if (!(response.ok && body.ok)) {
        setSelfMailMessage({
          text: body.error ?? "Could not load this zone's addresses.",
          tone: "error",
        });
        return;
      }
      const recipients = body.recipients ?? [];
      if (recipients.length === 0) {
        setSelfMailMessage({
          text: "No deliverable addresses were found inside this zone.",
          tone: "error",
        });
        return;
      }
      const zoneName = activeZone?.label ?? (name || "selected Austin area");
      const resolvedCopy = resolveBackCopy(
        backCopy,
        zoneName,
        roofAgePhraseFor(selectedTargets)
      );
      const scanUrl = postcardScanUrl(activeZone, name);
      const qrDataUri = buildQrDataUri(scanUrl, "#123a34", "#ffffff");
      const { generateSelfMailPdfs } = await import("./self-mail-pdf");
      const result = await generateSelfMailPdfs({
        batchName: name || "Austin neighborhood mail batch",
        docProps: {
          body: resolvedCopy.body,
          cta: resolvedCopy.cta,
          frontConfig: selectedCreativeVersion.config,
          frontImageDataUri: selectedCreativeVersion.thumbnail,
          headline: resolvedCopy.headline,
          qrDataUri,
          returnAddressLines: returnAddressLines(returnAddress),
        },
        onProgress: setSelfMailProgress,
        recipients,
        size: postcardSize,
      });
      const totalMatched = body.totalMatched ?? result.recipients;
      const fileWord = result.files > 1 ? "PDFs" : "PDF";
      const capped = totalMatched > result.recipients;
      setSelfMailMessage({
        text: capped
          ? `Generated ${formatNumber(result.recipients)} of ${formatNumber(
              totalMatched
            )} postcards across ${result.files} ${fileWord}. Tighten the zone to mail the rest.`
          : `Generated ${formatNumber(
              result.recipients
            )} postcards across ${result.files} ${fileWord}. Check your downloads.`,
        tone: "success",
      });
    } catch (error) {
      setSelfMailMessage({
        text:
          error instanceof Error
            ? error.message
            : "Could not generate self-mail PDFs.",
        tone: "error",
      });
    } finally {
      setSelfMailBusy(false);
    }
  }, [
    activeZone,
    audienceCount,
    authHeader,
    backCopy,
    name,
    postcardSize,
    returnAddress,
    selectedCreativeVersion,
    selectedTargets,
    zoneRequestPayload,
  ]);

  // Scroll the (page-top) builder into view so a load triggered from the
  // saved-areas list at the bottom of the page is obviously in front of the
  // user. This scrolls the PAGE, not the map camera.
  const revealBuilder = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.requestAnimationFrame(() => {
      builderRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const openTarget = useCallback(
    (target: CanvassTargetRecord) => {
      const ids = target.neighborhoods
        .map((item) => item.tractFips)
        .filter(Boolean);
      // Loading a saved area must never move the map or turn on a zone tool; it
      // just repopulates the builder so it can be validated/prepared/submitted.
      setIsZoneMode(false);
      setIsDrawMode(false);
      setName(target.name);
      setEditingId(target.id);
      setMailPlan(null);

      const savedZone = target.zone;
      const restorable = savedZoneIsRestorable(savedZone);
      if (restorable) {
        const zone = zoneFromSavedTarget(savedZone, target.name, ids);
        setZones((current) => [zone, ...current].slice(0, MAX_STORED_ZONES));
        setActiveZoneId(zone.id);
        // Polygon zones highlight NO predefined tract; circle zones reattach ids.
        setSelectedIds(zone.kind === "polygon" ? [] : ids);
        setMessage({
          text: "Loaded saved area into the builder below the map.",
          tone: "success",
        });
        revealBuilder();
        return;
      }

      // Older save without geometry: restore whatever tract ids it kept.
      setActiveZoneId(null);
      setSelectedIds(ids);
      if (ids.length > 0) {
        setMessage({
          text: "Loaded saved area into the builder below the map.",
          tone: "success",
        });
        revealBuilder();
        return;
      }
      setMessage({
        text: "This saved area predates zone geometry — reselect it on the map to reuse it.",
        tone: "error",
      });
      revealBuilder();
    },
    [revealBuilder]
  );

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
          onCreateZone={handleCreateZone}
          onDrawZone={handleDrawZone}
          onToggleSelect={toggleSelect}
          selectedIds={selectedIds}
          targets={targets}
          zoneMode={isZoneMode}
          zones={mapZones}
        />

        <div className="desk-canvass-builder" ref={builderRef}>
          <div className="desk-canvass-summary">
            <div>
              <strong>{selectedTargets.length}</strong>
              <span>selected</span>
            </div>
            <div>
              {isCountingActiveZone ? (
                <strong className="desk-canvass-summary__pending">
                  Counting…
                </strong>
              ) : (
                <strong>{formatNumber(zoneMailPieces)}</strong>
              )}
              <span>mail pieces</span>
            </div>
          </div>

          {activeTargeting && !isCountingActiveZone ? (
            <p className="desk-canvass-targeting">
              Includes{" "}
              <strong>{formatNumber(activeTargeting.olderHomes)}</strong> built
              in 2009 or earlier ·{" "}
              <strong>
                {formatNumber(activeTargeting.ownerOccupiedHomes)}
              </strong>{" "}
              owner-occupied — optional targeting refinements.
            </p>
          ) : null}

          {countError ? (
            <p className="desk-capture-message desk-capture-message--error">
              {countError}
            </p>
          ) : null}

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

          {hasAudience ? (
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

          {hasAudience ? (
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
                disabled={addressLoading}
                onClick={handlePreviewAddresses}
              >
                <MapPin aria-hidden height={18} slot="start" width={18} />
                {addressLoading ? "Loading addresses…" : "Preview addresses"}
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
            keysStatus={keysStatus}
            onBackCopyChange={handleBackCopyChange}
            onBackCopyReset={handleBackCopyReset}
            onLoadKeysStatus={handleLoadKeysStatus}
            onPrepare={handlePrepareMail}
            onGenerateSelfMail={handleGenerateSelfMail}
            onReturnAddressChange={handleReturnAddressChange}
            onReturnAddressReset={handleReturnAddressReset}
            onSaveKeys={handleSaveKeys}
            onSelectCreativeVersion={setSelectedCreativeVersionId}
            onSizeChange={setPostcardSize}
            onSubmit={handleSubmitToService}
            onTestProof={handleTestProof}
            onVerify={handleVerifyProvider}
            plan={mailPlan}
            proof={proof}
            returnAddress={returnAddress}
            returnAddressError={returnAddressValidation}
            savingKeysKey={savingKeysKey}
            selectedCreativeVersion={selectedCreativeVersion}
            selectedCount={audienceCount}
            selectedTargets={selectedTargets}
            selfMailBusy={selfMailBusy}
            selfMailMessage={selfMailMessage}
            selfMailProgress={selfMailProgress}
            size={postcardSize}
            submission={submission}
            submittingKey={submittingKey}
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

      {isAddressModalOpen ? (
        <AddressPreviewModal
          error={addressError}
          loading={addressLoading}
          onClose={handleCloseAddressModal}
          result={addressList}
          selectedCount={areaCount}
        />
      ) : null}

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
