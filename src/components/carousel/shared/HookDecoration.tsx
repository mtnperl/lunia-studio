'use client';

// ─── Hook slide decoration system ─────────────────────────────────────────────
// Each topic maps to a different scientific-style decorative element that
// replaces the static WaveLines on every hook slide.
//
// Topic → Decoration:
//   sleep / melatonin / circadian  → Circadian rhythm arcs
//   stress / cortisol / anxiety    → EEG brainwave rows
//   magnesium / supplement / mineral → Molecular hex lattice
//   everything else                 → Constellation star field

export type HookDecorationType = 'circadian' | 'brainwave' | 'molecular' | 'constellation';

const W = 1080, H = 540; // viewBox dims (= 100% × 40% of 1080×1350 slide)

// ─── 1. Circadian Rhythm ───────────────────────────────────────────────────────
// Multiple stacked sine arcs peaking at midnight — melatonin cycle shape.
function Circadian({ color, accent }: { color: string; accent: string }) {
  const baseY = H - 50;

  type Layer = { amp: number; fillOp: number; strokeOp: number; stroke: string; sw: number; dash?: string };
  const layers: Layer[] = [
    { amp: 440, fillOp: 0.13, strokeOp: 0.60, stroke: accent, sw: 2.5 },
    { amp: 320, fillOp: 0.07, strokeOp: 0.42, stroke: accent, sw: 1.5 },
    { amp: 210, fillOp: 0.04, strokeOp: 0.28, stroke: color,  sw: 1.2 },
    { amp: 130, fillOp: 0,    strokeOp: 0.18, stroke: color,  sw: 0.8, dash: '10 6' },
    { amp: 70,  fillOp: 0,    strokeOp: 0.12, stroke: color,  sw: 0.6, dash: '5 5'  },
  ];

  function arc(amp: number): [number, number][] {
    return Array.from({ length: 182 }, (_, j) => {
      const x = j * 6;
      const t = x / W;
      const y = baseY - amp * Math.sin(t * Math.PI) ** 2;
      return [Math.min(x, W), Math.max(8, y)] as [number, number];
    });
  }

  const timeTicks: Array<[string, number]> = [
    ['8PM', 0], ['11PM', 0.21], ['2AM', 0.5], ['5AM', 0.79], ['8AM', 1],
  ];

  return (
    <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40%' }}
      viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">

      {layers.map(({ amp, fillOp, strokeOp, stroke, sw, dash }, i) => {
        const pts = arc(amp);
        const pStr = pts.map(([x, y]) => `${x},${Math.round(y)}`).join(' ');
        const aStr = `M0,${H} L${pts.map(([x, y]) => `${x},${Math.round(y)}`).join(' L')} L${W},${H} Z`;
        return (
          <g key={i}>
            {fillOp > 0 && <path d={aStr} fill={accent} fillOpacity={fillOp} />}
            <polyline points={pStr} fill="none" stroke={stroke} strokeWidth={sw}
              opacity={strokeOp} strokeLinejoin="round" strokeDasharray={dash} />
          </g>
        );
      })}

      {/* Time axis */}
      <line x1="0" y1={baseY + 10} x2={W} y2={baseY + 10} stroke={color} strokeWidth="0.6" opacity="0.15" />
      {timeTicks.map(([label, t], i) => {
        const x = Math.round(t * W);
        const anchor = i === timeTicks.length - 1 ? x - 56 : x - 20;
        return (
          <g key={i}>
            <line x1={x} y1={baseY + 8} x2={x} y2={baseY + 22} stroke={color} strokeWidth="0.8" opacity="0.22" />
            <text x={anchor} y={H - 8} fill={color} fontSize="19" opacity="0.3"
              fontFamily="Inter,sans-serif" letterSpacing="0.06em">{label}</text>
          </g>
        );
      })}

      <text x="32" y="68" fill={accent} fontSize="21" opacity="0.55"
        fontFamily="Inter,sans-serif" fontWeight="500" letterSpacing="0.14em">
        MELATONIN CURVE
      </text>
    </svg>
  );
}

