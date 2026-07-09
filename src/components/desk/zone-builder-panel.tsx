import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaOption from "@awesome.me/webawesome/dist/react/option/index.js";
import WaSelect from "@awesome.me/webawesome/dist/react/select/index.js";
import { Trash } from "iconoir-react";

import { waFieldValue, formatNumber } from "../../lib/desk-format";
import { zoneRadiusOptions } from "../../lib/desk-geo";
import type {
  DeskAreaCounty,
  DeskTargetZone,
  ZoneValidationResult,
} from "../../lib/desk-types";

export const AreaCountyStrip = ({
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

export const ZoneBuilderPanel = ({
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
