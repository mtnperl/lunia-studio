import React from "react";
import { BrandStyle } from "@/lib/types";

type VectorTheme =
  | "sleep" | "brain" | "energy" | "heart" | "cycle" | "nature" | "time"
  | "science" | "balance" | "default"
  // New themes
  | "stress" | "meditation" | "gut" | "immune" | "vitamin" | "inflammation"
  | "hydration" | "workout" | "breathing" | "mood" | "sunlight" | "cold"
  | "hormone" | "dopamine" | "tension" | "growth" | "prevention" | "weight"
  | "aging" | "microbiome" | "nutrition" | "posture" | "recovery" | "focus2";

const PATHS: Record<VectorTheme, (color: string, accent: string, bg: string) => React.ReactNode> = {
  // ── Original 10 ──────────────────────────────────────────────────────────
  sleep: (c, a) => (
    <g>
      <path d="M 220 180 A 120 120 0 1 1 380 320 A 80 80 0 1 0 220 180 Z" fill={a} opacity="0.9"/>
      {[[420,150],[460,200],[390,240],[440,280]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={i===0?8:5} fill={c} opacity={0.6}/>
      ))}
      <circle cx="300" cy="250" r="140" fill="none" stroke={a} strokeWidth="1.5" opacity="0.2"/>
    </g>
  ),
  brain: (c, a) => (
    <g>
      <path d="M100 250 Q150 200 200 250 Q250 300 300 250 Q350 200 400 250 Q450 300 500 250" fill="none" stroke={a} strokeWidth="4" strokeLinecap="round"/>
      <path d="M100 300 Q150 250 200 300 Q250 350 300 300 Q350 250 400 300 Q450 350 500 300" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
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
      <polygon points="310,100 250,280 295,280 250,420 370,220 320,220 370,100" fill={a} opacity="0.9"/>
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
      <polyline points="120,260 170,260 195,220 225,300 255,180 285,260 315,260 330,240 345,260 480,260" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </g>
  ),
  cycle: (c, a) => (
    <g>
      <circle cx="300" cy="260" r="130" fill="none" stroke={a} strokeWidth="3" strokeDasharray="20 8" opacity="0.5"/>
      <circle cx="300" cy="260" r="90" fill="none" stroke={c} strokeWidth="2" opacity="0.3"/>
      {[[300,130],[430,260],[300,390],[170,260]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="14" fill={i % 2 === 0 ? a : c} opacity="0.8"/>
      ))}
      <circle cx="300" cy="260" r="35" fill={a} opacity="0.9"/>
      <circle cx="300" cy="260" r="20" fill="none" stroke="white" strokeWidth="2.5" opacity="0.5"/>
    </g>
  ),
  nature: (c, a) => (
    <g>
      <path d="M300 120 C420 160 450 300 300 420 C150 300 180 160 300 120Z" fill={a} opacity="0.8"/>
      <path d="M300 130 C300 260 300 380 300 410" stroke="white" strokeWidth="2.5" opacity="0.5" fill="none"/>
      {[[255,200],[265,250],[275,300],[345,200],[335,250],[325,300]].map(([x,y],i) => (
        <line key={i} x1="300" y1={y} x2={x} y2={y + (i < 3 ? -20 : -20)} stroke="white" strokeWidth="1.5" opacity="0.4"/>
      ))}
      <circle cx="300" cy="430" r="8" fill={c} opacity="0.5"/>
    </g>
  ),
  time: (c, a) => (
    <g>
      <circle cx="300" cy="260" r="150" fill="none" stroke={a} strokeWidth="3" opacity="0.5"/>
      <circle cx="300" cy="260" r="140" fill="none" stroke={c} strokeWidth="1" opacity="0.2"/>
      {Array.from({length: 12}, (_,i) => {
        const angle = (i * 30 - 90) * Math.PI / 180;
        const len = i % 3 === 0 ? 20 : 10;
        return <line key={i} x1={300 + Math.cos(angle)*130} y1={260 + Math.sin(angle)*130} x2={300 + Math.cos(angle)*(130-len)} y2={260 + Math.sin(angle)*(130-len)} stroke={a} strokeWidth={i%3===0?3:1.5} opacity="0.7"/>;
      })}
      <line x1="300" y1="260" x2="300" y2="150" stroke={a} strokeWidth="4" strokeLinecap="round"/>
      <line x1="300" y1="260" x2="390" y2="300" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
      <circle cx="300" cy="260" r="10" fill={a}/>
    </g>
  ),
  science: (c, a) => (
    <g>
      <circle cx="300" cy="200" r="40" fill={a} opacity="0.85"/>
      <circle cx="180" cy="320" r="30" fill={c} opacity="0.7"/>
      <circle cx="420" cy="320" r="30" fill={c} opacity="0.7"/>
      <circle cx="300" cy="400" r="25" fill={a} opacity="0.5"/>
      <line x1="300" y1="240" x2="200" y2="300" stroke={a} strokeWidth="4" strokeLinecap="round" opacity="0.6"/>
      <line x1="300" y1="240" x2="400" y2="300" stroke={a} strokeWidth="4" strokeLinecap="round" opacity="0.6"/>
      <line x1="200" y1="350" x2="300" y2="380" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
      <line x1="400" y1="350" x2="300" y2="380" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
      <ellipse cx="300" cy="260" rx="160" ry="60" fill="none" stroke={a} strokeWidth="1.5" opacity="0.25" transform="rotate(-30 300 260)"/>
    </g>
  ),
  balance: (c, a) => (
    <g>
      <line x1="300" y1="140" x2="300" y2="360" stroke={a} strokeWidth="4" strokeLinecap="round"/>
      <line x1="160" y1="220" x2="440" y2="220" stroke={a} strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M100 260 Q160 280 220 260" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      <line x1="160" y1="222" x2="160" y2="260" stroke={c} strokeWidth="2" opacity="0.6"/>
      <path d="M380 240 Q440 260 500 240" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      <line x1="440" y1="222" x2="440" y2="240" stroke={c} strokeWidth="2" opacity="0.6"/>
      <circle cx="300" cy="140" r="12" fill={a}/>
      <polygon points="288,380 300,350 312,380" fill={a} opacity="0.5"/>
    </g>
  ),
  default: (c, a) => (
    <g>
      <circle cx="300" cy="260" r="120" fill="none" stroke={a} strokeWidth="2.5" opacity="0.4"/>
      <circle cx="300" cy="260" r="80" fill={a} opacity="0.15"/>
      <circle cx="300" cy="260" r="40" fill={a} opacity="0.7"/>
      <line x1="140" y1="260" x2="460" y2="260" stroke={c} strokeWidth="1.5" opacity="0.3"/>
      <line x1="300" y1="100" x2="300" y2="420" stroke={c} strokeWidth="1.5" opacity="0.3"/>
    </g>
  ),

  // ── New themes ────────────────────────────────────────────────────────────
  stress: (c, a) => (
    <g>
      {/* Tangled spring / coil — compressed tension */}
      {Array.from({length: 8}, (_, i) => {
        const y = 160 + i * 30;
        const amp = 40 + i * 8;
        return <path key={i} d={`M ${300 - amp} ${y} Q ${300} ${y - 22} ${300 + amp} ${y}`} fill="none" stroke={i % 2 === 0 ? a : c} strokeWidth={3 - i * 0.15} strokeLinecap="round" opacity={0.9 - i * 0.08}/>;
      })}
      {/* Tension endpoints */}
      <rect x="140" y="148" width="320" height="12" rx="6" fill={a} opacity="0.25"/>
      <rect x="140" y="380" width="320" height="12" rx="6" fill={a} opacity="0.25"/>
    </g>
  ),

  meditation: (c, a) => (
    <g>
      {/* Concentric ripple rings */}
      {[40, 75, 110, 148, 188].map((r, i) => (
        <circle key={i} cx="300" cy="260" r={r} fill="none" stroke={a} strokeWidth={2 - i * 0.25} opacity={0.8 - i * 0.14}/>
      ))}
      {/* Central lotus dot */}
      <circle cx="300" cy="260" r="20" fill={a} opacity="0.9"/>
      {/* Petal hints */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x = 300 + Math.cos(rad) * 52, y = 260 + Math.sin(rad) * 52;
        return <ellipse key={i} cx={x} cy={y} rx="14" ry="8" fill={a} opacity="0.35" transform={`rotate(${deg} ${x} ${y})`}/>;
      })}
    </g>
  ),

  gut: (c, a) => (
    <g>
      {/* Organic intestine-like curves */}
      <path d="M160 180 Q240 120 300 180 Q360 240 420 180 Q480 120 500 200 Q520 280 460 320 Q400 360 380 420" fill="none" stroke={a} strokeWidth="12" strokeLinecap="round" opacity="0.7"/>
      <path d="M160 180 Q240 120 300 180 Q360 240 420 180 Q480 120 500 200 Q520 280 460 320 Q400 360 380 420" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.2"/>
      {/* Microbiome dots */}
      {[[200,240],[260,200],[340,220],[400,260],[450,300],[360,380]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={5 + (i % 3) * 2} fill={c} opacity={0.5 + i * 0.06}/>
      ))}
    </g>
  ),

  immune: (c, a) => (
    <g>
      {/* Shield shape */}
      <path d="M300 120 L440 180 L440 300 Q440 400 300 440 Q160 400 160 300 L160 180 Z" fill={a} opacity="0.2" stroke={a} strokeWidth="3"/>
      {/* Inner shield */}
      <path d="M300 160 L400 205 L400 300 Q400 370 300 400 Q200 370 200 300 L200 205 Z" fill={a} opacity="0.3"/>
      {/* Check mark */}
      <polyline points="240,280 285,325 360,240" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
    </g>
  ),

  vitamin: (c, a) => (
    <g>
      {/* Capsule pill */}
      <rect x="180" y="210" width="240" height="100" rx="50" fill={a} opacity="0.85"/>
      <rect x="180" y="210" width="120" height="100" rx="50" fill={c} opacity="0.9"/>
      {/* Dividing line */}
      <line x1="300" y1="210" x2="300" y2="310" stroke="white" strokeWidth="2.5" opacity="0.4"/>
      {/* Sparkle dots */}
      {[[160,180],[440,180],[150,350],[450,350],[300,160]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={4 + i} fill={a} opacity={0.4 - i * 0.06}/>
      ))}
    </g>
  ),

  inflammation: (c, a) => (
    <g>
      {/* Flame-like spiky shape */}
      <path d="M300 120 L330 200 L360 160 L350 250 L400 220 L370 310 L420 290 L380 390 L300 420 L220 390 L180 290 L230 310 L200 220 L250 250 L240 160 L270 200 Z" fill={a} opacity="0.8"/>
      {/* Inner flame */}
      <path d="M300 200 L320 260 L345 240 L330 320 L300 360 L270 320 L255 240 L280 260 Z" fill={c} opacity="0.5"/>
      {/* Hot glow */}
      <circle cx="300" cy="300" r="100" fill={a} opacity="0.08"/>
    </g>
  ),

  hydration: (c, a) => (
    <g>
      {/* Large water drop */}
      <path d="M300 120 C300 120 180 280 180 340 A120 120 0 0 0 420 340 C420 280 300 120 300 120Z" fill={a} opacity="0.8"/>
      {/* Highlight */}
      <path d="M260 250 C255 290 260 320 270 340" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" opacity="0.35"/>
      {/* Ripple at bottom */}
      {[40, 70, 100].map((r, i) => (
        <ellipse key={i} cx="300" cy="440" rx={r} ry={r * 0.3} fill="none" stroke={a} strokeWidth="1.5" opacity={0.4 - i * 0.12}/>
      ))}
    </g>
  ),

  workout: (c, a) => (
    <g>
      {/* Dumbbell */}
      <rect x="200" y="240" width="200" height="40" rx="8" fill={a} opacity="0.7"/>
      <rect x="150" y="200" width="60" height="120" rx="10" fill={a} opacity="0.9"/>
      <rect x="390" y="200" width="60" height="120" rx="10" fill={a} opacity="0.9"/>
      <rect x="130" y="220" width="30" height="80" rx="6" fill={c} opacity="0.8"/>
      <rect x="440" y="220" width="30" height="80" rx="6" fill={c} opacity="0.8"/>
      {/* Energy arc */}
      <path d="M180 160 Q300 100 420 160" fill="none" stroke={a} strokeWidth="3" strokeLinecap="round" opacity="0.4"/>
    </g>
  ),

  breathing: (c, a) => (
    <g>
      {/* Expanding breath rings — inhale/exhale rhythm */}
      {[50, 85, 120, 158].map((r, i) => (
        <circle key={i} cx="300" cy="260" r={r} fill={i === 0 ? a : "none"} fillOpacity="0.7" stroke={a} strokeWidth={i === 0 ? 0 : 2} opacity={0.9 - i * 0.18}/>
      ))}
      {/* Arrow hints for direction */}
      <path d="M300 90 L310 110 L300 105 L290 110 Z" fill={a} opacity="0.5"/>
      <path d="M300 430 L310 410 L300 415 L290 410 Z" fill={a} opacity="0.5"/>
      <path d="M130 260 L150 250 L145 260 L150 270 Z" fill={a} opacity="0.5"/>
      <path d="M470 260 L450 250 L455 260 L450 270 Z" fill={a} opacity="0.5"/>
    </g>
  ),

  mood: (c, a) => (
    <g>
      {/* Spectrum wave bands */}
      {[0,1,2,3,4].map(i => {
        const y = 160 + i * 55;
        const amp = 55 - i * 6;
        return (
          <path key={i} d={`M 100 ${y} Q 200 ${y - amp} 300 ${y} Q 400 ${y + amp} 500 ${y}`}
            fill="none" stroke={a} strokeWidth={5 - i * 0.5} strokeLinecap="round"
            opacity={0.9 - i * 0.15}/>
        );
      })}
      {/* Central dot */}
      <circle cx="300" cy="260" r="22" fill={a} opacity="0.9"/>
    </g>
  ),

  sunlight: (c, a) => (
    <g>
      {/* Sun core */}
      <circle cx="300" cy="260" r="70" fill={a} opacity="0.85"/>
      {/* Rays */}
      {Array.from({length: 12}, (_, i) => {
        const angle = (i * 30) * Math.PI / 180;
        const x1 = 300 + Math.cos(angle) * 88, y1 = 260 + Math.sin(angle) * 88;
        const x2 = 300 + Math.cos(angle) * (i % 3 === 0 ? 150 : 125), y2 = 260 + Math.sin(angle) * (i % 3 === 0 ? 150 : 125);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={a} strokeWidth={i % 3 === 0 ? 4 : 2.5} strokeLinecap="round" opacity={0.7}/>;
      })}
      {/* Glow ring */}
      <circle cx="300" cy="260" r="110" fill="none" stroke={a} strokeWidth="1" opacity="0.2"/>
    </g>
  ),

  cold: (c, a) => (
    <g>
      {/* Snowflake — 6-fold symmetry */}
      {Array.from({length: 6}, (_, i) => {
        const angle = (i * 60) * Math.PI / 180;
        const ex = 300 + Math.cos(angle) * 150, ey = 260 + Math.sin(angle) * 150;
        // branch points
        const bx1 = 300 + Math.cos(angle - 0.5) * 85, by1 = 260 + Math.sin(angle - 0.5) * 85;
        const bx2 = 300 + Math.cos(angle + 0.5) * 85, by2 = 260 + Math.sin(angle + 0.5) * 85;
        const bex1 = bx1 + Math.cos(angle - 0.5) * 45, bey1 = by1 + Math.sin(angle - 0.5) * 45;
        const bex2 = bx2 + Math.cos(angle + 0.5) * 45, bey2 = by2 + Math.sin(angle + 0.5) * 45;
        return (
          <g key={i}>
            <line x1="300" y1="260" x2={ex} y2={ey} stroke={a} strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
            <line x1={bx1} y1={by1} x2={bex1} y2={bey1} stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
            <line x1={bx2} y1={by2} x2={bex2} y2={bey2} stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
          </g>
        );
      })}
      <circle cx="300" cy="260" r="16" fill={a} opacity="0.9"/>
    </g>
  ),

  hormone: (c, a) => (
    <g>
      {/* Two intertwined sine waves — hormone feedback loop */}
      <path d="M100 220 Q175 140 250 220 Q325 300 400 220 Q475 140 500 180" fill="none" stroke={a} strokeWidth="4.5" strokeLinecap="round"/>
      <path d="M100 300 Q175 380 250 300 Q325 220 400 300 Q475 380 500 340" fill="none" stroke={c} strokeWidth="4.5" strokeLinecap="round" opacity="0.7"/>
      {/* Intersection dots */}
      {[[250, 260],[400, 260]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="10" fill={i === 0 ? a : c} opacity="0.9"/>
      ))}
    </g>
  ),

  dopamine: (c, a) => (
    <g>
      {/* Reward pathway — ascending nodes */}
      {[[150,380],[220,310],[290,230],[360,165],[450,120]].map(([x,y],i,arr) => (
        <g key={i}>
          {i < arr.length - 1 && (
            <line x1={x} y1={y} x2={arr[i+1][0]} y2={arr[i+1][1]} stroke={a} strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
          )}
          <circle cx={x} cy={y} r={10 + i * 4} fill={a} opacity={0.4 + i * 0.12}/>
        </g>
      ))}
      {/* Sparkle at peak */}
      {[[-18,0],[0,-22],[18,0],[0,22]].map(([dx,dy],i) => (
        <line key={i} x1={450} y1={120} x2={450+dx} y2={120+dy} stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
      ))}
    </g>
  ),

  tension: (c, a) => (
    <g>
      {/* Compressed spring */}
      {Array.from({length: 10}, (_, i) => {
        const y = 150 + i * 22;
        const dir = i % 2 === 0 ? 1 : -1;
        return <line key={i} x1={300 - 110 * dir} y1={y} x2={300 + 110 * dir} y2={y + 22} stroke={a} strokeWidth="3.5" strokeLinecap="round" opacity="0.75"/>;
      })}
      {/* End caps */}
      <rect x="170" y="138" width="260" height="14" rx="7" fill={c} opacity="0.6"/>
      <rect x="170" y="368" width="260" height="14" rx="7" fill={c} opacity="0.6"/>
    </g>
  ),

  growth: (c, a) => (
    <g>
      {/* Ascending bar chart */}
      {[60, 100, 145, 195, 255].map((h, i) => (
        <rect key={i} x={140 + i * 68} y={410 - h} width={48} height={h} rx="6" fill={a} opacity={0.4 + i * 0.12}/>
      ))}
      {/* Trend line */}
      <polyline points="164,370 232,330 300,285 368,235 436,175" fill="none" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      {/* Arrow tip */}
      <polygon points="436,155 450,178 422,178" fill={c} opacity="0.8"/>
    </g>
  ),

  prevention: (c, a) => (
    <g>
      {/* Protective dome */}
      <path d="M150 320 A150 160 0 0 1 450 320" fill={a} opacity="0.15" stroke={a} strokeWidth="3"/>
      <path d="M150 320 L150 360 Q300 420 450 360 L450 320" fill={a} opacity="0.2"/>
      {/* Grid lines inside dome */}
      {[200, 260, 320, 380].map((x, i) => (
        <line key={i} x1={x} y1={200 + i * 15} x2={x} y2="360" stroke={a} strokeWidth="1" opacity="0.2"/>
      ))}
      {/* Shield glint */}
      <path d="M230 200 Q260 180 290 200" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.4"/>
      {/* Person inside — simplified silhouette */}
      <circle cx="300" cy="280" r="24" fill={c} opacity="0.7"/>
      <path d="M270 340 Q285 310 300 304 Q315 310 330 340" fill={c} opacity="0.7" strokeLinecap="round"/>
    </g>
  ),

  weight: (c, a) => (
    <g>
      {/* Gravity scale / fulcrum */}
      <polygon points="300,180 260,380 340,380" fill={a} opacity="0.3" stroke={a} strokeWidth="2"/>
      {/* Platform */}
      <rect x="190" y="375" width="220" height="20" rx="6" fill={a} opacity="0.6"/>
      {/* Weight disc on top */}
      <ellipse cx="300" cy="175" rx="70" ry="22" fill={a} opacity="0.85"/>
      <ellipse cx="300" cy="165" rx="70" ry="22" fill={c} opacity="0.7"/>
      <ellipse cx="300" cy="155" rx="50" ry="18" fill={a} opacity="0.9"/>
      {/* Downward arrows */}
      {[220, 300, 380].map((x, i) => (
        <g key={i}>
          <line x1={x} y1="430" x2={x} y2="460" stroke={a} strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
          <polygon points={`${x},462 ${x-6},452 ${x+6},452`} fill={a} opacity="0.4"/>
        </g>
      ))}
    </g>
  ),

  aging: (c, a) => (
    <g>
      {/* Hourglass */}
      <path d="M180 120 L420 120 L300 280 L180 120Z" fill={a} opacity="0.75"/>
      <path d="M180 400 L420 400 L300 280 L180 400Z" fill={c} opacity="0.5"/>
      <rect x="170" y="110" width="260" height="20" rx="6" fill={a} opacity="0.6"/>
      <rect x="170" y="390" width="260" height="20" rx="6" fill={a} opacity="0.6"/>
      {/* Sand dots falling */}
      {[[300,295],[294,315],[306,320],[299,338]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="white" opacity={0.5 - i * 0.1}/>
      ))}
    </g>
  ),

  microbiome: (c, a) => (
    <g>
      {/* Diverse dot cluster — bacterial colony feel */}
      {[
        [300,260,28],[220,220,18],[380,230,22],[240,310,16],[360,300,20],
        [170,260,12],[430,265,14],[300,180,16],[305,340,18],[190,320,10],
        [415,320,11],[260,170,9],[340,350,12],[160,200,8],[445,195,10],
      ].map(([cx,cy,r],i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={i % 3 === 0 ? a : c} opacity={0.5 + (i % 4) * 0.12}/>
      ))}
      {/* Connection lines between close nodes */}
      <line x1="300" y1="260" x2="220" y2="220" stroke={a} strokeWidth="1.5" opacity="0.2"/>
      <line x1="300" y1="260" x2="380" y2="230" stroke={a} strokeWidth="1.5" opacity="0.2"/>
      <line x1="300" y1="260" x2="240" y2="310" stroke={a} strokeWidth="1.5" opacity="0.2"/>
      <line x1="300" y1="260" x2="360" y2="300" stroke={a} strokeWidth="1.5" opacity="0.2"/>
    </g>
  ),

  nutrition: (c, a) => (
    <g>
      {/* Plate / circle with food sectors */}
      <circle cx="300" cy="270" r="150" fill="none" stroke={a} strokeWidth="3" opacity="0.4"/>
      {/* Pie sectors */}
      {[
        {start: -90, end: 30, fill: a, op: 0.7},
        {start: 30, end: 120, fill: c, op: 0.55},
        {start: 120, end: 210, fill: a, op: 0.4},
        {start: 210, end: 270, fill: c, op: 0.65},
      ].map(({start, end, fill, op}, i) => {
        const s = start * Math.PI / 180, e = end * Math.PI / 180;
        const x1 = 300 + Math.cos(s)*140, y1 = 270 + Math.sin(s)*140;
        const x2 = 300 + Math.cos(e)*140, y2 = 270 + Math.sin(e)*140;
        const large = end - start > 180 ? 1 : 0;
        return <path key={i} d={`M300,270 L${x1},${y1} A140,140 0 ${large} 1 ${x2},${y2} Z`} fill={fill} opacity={op}/>;
      })}
      <circle cx="300" cy="270" r="45" fill={a} opacity="0.9"/>
    </g>
  ),

  posture: (c, a) => (
    <g>
      {/* Spine column — vertebrae stack */}
      {Array.from({length: 7}, (_, i) => {
        const y = 145 + i * 40;
        const w = 50 - i * 2;
        return <rect key={i} x={300 - w/2} y={y} width={w} height={26} rx="5" fill={a} opacity={0.7 + i * 0.04}/>;
      })}
      {/* Disc spacers */}
      {Array.from({length: 6}, (_, i) => (
        <rect key={i} x="268" y={171 + i * 40} width="64" height="8" rx="4" fill={c} opacity="0.45"/>
      ))}
      {/* Alignment line */}
      <line x1="300" y1="125" x2="300" y2="435" stroke={a} strokeWidth="1.5" strokeDasharray="6 4" opacity="0.3"/>
    </g>
  ),

  recovery: (c, a) => (
    <g>
      {/* Broken then mending line */}
      <path d="M100 280 L230 280" stroke={c} strokeWidth="4" strokeLinecap="round" opacity="0.5"/>
      <path d="M370 260 L500 260" stroke={a} strokeWidth="4" strokeLinecap="round" opacity="0.9"/>
      {/* Repair arc */}
      <path d="M230 280 Q260 160 370 260" fill="none" stroke={a} strokeWidth="5" strokeLinecap="round"/>
      {/* Upward arrows on arc */}
      {[[280,218],[325,178]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="8" fill={a} opacity={0.6 + i * 0.2}/>
      ))}
      {/* Break point highlight */}
      <circle cx="300" cy="280" r="16" fill={c} opacity="0.3" stroke={a} strokeWidth="2"/>
    </g>
  ),

  focus2: (c, a) => (
    <g>
      {/* Target / bulls-eye rings */}
      {[120, 85, 52, 24].map((r, i) => (
        <circle key={i} cx="300" cy="260" r={r} fill={i === 3 ? a : "none"} fillOpacity="0.9"
          stroke={a} strokeWidth={i === 3 ? 0 : 2.5} opacity={0.3 + i * 0.2}/>
      ))}
      {/* Crosshair lines */}
      <line x1="300" y1="125" x2="300" y2="152" stroke={a} strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="300" y1="368" x2="300" y2="395" stroke={a} strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="165" y1="260" x2="192" y2="260" stroke={a} strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="408" y1="260" x2="435" y2="260" stroke={a} strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
    </g>
  ),
};

