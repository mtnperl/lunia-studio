import React from "react";
import { BrandStyle } from "@/lib/types";

type VectorTheme = "sleep" | "brain" | "energy" | "heart" | "cycle" | "nature" | "time" | "science" | "balance" | "default";

const PATHS: Record<VectorTheme, (color: string, accent: string, bg: string) => React.ReactNode> = {
  sleep: (c, a) => (
    <g>
      {/* Moon */}
      <path d="M 220 180 A 120 120 0 1 1 380 320 A 80 80 0 1 0 220 180 Z" fill={a} opacity="0.9"/>
      {/* Stars */}
      {[[420,150],[460,200],[390,240],[440,280]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={i===0?8:5} fill={c} opacity={0.6}/>
      ))}
      {/* Soft glow ring */}
      <circle cx="300" cy="250" r="140" fill="none" stroke={a} strokeWidth="1.5" opacity="0.2"/>
    </g>
  ),
  brain: (c, a) => (
    <g>
      {/* Brain waves */}
      <path d="M100 250 Q150 200 200 250 Q250 300 300 250 Q350 200 400 250 Q450 300 500 250" fill="none" stroke={a} strokeWidth="4" strokeLinecap="round"/>
      <path d="M100 300 Q150 250 200 300 Q250 350 300 300 Q350 250 400 300 Q450 350 500 300" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
      {/* Neural node */}
      <circle cx="300" cy="200" r="50" fill="none" stroke={a} strokeWidth="2" opacity="0.4"/>
      <circle cx="300" cy="200" r="12" fill={a}/>
      {[[220,165],[380,165],[210,240],[390,240]].map(([x,y],i) => (
        <g key={i}>
          <line x1="300" y1="200" x2={x} y2={y} stroke={a} strokeWidth="1.5" opacity="0.4"/>
          <circle cx={x} cy={y} r="5" fill={c} opacity="0.7"/>
        </g>
      ))}
    </g>
  ),
  energy: (c, a) => (
    <g>
      {/* Lightning bolt */}
      <polygon points="310,100 250,280 295,280 250,420 370,220 320,220 370,100" fill={a} opacity="0.9"/>
      {/* Radiating lines */}
      {[0,45,90,135,180,225,270,315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 300 + Math.cos(rad) * 140, y1 = 260 + Math.sin(rad) * 140;
        const x2 = 300 + Math.cos(rad) * 165, y2 = 260 + Math.sin(rad) * 165;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="2" opacity="0.3"/>;
      })}
    </g>
  ),
  heart: (c, a) => (
    <g>
      <path d="M300 380 C200 310 100 250 100 170 A100 100 0 0 1 300 160 A100 100 0 0 1 500 170 C500 250 400 310 300 380Z" fill={a} opacity="0.85"/>
      <path d="M300 340 C220 285 150 240 150 185 A70 70 0 0 1 300 178 A70 70 0 0 1 450 185 C450 240 380 285 300 340Z" fill="none" stroke="white" strokeWidth="2" opacity="0.3"/>
      {/* Pulse line */}
      <polyline points="120,260 170,260 195,220 225,300 255,180 285,260 315,260 330,240 345,260 480,260" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </g>
  ),
  cycle: (c, a) => (
    <g>
      {/* Circular arrows */}
      <circle cx="300" cy="260" r="130" fill="none" stroke={a} strokeWidth="3" strokeDasharray="20 8" opacity="0.5"/>
      <circle cx="300" cy="260" r="90" fill="none" stroke={c} strokeWidth="2" opacity="0.3"/>
      {/* Arrow heads at 4 cardinal points */}
      {[[300,130],[430,260],[300,390],[170,260]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="14" fill={i % 2 === 0 ? a : c} opacity="0.8"/>
      ))}
      <circle cx="300" cy="260" r="35" fill={a} opacity="0.9"/>
      <circle cx="300" cy="260" r="20" fill="none" stroke="white" strokeWidth="2.5" opacity="0.5"/>
    </g>
  ),
  nature: (c, a) => (
    <g>
      {/* Leaf shape */}
      <path d="M300 120 C420 160 450 300 300 420 C150 300 180 160 300 120Z" fill={a} opacity="0.8"/>
      {/* Leaf vein */}
      <path d="M300 130 C300 260 300 380 300 410" stroke="white" strokeWidth="2.5" opacity="0.5" fill="none"/>
      {[[255,200],[265,250],[275,300],[345,200],[335,250],[325,300]].map(([x,y],i) => (
        <line key={i} x1="300" y1={y} x2={x} y2={y + (i < 3 ? -20 : -20)} stroke="white" strokeWidth="1.5" opacity="0.4"/>
      ))}
      <circle cx="300" cy="430" r="8" fill={c} opacity="0.5"/>
    </g>
  ),
  time: (c, a) => (
    <g>
      {/* Clock face */}
      <circle cx="300" cy="260" r="150" fill="none" stroke={a} strokeWidth="3" opacity="0.5"/>
      <circle cx="300" cy="260" r="140" fill="none" stroke={c} strokeWidth="1" opacity="0.2"/>
      {/* Hour marks */}
      {Array.from({length: 12}, (_,i) => {
        const angle = (i * 30 - 90) * Math.PI / 180;
        const len = i % 3 === 0 ? 20 : 10;
        return <line key={i} x1={300 + Math.cos(angle)*130} y1={260 + Math.sin(angle)*130} x2={300 + Math.cos(angle)*(130-len)} y2={260 + Math.sin(angle)*(130-len)} stroke={a} strokeWidth={i%3===0?3:1.5} opacity="0.7"/>;
      })}
      {/* Hands */}
      <line x1="300" y1="260" x2="300" y2="150" stroke={a} strokeWidth="4" strokeLinecap="round"/>
      <line x1="300" y1="260" x2="390" y2="300" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
      <circle cx="300" cy="260" r="10" fill={a}/>
    </g>
  ),
  science: (c, a) => (
    <g>
      {/* Molecule structure */}
      <circle cx="300" cy="200" r="40" fill={a} opacity="0.85"/>
      <circle cx="180" cy="320" r="30" fill={c} opacity="0.7"/>
      <circle cx="420" cy="320" r="30" fill={c} opacity="0.7"/>
      <circle cx="300" cy="400" r="25" fill={a} opacity="0.5"/>
      <line x1="300" y1="240" x2="200" y2="300" stroke={a} strokeWidth="4" strokeLinecap="round" opacity="0.6"/>
      <line x1="300" y1="240" x2="400" y2="300" stroke={a} strokeWidth="4" strokeLinecap="round" opacity="0.6"/>
      <line x1="200" y1="350" x2="300" y2="380" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
      <line x1="400" y1="350" x2="300" y2="380" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
      {/* Electron orbit */}
      <ellipse cx="300" cy="260" rx="160" ry="60" fill="none" stroke={a} strokeWidth="1.5" opacity="0.25" transform="rotate(-30 300 260)"/>
    </g>
  ),
  balance: (c, a) => (
    <g>
      {/* Balance scale */}
      <line x1="300" y1="140" x2="300" y2="360" stroke={a} strokeWidth="4" strokeLinecap="round"/>
      <line x1="160" y1="220" x2="440" y2="220" stroke={a} strokeWidth="3.5" strokeLinecap="round"/>
      {/* Left pan */}
      <path d="M100 260 Q160 280 220 260" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      <line x1="160" y1="222" x2="160" y2="260" stroke={c} strokeWidth="2" opacity="0.6"/>
      {/* Right pan */}
      <path d="M380 240 Q440 260 500 240" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      <line x1="440" y1="222" x2="440" y2="240" stroke={c} strokeWidth="2" opacity="0.6"/>
      {/* Center pivot */}
      <circle cx="300" cy="140" r="12" fill={a}/>
      <polygon points="288,380 300,350 312,380" fill={a} opacity="0.5"/>
    </g>
  ),
  default: (c, a) => (
    <g>
      {/* Abstract geometric composition */}
      <circle cx="300" cy="260" r="120" fill="none" stroke={a} strokeWidth="2.5" opacity="0.4"/>
      <circle cx="300" cy="260" r="80" fill={a} opacity="0.15"/>
      <circle cx="300" cy="260" r="40" fill={a} opacity="0.7"/>
      <line x1="140" y1="260" x2="460" y2="260" stroke={c} strokeWidth="1.5" opacity="0.3"/>
      <line x1="300" y1="100" x2="300" y2="420" stroke={c} strokeWidth="1.5" opacity="0.3"/>
    </g>
  ),
};