// ─── 2. Brainwave / EEG ───────────────────────────────────────────────────────
// Four EEG wave rows (BETA → DELTA): frequency decreases, amplitude increases.
function Brainwave({ color, accent }: { color: string; accent: string }) {
  const rows = [
    { label: 'BETA',  freq: 22, amp: 22, cy: 110, stroke: color,  op: 0.45 },
    { label: 'ALPHA', freq: 11, amp: 42, cy: 235, stroke: accent, op: 0.55 },
    { label: 'THETA', freq: 6,  amp: 64, cy: 365, stroke: color,  op: 0.40 },
    { label: 'DELTA', freq: 3,  amp: 86, cy: 470, stroke: accent, op: 0.38 },
  ];

  const xStart = 130, xEnd = W - 30;
  const xRange = xEnd - xStart;

  return (
    <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40%' }}
      viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">

      {/* Horizontal guide rails */}
      {rows.map(({ cy }) => (
        <line key={cy} x1={xStart} y1={cy} x2={xEnd} y2={cy}
          stroke={color} strokeWidth="0.4" opacity="0.08" />
      ))}

      {rows.map(({ label, freq, amp, cy, stroke, op }) => {
        const pts = Array.from({ length: Math.ceil(xRange / 4) }, (_, j) => {
          const x = xStart + j * 4;
          const t = (x - xStart) / xRange;
          return `${x},${(cy + amp * Math.sin(t * freq * Math.PI * 2)).toFixed(1)}`;
        }).join(' ');
        return (
          <g key={label}>
            <text x="18" y={cy + 7} fill={stroke} fontSize="18" opacity={op * 0.85}
              fontFamily="Inter,sans-serif" letterSpacing="0.12em" fontWeight="500">{label}</text>
            <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.8"
              opacity={op} strokeLinejoin="round" />
          </g>
        );
      })}

      <text x="32" y="52" fill={color} fontSize="21" opacity="0.5"
        fontFamily="Inter,sans-serif" letterSpacing="0.14em">
        EEG SLEEP STAGES
      </text>
    </svg>
  );
}

// ─── 3. Molecular Hex Lattice ─────────────────────────────────────────────────
// Hexagonal crystal lattice suggesting mineral/supplement molecular structure.
function Molecular({ color, accent }: { color: string; accent: string }) {
  const R = 66; // hex radius
  const hW = R * Math.sqrt(3); // horizontal center-to-center (pointy-top hex)
  const vH = R * 1.5;           // vertical center-to-center

  // Hex vertex path for pointy-top hexagons (vertex at top/bottom)
  function hexPath(cx: number, cy: number): string {
    return Array.from({ length: 6 }, (_, i) => {
      const a = (i * 60 - 90) * (Math.PI / 180);
      return `${i === 0 ? 'M' : 'L'}${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`;
    }).join(' ') + ' Z';
  }

  // Two offset rows of hexagons across the bottom
  const row1Y = H - 60;                       // bottom row
  const row2Y = row1Y - vH;                   // middle row

  const row1: [number, number][] = Array.from({ length: 10 }, (_, i) => [i * hW - 20, row1Y]);
  const row2: [number, number][] = Array.from({ length: 10 }, (_, i) => [i * hW + hW / 2 - 20, row2Y]);

  // Atom labels at chosen vertices (visual balance, not chemical accuracy)
  const atoms = [
    { x: row1[2][0], y: row1Y - R,      label: 'O',   col: color  },
    { x: row1[3][0], y: row1Y - R * 2,  label: 'Mg²⁺', col: accent },
    { x: row2[1][0], y: row2Y - R,      label: 'N',   col: color  },
    { x: row2[3][0], y: row2Y - R,      label: 'O',   col: accent },
    { x: row2[5][0], y: row2Y + R,      label: 'N',   col: color  },
    { x: row1[5][0], y: row1Y - R,      label: 'C',   col: color  },
  ];

  return (
    <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40%' }}
      viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">

      <defs>
        <clipPath id="molClip"><rect x="0" y="0" width={W} height={H} /></clipPath>
      </defs>
      <g clipPath="url(#molClip)">
        {[...row1, ...row2].map(([cx, cy], i) => (
          <path key={i} d={hexPath(cx, cy)} fill="none" stroke={color} strokeWidth="0.9" opacity="0.22" />
        ))}

        {atoms.map(({ x, y, label, col }, i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={label === 'Mg²⁺' ? 18 : 12}
              fill={col === accent ? accent : color} fillOpacity="0.12" />
            <text x={x} y={y + 5} fill={col} fontSize={label === 'Mg²⁺' ? 15 : 17}
              opacity="0.65" textAnchor="middle" fontFamily="Inter,sans-serif">{label}</text>
          </g>
        ))}
      </g>

      <text x="32" y="66" fill={accent} fontSize="21" opacity="0.55"
        fontFamily="Inter,sans-serif" fontWeight="500" letterSpacing="0.14em">
        MOLECULAR STRUCTURE
      </text>
    </svg>
  );
}

