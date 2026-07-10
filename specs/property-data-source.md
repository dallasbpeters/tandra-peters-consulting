---
name: Property Data Source — Free Replacement for RentCast
description: Research + recommendation for replacing the paid RentCast /properties API with a free source that returns individual property points inside a drawn polygon (and radius/tract) zone WITH the targeting attributes the Desk needs — year built (roof-age proxy) and owner-occupancy — across the Texas service-area counties. Decision doc; NOT yet implemented. Recommends Texas County Appraisal District (CAD) ArcGIS parcel endpoints as the primary source, keeping ACS for tract estimates.
status: draft-for-review
targets:
  - api/lib/desk-direct-mail.ts
  - api/lib/desk-area-intel.ts
  - api/desk-homes.ts
---

# Property Data Source — Free Replacement for RentCast

Status: **research complete, awaiting user decision — do NOT implement yet.**

The RentCast pagination fix was halted per the user: "let's not pull RentCast data — there has to be another free source for all of this info." This document enumerates exactly what the app needs, evaluates the free candidates, and recommends a path. It does not change the pipeline.

---

## 1. What the app actually pulls from RentCast today

RentCast's `GET /v1/properties` is the ONLY source of **individual property records**. It is used in `api/lib/desk-direct-mail.ts` by three consumers, all of which flow through `resolveQueryNeighborhoods` → `fetchMatchedProperties`:

| Consumer | Function | What it produces |
| --- | --- | --- |
| Address preview modal | `prepareDirectMailAddresses` | Distinct formatted mailing addresses for "Addresses in this selection". |
| Live send | `collectSubmitRecipients` | Structured `{addressLine1, city, state, zip}` recipients for the mail provider. |
| Walk roster | `collectHomeRoster` | Per-home records (address, coords, yearBuilt→homeAge, ownerOccupied, sqft, propertyType), owner name STRIPPED. Polygon-filtered via `pointInRing`. |

### Required data (the replacement MUST cover these)

1. **Individual address points inside an arbitrary drawn POLYGON** — the core need and the source of the current bug. Today RentCast is radius-only, so a polygon is approximated by a centroid + equivalent radius and then post-filtered with `pointInRing`. A 1,400-piece polygon returned only ~16 addresses because the query is a single non-paginated centroid circle clamped to ≤1 mi. Also needed: radius zones and tract zones.
2. **Per-property attributes used for targeting/estimates:**
   - **Year built** — roof-age proxy for "older owner homes" (RentCast `yearBuilt`; filtered `yearBuilt:2009` = built ≤ 2009). Drives `homeAge`.
   - **Owner-occupancy** (homestead) — RentCast `ownerOccupied`. Currently read into the roster but not heavily filtered; conceptually the "owner homes" half of "older owner homes".
   - **Latitude / longitude** — for polygon point-in-polygon and map placement.
   - **Property type** — filter to `Single Family`.
   - **Square footage**, formatted address, city/state/zip.
3. **Owner name is deliberately dropped** before leaving the server (PII). Any replacement must preserve that: never return owner names to the client.

### What does NOT come from RentCast (leave alone)

Tract-level **estimates** ("1,961 older owner homes · 3 ACS tracts matched") come from the Census/ACS pipeline in `api/lib/desk-area-intel.ts` (Census Reporter + TIGERweb tables **B25035** median year built, **B25003** owner-occupancy, **B25034** year-built buckets). ACS is aggregate at the tract level (address _ranges_, not points), stays as-is, and is the reason the estimate and the roster diverge in source.

### Service-area counties to cover

From `src/components/texasCounties.json` + AGENTS.md service-area notes, the live metro focus is **Travis (48453), Williamson (48491), Hays (48209)**, plus the added **Tarrant (48439, Fort Worth), Dallas (48113), McLennan (48309, Waco)**. Bastrop/Caldwell/Bell and the far-west counties appear in metadata but are not all in the rendered service area. A replacement should at minimum cover the six live metros; ideally be extensible per-county.