function themeFromKeywords(keywords: string): VectorTheme {
  const k = keywords.toLowerCase();
  if (/sleep|melatonin|insomnia|rest|night|bed|dream/.test(k)) return "sleep";
  if (/brain|cognitive|memory|focus|neural|cortex|adenosine/.test(k)) return "brain";
  if (/energy|fatigue|tired|alert|caffeine|atp|mitochondria/.test(k)) return "energy";
  if (/heart|cardiovascular|blood|stress|cortisol|anxiety/.test(k)) return "heart";
  if (/cycle|circadian|rhythm|routine|habit|pattern|loop/.test(k)) return "cycle";
  if (/nature|plant|organic|natural|herb|botanical/.test(k)) return "nature";
  if (/time|hour|duration|minutes|schedule|chronotype/.test(k)) return "time";
  if (/magnesium|vitamin|mineral|supplement|molecule|compound/.test(k)) return "science";
  if (/balance|equilibrium|homeostasis|ratio|proportion/.test(k)) return "balance";
  return "default";
}

type Props = {
  keywords: string;
  label?: string;
  brandStyle?: BrandStyle;
};

export function VectorIllustration({ keywords, label, brandStyle }: Props) {
  const theme = themeFromKeywords(keywords);
  const accent = brandStyle?.accent ?? "#1e7a8a";
  const body = brandStyle?.body ?? "#1a2535";
  const bg = brandStyle?.background ?? "#f0ece6";

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <svg
        viewBox="0 0 600 520"
        width="100%"
        style={{ maxHeight: 320 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="600" height="520" fill="transparent"/>
        {PATHS[theme]?.(body, accent, bg) ?? PATHS.default(body, accent, bg)}
      </svg>
      {label && (
        <div style={{
          fontFamily: "Jost, sans-serif",
          fontSize: 20,
          fontWeight: 400,
          color: accent,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          textAlign: "center",
          opacity: 0.85,
        }}>
          {label}
        </div>
      )}
    </div>
  );
}