// ─── 4. Constellation ─────────────────────────────────────────────────────────
// Star field with constellation lines — for longevity, routine, and general topics.
function Constellation({ color, accent }: { color: string; accent: string }) {
  const stars = [
    { x: 80,   y: 200, r: 5  },
    { x: 195,  y: 420, r: 3  },
    { x: 295,  y: 295, r: 7  },
    { x: 415,  y: 155, r: 4  },
    { x: 510,  y: 390, r: 5  },
    { x: 635,  y: 245, r: 7  },
    { x: 745,  y: 455, r: 3  },
    { x: 820,  y: 305, r: 5  },
    { x: 915,  y: 175, r: 4  },
    { x: 1015, y: 415, r: 6  },
    { x: 170,  y: 320, r: 3  },
    { x: 455,  y: 495, r: 4  },
    { x: 695,  y: 140, r: 3  },
    { x: 875,  y: 490, r: 4  },
  ];

  const lines: [number, number][] = [
    [0, 2], [2, 3], [3, 5], [5, 7], [7, 8],
    [1, 2], [4, 5], [6, 7], [9, 7],
    [10, 2], [11, 4], [12, 5], [13, 9],
  ];

  function sparkle(cx: number, cy: number, r: number): string {
    return `M${cx},${cy - r} Q${cx},${cy} ${cx + r},${cy} Q${cx},${cy} ${cx},${cy + r} Q${cx},${cy} ${cx - r},${cy} Q${cx},${cy} ${cx},${cy - r}Z`;
  }

  return (
    <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40%' }}
      viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">

      {lines.map(([a, b], i) => (
        <line key={i} x1={stars[a].x} y1={stars[a].y} x2={stars[b].x} y2={stars[b].y}
          stroke={color} strokeWidth="0.7" opacity="0.2" />
      ))}

      {stars.map(({ x, y, r }, i) => {
        const large = r >= 5;
        const col = i % 4 === 0 ? accent : color;
        return large
          ? <path key={i} d={sparkle(x, y, r * 3)} fill={col} opacity={large ? 0.65 : 0.35} />
          : <circle key={i} cx={x} cy={y} r={r} fill={color} opacity="0.35" />;
      })}

      <text x="32" y="80" fill={accent} fontSize="21" opacity="0.5"
        fontFamily="Inter,sans-serif" letterSpacing="0.14em">
        SLEEP CYCLE
      </text>
    </svg>
  );
}

// ─── Selector ──────────────────────────────────────────────────────────────────
export function getHookDecorationType(topic: string): HookDecorationType {
  const lower = topic.toLowerCase();
  if (/sleep|melatonin|circadian|rem|insomnia|deep sleep|slumber/.test(lower)) return 'circadian';
  if (/stress|cortisol|anxiety|nervous|adrenal|hormone|testosterone/.test(lower)) return 'brainwave';
  if (/magnesium|glycinate|theanine|supplement|ingredient|mineral|vitamin|apigenin/.test(lower)) return 'molecular';
  return 'constellation';
}

interface Props {
  type: HookDecorationType;
  color: string;
  accent: string;
}

export default function HookDecoration({ type, color, accent }: Props) {
  switch (type) {
    case 'circadian':     return <Circadian color={color} accent={accent} />;
    case 'brainwave':     return <Brainwave color={color} accent={accent} />;
    case 'molecular':     return <Molecular color={color} accent={accent} />;
    case 'constellation': return <Constellation color={color} accent={accent} />;
  }
}
