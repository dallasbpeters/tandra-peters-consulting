import type React from "react";
import { useEffect, useState } from "react";

import { useCameraContext, useRoofInspection } from "./context";
import { getModelViewer } from "./model-viewer-hotspot";
import type { ModelViewerNav, Vec3 } from "./project-world-to-view";
import {
  formatVec3,
  parseMetersTriple,
  projectWorldAxisToCompass,
} from "./project-world-to-view";

import "../../styles/roof-inspection-dev-compass.css";

type AxisKey = "x" | "y" | "z";

interface AxisDraw {
  color: string;
  dashed: boolean;
  key: AxisKey;
  label: string;
  lx: number;
  ly: number;
  opacity: number;
  x2: number;
  y2: number;
}

const WORLD_AXES: Record<
  AxisKey,
  { world: Vec3; label: string; color: string; field: string }
> = {
  x: {
    color: "#ff5c5c",
    field: "pos3dX / norm3dX",
    label: "+X",
    world: { x: 1, y: 0, z: 0 },
  },
  y: {
    color: "#6ee07a",
    field: "pos3dY / norm3dY",
    label: "+Y",
    world: { x: 0, y: 1, z: 0 },
  },
  z: {
    color: "#6eb5ff",
    field: "pos3dZ / norm3dZ",
    label: "+Z",
    world: { x: 0, y: 0, z: 1 },
  },
};

const buildAxisDraw = (
  mv: ModelViewerNav,
  key: AxisKey,
  dashed: boolean,
  scale: number
): AxisDraw => {
  const def = WORLD_AXES[key];
  const proj = projectWorldAxisToCompass(mv, def.world);
  const dir = proj?.dir ?? { x: 0, y: 0, z: 0 };
  const facing = proj?.facing ?? 0;
  const x2 = dir.x * scale;
  const y2 = dir.y * scale;
  const labelOffset = 1.12;

  return {
    color: def.color,
    dashed,
    key,
    label: def.label,
    lx: dir.x * scale * labelOffset,
    ly: dir.y * scale * labelOffset,
    opacity: dashed
      ? 0.55 + Math.max(0, facing) * 0.35
      : 0.65 + Math.max(0, facing) * 0.35,
    x2,
    y2,
  };
};

interface PickSample {
  normal: Vec3;
  position: Vec3;
}

/**
 * Dev-only overlay: live world-axis compass + Sanity field legend.
 * Click the roof model to sample position/normal (same frame as pos3d* / norm3d*).
 */
