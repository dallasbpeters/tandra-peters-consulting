import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import * as d3 from "d3";
import geoJson from "./texasCounties.json";
import { mix, theme } from "../theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceArea = {
  countyKey: string;
  displayName: string;
  clientCount: number;
};

export type ServiceAreaMapProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  areas?: ServiceArea[];
};

type County = {
  fips: string;
  key: string | null;
  name: string;
  city: string | null;
  cx: number;
  cy: number;
  d: string;
};

type TooltipState = {
  xPct: number;
  yPct: number;
  name: string;
  count: number | null;
};

type ViewBox = { x: number; y: number; w: number; h: number };

// ─── Pre-computed data ────────────────────────────────────────────────────────

const COUNTIES = geoJson.counties as County[];

// ─── Viewport constants ───────────────────────────────────────────────────────

// Framing the Fort Worth → Waco → Austin → San Antonio corridor with enough
// padding that the Hill Country counties are fully visible. Lubbock just
// enters the frame; Amarillo requires a pan north-west.
const INIT_VB: ViewBox = { x: 0, y: 66, w: 900, h: 780 };

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_EYEBROW = "Service Area";
const DEFAULT_TITLE = "Where We Work";
const DEFAULT_DESCRIPTION = "Serving homeowners across Central Texas — from the Austin metro and San Antonio to Fort Worth, Waco, Kerrville, and the Panhandle.";

// ─── D3-compatible hex colours ────────────────────────────────────────────────

const COLOR_EMPTY = "#0A482A";
// Choropleth stops — dark (few clients) → bright (many clients)
const CHOROPLETH_STOPS = ["#075b33", "#086e3d", "#0a8047", "#0b9251", "#0da45b"];
// Fallback fill for service counties with no Sanity client-count data yet

const STROKE = "#0d2017";
const STROKE_ACTIVE = "#1a3825";

// ─── Styles ───────────────────────────────────────────────────────────────────

const sectionStyle: CSSProperties = {
  backgroundColor: theme.palette.everglade["950"],
  position: "relative",
};

const innerStyle: CSSProperties = { maxHeight: "60vh", overflow: "hidden", margin: "0 auto" };

const headerStyle: CSSProperties = {
  marginBottom: "2.5rem",
  textAlign: "center",
  position: "absolute",
  top: "10%",
  left: "5%",
  zIndex: 10,
};

const descriptionStyle: CSSProperties = {
  fontSize: "1rem",
  maxWidth: "28rem",
  color: mix(theme.colors.white, 65),
  marginBottom: "1rem",
};

const eyebrowStyle: CSSProperties = {
  fontFamily: theme.fonts.headline,
  fontWeight: 800,
  fontSize: "0.6875rem",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: theme.palette.accent["400"],
  marginBottom: "0.75rem",
};

const titleStyle: CSSProperties = {
  fontFamily: theme.fonts.headlineAlt,
  fontWeight: 400,
  fontSize: "clamp(2rem, 5vw, 3rem)",
  lineHeight: 1.1,
  color: theme.colors.white,
  marginBottom: "1rem",
};

const mapWrapStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
};

// const resetBtnStyle: CSSProperties = {
//   position: "absolute",
//   bottom: "1rem",
//   right: "1rem",
//   zIndex: 20,
//   background: theme.palette.everglade["800"],
//   border: `1px solid ${mix(theme.colors.white, 20)}`,
//   borderRadius: "0.375rem",
//   color: mix(theme.colors.white, 70),
//   fontFamily: theme.fonts.headline,
//   fontWeight: 600,
//   fontSize: "0.6875rem",
//   letterSpacing: "0.08em",
//   textTransform: "uppercase",
//   padding: "0.375rem 0.75rem",
//   cursor: "pointer",
// };

const tooltipStyle: CSSProperties = {
  position: "absolute",
  backgroundColor: theme.palette.everglade["900"],
  border: `1px solid ${mix(theme.colors.white, 15)}`,
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  pointerEvents: "none",
  whiteSpace: "nowrap",
  zIndex: 10,
  boxShadow: `0 4px 20px ${mix(theme.colors.black, 40)}`,
  transform: "translate(12px, -56px)",
};

const tooltipNameStyle: CSSProperties = {
  fontFamily: theme.fonts.headline,
  fontWeight: 700,
  fontSize: "0.8125rem",
  color: theme.colors.white,
  marginBottom: "0.125rem",
};

// const tooltipCountStyle: CSSProperties = {
//   fontFamily: theme.fonts.body,
//   fontSize: "0.75rem",
//   color: mix(theme.colors.white, 65),
// };

// ─── Component ────────────────────────────────────────────────────────────────

