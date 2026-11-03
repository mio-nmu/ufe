/**
 * A field of thin flowing wave lines bunching toward a glow left of center
 * (pure deterministic SVG — no image asset). Used as the standing texture
 * on ink hero panels; stroke color and height adapt via props.
 */
const LINE_COUNT = 96;
const SAMPLES = 90;

export function WaveField({
  width = 1600,
  height = 640,
  stroke = "#ffffff",
  opacityRange = [0.08, 0.22],
  className,
}: {
  width?: number;
  height?: number;
  stroke?: string;
  /** [min, max] opacity across the hand-drawn line shades. */
  opacityRange?: [number, number];
  className?: string;
}) {
  const [min, max] = opacityRange;
  return (
    <svg
      aria-hidden="true"
      className={className ?? "absolute inset-0 h-full w-full"}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
    >
      {Array.from({ length: LINE_COUNT }, (_, i) => {
        const shade = lineShade(i);
        // Quantized so server and browser Math.sin implementations (whose
        // results drift around the 12th decimal) render identical strings —
        // raw floats would trip React's hydration attribute check.
        return (
          <path
            key={i}
            d={wavePath(i, width, height)}
            fill="none"
            stroke={stroke}
            strokeWidth={(1.1 + shade * 0.6).toFixed(2)}
            opacity={(min + shade * (max - min)).toFixed(3)}
          />
        );
      })}
    </svg>
  );
}

/** Deterministic 0..1 shade per line so the field feels hand-drawn. */
function lineShade(i: number): number {
  const x = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function wavePath(i: number, width: number, height: number): string {
  const mid = i / (LINE_COUNT - 1) - 0.5;
  const parts: string[] = [];
  for (let s = 0; s <= SAMPLES; s++) {
    const t = s / SAMPLES;
    const y =
      height / 2 +
      mid * height * 0.92 * envelope(t) +
      ribbon(t) * (height / 19) * (0.35 + 0.65 * envelope(t));
    parts.push(
      `${s === 0 ? "M" : "L"}${(t * width).toFixed(1)} ${y.toFixed(1)}`,
    );
  }
  return parts.join(" ");
}

/** Vertical envelope: lines spread at the glow center, compress at the edges. */
function envelope(t: number): number {
  const d = (t - 0.4) / 0.36;
  return 0.42 + 0.58 * Math.exp(-d * d);
}

/** Shared undulating ribbon shape, normalized to roughly -1..1. */
function ribbon(t: number): number {
  return (
    Math.sin(t * Math.PI * 2 * 1.15 + 0.65) * 0.52 +
    Math.sin(t * Math.PI * 2 * 2.05 + 2.4) * 0.3 +
    Math.sin(t * Math.PI * 2 * 0.62 + 4.1) * 0.36
  );
}
