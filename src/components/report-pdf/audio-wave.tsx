import { useEffect, useRef } from "react";

/**
 * AudioWave — an animated equalizer that visualizes live microphone input while
 * dictation is recording. Rendered full-width inside the input's `end` slot, so
 * the bars stretch across the whole field. When an AnalyserNode is provided the
 * bars track real audio levels; without one they fall back to a CSS animation so
 * the indicator still reads as active.
 */
interface AudioWaveProps {
  analyser: AnalyserNode | null;
}

const BAR_COUNT = 32;
const BAR_WIDTH = 2;
const BAR_GAP = 3;
const VIEW_HEIGHT = 18;
const MIN_BAR = 2;
const VIEW_WIDTH = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP;

// Stable keys so we don't key list items by array index.
const BAR_IDS = Array.from(
  { length: BAR_COUNT },
  (_, index) => `wave-bar-${index}`
);

export const AudioWave = ({ analyser }: AudioWaveProps) => {
  const barsRef = useRef<(SVGRectElement | null)[]>([]);

  useEffect(() => {
    if (!analyser) {
      return;
    }
    const bins = new Uint8Array(analyser.frequencyBinCount);
    // Sample the lower/mid bands where speech energy lives.
    const step = Math.max(1, Math.floor(bins.length / (BAR_COUNT + 2)));
    let frame = 0;

    const draw = () => {
      analyser.getByteFrequencyData(bins);
      for (let index = 0; index < BAR_COUNT; index += 1) {
        const rect = barsRef.current[index];
        if (!rect) {
          continue;
        }
        const level = (bins[(index + 1) * step] ?? 0) / 255;
        const height = Math.max(MIN_BAR, level * VIEW_HEIGHT);
        rect.setAttribute("height", height.toFixed(2));
        rect.setAttribute("y", ((VIEW_HEIGHT - height) / 2).toFixed(2));
      }
      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [analyser]);

  return (
    <svg
      aria-hidden="true"
      className={`report-wave${analyser ? "" : " report-wave--sim"}`}
      focusable="false"
      preserveAspectRatio="none"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
    >
      {BAR_IDS.map((id, index) => (
        <rect
          height={MIN_BAR}
          key={id}
          ref={(element) => {
            barsRef.current[index] = element;
          }}
          rx={BAR_WIDTH / 2}
          // Staggered offset only matters for the CSS fallback animation.
          style={
            analyser ? undefined : { animationDelay: `${(index % 6) * 0.1}s` }
          }
          width={BAR_WIDTH}
          x={index * (BAR_WIDTH + BAR_GAP)}
          y={(VIEW_HEIGHT - MIN_BAR) / 2}
        />
      ))}
    </svg>
  );
};