---

## 2. Candidate evaluation

Blunt reality up front: **free ADDRESS datasets (NAD, OpenAddresses, Overture) give you address points + geometry but have NO year-built and NO owner-occupancy.** Only **parcel / County Appraisal District (CAD)** data carries year built + homestead + situs address per property. So preserving "older owner homes" targeting requires CAD/parcel data, full stop.

| Source | Polygon point query | Year built | Owner-occupancy | Situs address + coords | Target-county coverage | License (commercial mail OK?) | Freshness | Integration effort |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **TX County CAD ArcGIS endpoints** ⭐ | ✅ native `esriGeometryPolygon` spatial query, server-side, paginated | ✅ (`YEAR_BUILT` / `F1year_imprv`) | ✅ (homesite value > 0, or owner-mail vs situs) | ✅ situs + geometry/centroid | ✅ per-county live REST (Travis/Tarrant/Dallas/Williamson confirmed live) | ✅ Public records (TX PIA); no per-record cost. Mail use fine. | Monthly–annual per CAD | **Medium** — per-county endpoint + schema normalization; no DB needed (proxy live queries) |
| **TxGIO StratMap statewide parcels** | ⚠️ layer advertises Query but live query API returns "capability not supported"; realistically a **bulk download** (GeoParquet/GDB) | ⚠️ `year_built` present but **often 0/blank** in the statewide copy | ❌ no homestead flag (only owner mailing addr) | ⚠️ `situs_addr` present but **often blank** in statewide copy | ✅ statewide schema, but coverage/quality varies by county | ✅ Free, no cost, TxGIO DataHub | Annual refresh, lags CADs | High — bulk ingest + spatial index + storage |
| **National Address Database (NAD)** | ✅ (bulk points, filter yourself) | ❌ | ❌ | address points only | ✅ TX included (state-contributed) | ⚠️ Public domain, commercial OK **BUT disclaimer: "not intended for use as a mailing list, subject to state statutes"** | ~Quarterly | High (bulk) + legal caveat for mail |
| **Overture Maps – Addresses** | ✅ (GeoParquet, DuckDB spatial) | ❌ | ❌ | address points only | ⚠️ US "partially covered" (~127M of ~150M) | ✅ Permissive, commercial + derivatives OK (per-source attribution) | ~Monthly releases | High — S3/Azure GeoParquet, DuckDB, storage |
| **OpenAddresses** | ✅ (bulk) | ❌ | ❌ | address points only | ⚠️ per-source, gappy in TX | ✅ mostly permissive (per-source varies) | Varies by source | High (bulk) |
| **OSM / Overpass** | ✅ (addr:* nodes, footprints) | ❌ (no year/owner) | ❌ | partial `addr:*` tags | ⚠️ sparse residential coverage in TX suburbs | ⚠️ ODbL — **share-alike**; derivative-data obligations | Live/continuous | Medium API, but coverage too thin |
| **Microsoft Building Footprints** | ✅ (polygons) | ❌ | ❌ | footprints only, no address | ✅ US-wide | ✅ ODbL | Static-ish | N/A — no addresses/attributes |
| **US Census TIGER/Line + ACS** | ⚠️ address _ranges_, tracts | aggregate only | aggregate only | no points | ✅ | ✅ Public domain | ACS annual | Already used for estimates |

### Verification performed (live, read-only)