export const ServiceAreaMap = ({
  eyebrow = DEFAULT_EYEBROW,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  areas = [],
}: ServiceAreaMapProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [vb, setVb] = useState<ViewBox>(INIT_VB);
  const [isDragging, setIsDragging] = useState(false);

  // Keep a ref so the non-React wheel listener can read the latest vb
  const vbRef = useRef(vb);
  vbRef.current = vb;

  // Track the drag origin so handlePointerMove can compute delta
  const dragOrigin = useRef<{ sx: number; sy: number; vb: ViewBox } | null>(null);
  // Did the pointer move enough to count as a drag? (suppresses tooltip)
  const wasDrag = useRef(false);

  // ── Drag to pan ───────────────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragOrigin.current = { sx: e.clientX, sy: e.clientY, vb };
      wasDrag.current = false;
      setIsDragging(true);
    },
    [vb],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragOrigin.current) return;
      const { sx, sy, vb: origin } = dragOrigin.current;
      const svg = svgRef.current!;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - sx) / rect.width) * origin.w;
      const dy = ((e.clientY - sy) / rect.height) * origin.h;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) wasDrag.current = true;
      setVb({ ...origin, x: origin.x - dx, y: origin.y - dy });
      setTooltip(null);
    },
    [],
  );

  const handlePointerUp = useCallback(() => {
    dragOrigin.current = null;
    setIsDragging(false);
  }, []);

  // const handleReset = useCallback(() => setVb(INIT_VB), []);

  const areaMap = useMemo(() => {
    const m = new Map<string, ServiceArea>();
    areas.forEach((a) => m.set(a.countyKey, a));
    return m;
  }, [areas]);

  const maxCount = useMemo(
    () => Math.max(1, ...areas.map((a) => a.clientCount)),
    [areas],
  );

  const colorScale = useMemo(
    () =>
      d3
        .scaleSequential()
        .domain([0, maxCount])
        .interpolator(d3.interpolateRgbBasis(CHOROPLETH_STOPS)),
    [maxCount],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const handlePathEnter = useCallback(
    (e: React.MouseEvent<SVGPathElement>, county: County) => {
      if (wasDrag.current) return;
      const rect = svgRef.current!.getBoundingClientRect();
      setTooltip({
        xPct: ((e.clientX - rect.left) / rect.width) * 100,
        yPct: ((e.clientY - rect.top) / rect.height) * 100,
        name: county.key
          ? (areaMap.get(county.key)?.displayName ?? `${county.name} County`)
          : `${county.name} County`,
        count: county.key
          ? (areaMap.get(county.key)?.clientCount ?? null)
          : null,
      });
    },
    [areaMap],
  );

  const handlePathMove = useCallback((e: React.MouseEvent<SVGPathElement>) => {
    if (wasDrag.current) return;
    const rect = svgRef.current!.getBoundingClientRect();
    setTooltip((prev) =>
      prev
        ? {
            ...prev,
            xPct: ((e.clientX - rect.left) / rect.width) * 100,
            yPct: ((e.clientY - rect.top) / rect.height) * 100,
          }
        : null,
    );
  }, []);


  return (
    <section id="service-area" style={sectionStyle}>
      <div style={innerStyle}>
        <header style={headerStyle}>
          {eyebrow && <p style={eyebrowStyle}>{eyebrow}</p>}
          {title && <h2 style={titleStyle}>{title}</h2>}
          {description && <p style={descriptionStyle}>{description}</p>}
        </header>

        <div
          className="map-wrap"
          style={mapWrapStyle}
          onMouseLeave={handleMouseLeave}
          role="img"
          aria-label={`Map of ${areas.length} Birdcreek Roofing service counties across Texas`}
        >
          <svg
            ref={svgRef}
            viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              cursor: isDragging ? "grabbing" : "grab",
              userSelect: "none",
              touchAction: "none",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {COUNTIES.map((county) => {
              const isServiceCounty = Boolean(county.key);
              const area = county.key ? areaMap.get(county.key) : undefined;
              const fill = area
                ? colorScale(area.clientCount)
                : isServiceCounty
                  ? CHOROPLETH_STOPS[0]
                  : COLOR_EMPTY;
              return (
                <path
                  key={county.fips}
                  d={county.d}
                  fill={fill}
                  stroke={isServiceCounty ? STROKE_ACTIVE : STROKE}
                  strokeWidth={isServiceCounty ? 0.8 : 0.4}
                  style={{ cursor: isServiceCounty ? "pointer" : "default" }}
                  onMouseEnter={(e) => handlePathEnter(e, county)}
                  onMouseMove={handlePathMove}
                  onMouseLeave={handleMouseLeave}
                />
              );
            })}
          </svg>

          {tooltip && !isDragging && (
            <div
              style={{
                ...tooltipStyle,
                left: `${tooltip.xPct.toFixed(2)}%`,
                top: `${tooltip.yPct.toFixed(2)}%`,
              }}
            >
              <p style={tooltipNameStyle}>{tooltip.name}</p>
              {/* <p style={tooltipCountStyle}>
                {tooltip.count !== null
                  ? `${tooltip.count.toLocaleString()} clients`
                  : "Outside service area"}
              </p> */}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