export const DevViewerCompass: React.FC = () => {
  const { chapters } = useCameraContext();
  const { activeChapterId } = useRoofInspection();
  const [axes, setAxes] = useState<AxisDraw[]>([]);
  const [pick, setPick] = useState<PickSample | null>(null);

  const activeChapter = chapters.find((c) => c.id === activeChapterId);
  const activePos = parseMetersTriple(activeChapter?.position3d);
  const activeNorm = parseMetersTriple(activeChapter?.normal3d);

  useEffect(() => {
    let mv:
      | (HTMLElement &
          ModelViewerNav & {
            positionAndNormalFromPoint?: (
              x: number,
              y: number
            ) => { position: Vec3; normal: Vec3 } | null;
          })
      | null = null;
    let rafId = 0;

    const scale = 0.72;

    const updateAxes = () => {
      if (!mv?.getCameraOrbit) {
        return;
      }
      setAxes([
        buildAxisDraw(mv, "x", false, scale),
        buildAxisDraw(mv, "y", false, scale),
        buildAxisDraw(mv, "z", false, scale),
        buildAxisDraw(mv, "x", true, scale * 0.55),
        buildAxisDraw(mv, "y", true, scale * 0.55),
        buildAxisDraw(mv, "z", true, scale * 0.55),
      ]);
    };

    const handleClick = (event: MouseEvent) => {
      if (!mv?.positionAndNormalFromPoint) {
        return;
      }
      const hit = mv.positionAndNormalFromPoint(event.clientX, event.clientY);
      if (!hit) {
        return;
      }
      setPick({ normal: hit.normal, position: hit.position });
    };

    const attach = () => {
      mv = getModelViewer() as typeof mv;
      if (!mv?.getCameraOrbit) {
        rafId = requestAnimationFrame(attach);
        return;
      }
      updateAxes();
      mv.addEventListener("camera-change", updateAxes);
      mv.addEventListener("click", handleClick);
    };

    attach();

    return () => {
      cancelAnimationFrame(rafId);
      if (mv) {
        mv.removeEventListener("camera-change", updateAxes);
        mv.removeEventListener("click", handleClick);
      }
    };
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  const solidAxes = axes.filter((a) => !a.dashed);
  const dashedAxes = axes.filter((a) => a.dashed);

  return (
    <div aria-hidden="true" className="ri-dev-compass">
      <p className="ri-dev-compass__title">World axes (dev)</p>

      <svg
        aria-label="Camera-relative world axis compass"
        className="ri-dev-compass__gizmo"
        role="img"
        viewBox="-1 -1 2 2"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="0"
          cy="0"
          fill="none"
          r="0.92"
          stroke="oklch(100% 0 0 / 0.12)"
          strokeWidth="0.03"
        />
        {solidAxes.map((axis) => (
          <g key={`solid-${axis.key}`} opacity={axis.opacity}>
            <line
              className="ri-dev-compass__gizmo-line"
              stroke={axis.color}
              strokeWidth="0.07"
              x1="0"
              x2={axis.x2}
              y1="0"
              y2={axis.y2}
            />
            <text
              className="ri-dev-compass__gizmo-label"
              dominantBaseline="middle"
              fill={axis.color}
              textAnchor="middle"
              x={axis.lx}
              y={axis.ly}
            >
              {axis.label}
            </text>
          </g>
        ))}
        {dashedAxes.map((axis) => (
          <g key={`dash-${axis.key}`} opacity={axis.opacity}>
            <line
              className="ri-dev-compass__gizmo-line"
              stroke={axis.color}
              strokeDasharray="0.08 0.07"
              strokeWidth="0.045"
              x1={-axis.x2 * 0.15}
              x2={axis.x2}
              y1={-axis.y2 * 0.15}
              y2={axis.y2}
            />
          </g>
        ))}
      </svg>

      <dl className="ri-dev-compass__legend">
        {(Object.keys(WORLD_AXES) as AxisKey[]).map((key) => {
          const def = WORLD_AXES[key];
          return (
            <div className="ri-dev-compass__legend-row" key={key}>
              <span
                className={`ri-dev-compass__swatch ri-dev-compass__swatch--${key}`}
              />
              <span>
                {def.label} → <strong>{def.field.split(" / ")[0]}</strong>
              </span>
            </div>
          );
        })}
        {(Object.keys(WORLD_AXES) as AxisKey[]).map((key) => {
          const def = WORLD_AXES[key];
          const normField = def.field.split(" / ")[1];
          return (
            <div className="ri-dev-compass__legend-row" key={`n-${key}`}>
              <span
                className={`ri-dev-compass__swatch ri-dev-compass__swatch--n${key}`}
              />
              <span>
                {def.label} normal → <strong>{normField}</strong>
              </span>
            </div>
          );
        })}
      </dl>

      {activeChapter && (activePos || activeNorm) ? (
        <dl className="ri-dev-compass__sample">
          <dt style={{ fontWeight: 600, listStyle: "none", margin: 0 }}>
            Hotspot {activeChapter.id}
            {activeChapter.label ? ` · ${activeChapter.label}` : ""}
          </dt>
          {activePos ? (
            <>
              <dt>pos3dX / Y / Z (m)</dt>
              <dd>{formatVec3(activePos)}</dd>
            </>
          ) : null}
          {activeNorm ? (
            <>
              <dt>norm3dX / Y / Z</dt>
              <dd>{formatVec3(activeNorm, 4)}</dd>
            </>
          ) : null}
        </dl>
      ) : null}

      {pick ? (
        <dl className="ri-dev-compass__sample">
          <dt style={{ fontWeight: 600, margin: 0 }}>Last click sample</dt>
          <dt>pos3dX / Y / Z (m)</dt>
          <dd>{formatVec3(pick.position)}</dd>
          <dt>norm3dX / Y / Z</dt>
          <dd>{formatVec3(pick.normal, 4)}</dd>
        </dl>
      ) : null}

      <p className="ri-dev-compass__hint">
        Click the model to sample coords. Solid = position axes; dashed = normal
        direction (same +X/+Y/+Z frame).
      </p>
    </div>
  );
};