- Statewide TxGIO MapServer (`feature.geographic.texas.gov/.../stratmap_land_parcels_48_most_recent`) exposes a rich schema (`situs_addr`, `mail_addr`, `year_built`, `county`, `fips`, `stat_land_use`, geometry) but **every `query` call returns error 400 "requested capability is not supported"** despite advertising Query + pagination. Treat it as **bulk-download only**, not a live API. Its hosted ArcGIS-Online copy (`services7.arcgis.com/.../TRAVIS_PARCELS`) _does_ answer queries but returns **blank situs and `YEAR_BUILT: 0`** for many parcels — not reliable for targeting.
- **County CAD endpoints answer live spatial queries correctly.** An Austin bounding box returned **~18,400 parcels** from both the Travis County `TCAD_public` MapServer and the TxGIO hosted copy (vs. RentCast's 16) — proving native polygon coverage with no radius hack.
- Authoritative **TCAD Dec-2025 FeatureServer** returns real targeting data per parcel, e.g.: `{situs_address:"11502 TANGLEBRIAR TRL AUSTIN 78750", situs_zip:"78750", F1year_imprv:1983, imprv_homesite_val:242209, land_state_cd:"A1"}` — situs address + year built + homestead value + single-family land-use code.

Confirmed live metro CAD parcel endpoints (owner name handled per §4):

- Travis: `services.arcgis.com/0L95CJ0VTaxqcmED/.../EXTERNAL_tcad_parcel/FeatureServer/0` and hosted `TCAD_Parcels_Dec_2025` (situs, `F1year_imprv`, homesite vals, `land_state_cd`). Public `TCAD_public` layer omits owner name by county policy — fine for us.
- Williamson: `gis.wilco.org/.../public/county_wcad_parcels/MapServer/0`
- Tarrant: `mapit.tarrantcounty.com/.../Tax/TCProperty/MapServer/0` (`OWNER_NAME`, `SITUS_ADDR`, `YEAR_BUILT`, `OWNER_ADDR`)
- Dallas: `services2.arcgis.com/rwnOSbfKSwyTBcwN/.../DallasTaxParcels/FeatureServer/0` (`ST_NUM`, `ST_NAME`, `CITY`, `APPRAISALYEAR`)
- McLennan (Waco) + Hays: to be located on the respective CAD sites (typical `[county]cad.org` / county GIS ArcGIS pattern) during Phase 1.

---

## 3. Recommendation

**Primary source: Texas County Appraisal District (CAD) ArcGIS REST parcel endpoints, queried live per-county, with a thin server-side normalization layer. Keep ACS for tract estimates. Retire RentCast.**

Why this wins:

1. **It is the only free source that carries all three hard requirements** — polygon-native property points **+ year built + owner-occupancy** — plus situs address and geometry. Address-only datasets (NAD/Overture/OpenAddresses) cannot power "older owner homes" and would still need CAD data bolted on.
2. **It structurally fixes the polygon bug.** ArcGIS `query` accepts a real `esriGeometryPolygon` with `spatialRel=esriSpatialRelIntersects` and paginates via `resultOffset`/`resultRecordCount` (2000/page). We send the drawn ring directly — no centroid, no equivalent-radius clamp, no ≤1 mi cap, no lossy `pointInRing` post-filter that threw away corners. Full audience returned.
3. **No new infrastructure.** Queries run from the existing Vercel serverless `api/` functions (same place RentCast is called). No database, no bulk ingest, no spatial index to host — a good fit for a Vite SPA + Vercel + Sanity stack. (The bulk sources would each require ingesting millions of rows and hosting a spatial store, which this stack doesn't have.)
4. **Free and mail-appropriate.** TX appraisal records are public under the Public Information Act; there is no per-record fee and no mailing-list prohibition like NAD's. (See §4 for the PII/privacy nuance.)

Honest tradeoffs to accept:

- **Per-county schema fragmentation.** Each CAD has different field names and the odd quirk (Travis' public layer hides owner name; some are MapServer vs FeatureServer). We need a per-county adapter map. This is the real cost.
- **Owner-occupancy is a proxy, not a flag.** Derive it as: homestead when the parcel has a positive homesite improvement value (Travis `imprv_homesite_val`
  > 0) OR when owner mailing address == situs address (Tarrant/Dallas expose owner mail). Good enough for "owner homes"; document the heuristic.
- **Uptime depends on county GIS servers.** They're generally reliable but not SLA-backed. Mitigate with a short in-function cache and graceful fallback.

If a truly-free **drop-in API returning addresses WITH year-built under commercial-friendly terms** existed, it'd be called out here — it does **not**. The closest single free thing is exactly the CAD ArcGIS endpoints, which are per-county rather than one national API.

---

## 4. PII / licensing guardrails

- **Never return owner names to the client.** Continue the current pattern: request only situs address, year, land-use, homestead value, geometry/coords; strip owner name server-side. Prefer endpoints/queries that avoid selecting owner name at all (Travis' public layer already omits it).
- **Texas Tax Code §25.025** lets protected individuals (police, judges, DV victims) suppress their address; suppressed records simply won't return — acceptable, and safer.
- Keep the send path's existing safety: no live mail without provider creds + `DIRECT_MAIL_SEND_ENABLED`.

---

## 5. Phased migration plan (proposed — not started)

**Phase 0 — County endpoint registry (½–1 day).** Create `api/lib/tx-cad-sources.ts`: a per-county-FIPS map of `{ queryUrl, geometryType, fieldMap }` where `fieldMap` normalizes each CAD's fields to a common `ParcelRecord { situsLine1, city, state, zip, yearBuilt, ownerOccupied, latitude, longitude, landUseCode }`. Locate + verify Hays and McLennan endpoints. Add `RENTCAST`-free config.

**Phase 1 — ArcGIS parcel fetcher (1–2 days).** New `api/lib/tx-cad-parcels.ts` exporting `fetchParcelsInZone(zone, filters)`: builds an ArcGIS `query` from the drawn polygon ring (or radius→envelope, or tract), applies `where` for land-use = single-family and `yearBuilt <= 2009`, paginates with `resultOffset` until exhausted (bounded by a sane hard cap), normalizes via the county field map. Reuse the `pointInRing` server copy only as a belt-and-suspenders refine, not the primary filter.

**Phase 2 — Swap the pipeline internals (1 day).** Replace `fetchMatchedProperties` (and the RentCast URL builders) with the CAD fetcher inside `prepareDirectMailAddresses`, `collectSubmitRecipients`, and `collectHomeRoster`. Keep those three public function signatures identical so `api/desk-direct-mail.ts`, `api/desk-homes.ts`, and the walk feature on the other branch keep working unchanged. Map county from the zone/tract FIPS.

**Phase 3 — "Areas" + count correctness (½ day).** Wire the matched ACS tract count through to the address preview so a polygon reports "N homes across M areas" using matched tracts, not `selectedTargets.length` (currently 0 for a polygon). Raise/keep a sane `ADDRESS_LIST_HARD_CAP`.

**Phase 4 — Tests + verification (1 day).** Mock ArcGIS pagination; assert a large polygon with empty `neighborhoods[]` yields a roster far larger than one page and that counts/areas are correct. Run `tsc`, `pnpm test:run`, `ultracite check`, `pnpm build`.

Rough total: **~4–6 focused days**, no new infra, RentCast key removed.

Fallback option if CAD fragmentation proves too costly: ingest the TxGIO/Overture bulk parcels+addresses into a lightweight store (e.g. Sanity is wrong for this volume — would need Postgres/Turso + PostGIS or a prebuilt per-county GeoJSON in Blob) and query that. This is strictly more infra than live CAD queries, so it's plan B.

---

## 6. Open questions for the user

1. **Owner-occupancy fidelity:** is the homestead-value / owner-mail-vs-situs proxy acceptable, or is a stricter homestead-exemption flag required (varies by CAD, not always exposed)?
2. **County scope for v1:** ship Travis + Williamson + Hays first (core metro), then add Tarrant/Dallas/McLennan? Or all six at once?
3. **Live-query vs cached:** OK to hit county GIS servers on demand (with a short cache), or do you want a nightly snapshot to a store for resilience?
4. **Single-family definition:** filter by CAD land-use/state code `A1` (residential single-family) — confirm that matches "homes" as Tandra means it (excludes condos/multifamily/mobile)?
5. **Do we fully remove RentCast** (env keys, provider plumbing) now, or leave it behind a disabled flag during rollout?