function themeFromKeywords(keywords: string): VectorTheme {
  const k = keywords.toLowerCase();
  // Sleep / rest
  if (/sleep|melatonin|insomnia|rest|night|bed|dream/.test(k)) return "sleep";
  // Brain / cognition
  if (/brain|cognitive|memory|neural|cortex|adenosine/.test(k)) return "brain";
  // Focus / concentration
  if (/focus|concentration|attention|distract|productivity/.test(k)) return "focus2";
  // Energy / fatigue
  if (/energy|fatigue|tired|alert|caffeine|atp|mitochondria/.test(k)) return "energy";
  // Stress / anxiety / cortisol
  if (/stress|anxiety|cortisol|overwhelm|overload/.test(k)) return "stress";
  // Inflammation
  if (/inflam|inflamm|chronic|pain|ache|sore/.test(k)) return "inflammation";
  // Heart / cardiovascular
  if (/heart|cardiovascular|blood|pulse|cardiac/.test(k)) return "heart";
  // Hormone / endocrine
  if (/hormone|estrogen|testosterone|thyroid|insulin|endocrine/.test(k)) return "hormone";
  // Dopamine / reward
  if (/dopamine|reward|motivation|serotonin|mood neurotransmit/.test(k)) return "dopamine";
  // Mood
  if (/mood|emotion|feeling|mental health|depress|happi/.test(k)) return "mood";
  // Cycle / circadian / rhythm
  if (/cycle|circadian|rhythm|routine|habit|pattern|loop/.test(k)) return "cycle";
  // Gut / digestion / microbiome
  if (/gut|digest|intestin|bowel|stomach|ibs|gastro/.test(k)) return "gut";
  // Microbiome specifically
  if (/microbiome|microbiota|probiotic|bacteria|flora/.test(k)) return "microbiome";
  // Immune / protection
  if (/immune|immunity|protect|defense|pathogen|virus|infect/.test(k)) return "immune";
  // Vitamin / supplement
  if (/vitamin|supplement|capsule|pill|deficien/.test(k)) return "vitamin";
  // Hydration / water
  if (/hydrat|water|fluid|drink|dehydrat/.test(k)) return "hydration";
  // Workout / exercise / strength
  if (/workout|exercise|strength|gym|lift|train|fitness/.test(k)) return "workout";
  // Recovery / healing
  if (/recover|heal|repair|restore|rehabilit/.test(k)) return "recovery";
  // Breathing / respiration
  if (/breath|respir|oxygen|lung|inhale|exhale|wim hof/.test(k)) return "breathing";
  // Sunlight / vitamin D
  if (/sunlight|sun|vitamin d|uv|daylight|outdoor/.test(k)) return "sunlight";
  // Cold / temperature
  if (/cold|ice|freeze|cryo|temperature|cool/.test(k)) return "cold";
  // Nutrition / food / diet
  if (/nutrition|food|diet|eat|macro|calorie|protein|carb|fat/.test(k)) return "nutrition";
  // Weight / metabolism
  if (/weight|metabol|obese|bmi|fat loss|lean/.test(k)) return "weight";
  // Aging / longevity
  if (/aging|ageing|longev|lifespan|anti-age|telomere/.test(k)) return "aging";
  // Posture / spine
  if (/posture|spine|back|neck|align|ergon/.test(k)) return "posture";
  // Tension / muscle
  if (/tension|tight|tense|knot|cramp|spasm/.test(k)) return "tension";
  // Growth / progress
  if (/growth|progress|improve|better|optim/.test(k)) return "growth";
  // Prevention
  if (/prevent|protect|shield|proactiv|prophyla/.test(k)) return "prevention";
  // Meditation / calm
  if (/meditat|mindful|calm|relax|peace|zen/.test(k)) return "meditation";
  // Nature / organic
  if (/nature|plant|organic|natural|herb|botanical/.test(k)) return "nature";
  // Time
  if (/time|hour|duration|minutes|schedule|chronotype/.test(k)) return "time";
  // Science / molecule
  if (/magnesium|mineral|molecule|compound|formula|chemical/.test(k)) return "science";
  // Balance / homeostasis
  if (/balance|equilibrium|homeostasis|ratio|proportion/.test(k)) return "balance";
  return "default";
}

type VectorMood = 'calm' | 'energetic' | 'scientific' | 'playful';

// Mood adjusts opacity and rendering intensity
function moodOpacity(mood?: VectorMood): number {
  switch (mood) {
    case 'calm':       return 0.75;
    case 'energetic':  return 1.0;
    case 'scientific': return 0.85;
    case 'playful':    return 0.9;
    default:           return 0.85;
  }
}

type Props = {
  keywords: string;
  label?: string;
  mood?: VectorMood;
  brandStyle?: BrandStyle;
};

export function VectorIllustration({ keywords, label, mood, brandStyle }: Props) {
  const theme = themeFromKeywords(keywords);
  const accent = brandStyle?.accent ?? "#1e7a8a";
  const body = brandStyle?.body ?? "#1a2535";
  const bg = brandStyle?.background ?? "#f0ece6";
  const opacity = moodOpacity(mood);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <svg
        viewBox="0 0 600 520"
        width="100%"
        style={{ maxHeight: 320, opacity }}
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
