export type IconCategory = "sleep" | "health" | "lifestyle" | "fitness";

export type CarouselIcon = {
  id: string;
  label: string;
  category: IconCategory;
  svg: string; // Inner SVG elements (no <svg> wrapper)
};

export const CAROUSEL_ICONS: CarouselIcon[] = [
  // ── Sleep (10) ─────────────────────────────────────────────────────────────
  {
    id: "moon",
    label: "Deep Sleep",
    category: "sleep",
    svg: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  },
  {
    id: "bed",
    label: "Rest",
    category: "sleep",
    svg: '<path d="M2 20h20M2 14h20M2 7v13M22 7v13"/><path d="M2 7a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5M2 14V7"/>',
  },
  {
    id: "stars",
    label: "Night Sky",
    category: "sleep",
    svg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  },
  {
    id: "zzz",
    label: "Sleep",
    category: "sleep",
    svg: '<path d="M4 7h8L4 17h8"/><path d="M12 7h8l-8 10h8"/>',
  },
  {
    id: "eye-closed",
    label: "Eyes Closed",
    category: "sleep",
    svg: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="m1 1 22 22"/>',
  },
  {
    id: "alarm",
    label: "Sleep Alarm",
    category: "sleep",
    svg: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6M22 6l-3-3"/>',
  },
  {
    id: "pillow",
    label: "Comfort",
    category: "sleep",
    svg: '<rect x="3" y="8" width="18" height="8" rx="4"/>',
  },
  {
    id: "cloud",
    label: "Dream",
    category: "sleep",
    svg: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  },
  {
    id: "sleep-waves",
    label: "Sleep Waves",
    category: "sleep",
    svg: '<path d="M2 8c.6.5 1.2 1 2 1s1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1 1.2 1 2 1 1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1"/><path d="M2 13c.6.5 1.2 1 2 1s1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1 1.2 1 2 1 1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1"/><path d="M2 18c.6.5 1.2 1 2 1s1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1 1.2 1 2 1 1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1"/>',
  },
  {
    id: "hourglass",
    label: "Time",
    category: "sleep",
    svg: '<path d="M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.586-1.414L12 12l-4.414 4.416A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .586 1.414L12 12l4.414-4.416A2 2 0 0 0 17 6.17V2"/>',
  },

  // ── Health (12) ─────────────────────────────────────────────────────────────
  {
    id: "heart",
    label: "Heart Health",
    category: "health",
    svg: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  },
  {
    id: "brain",
    label: "Brain Health",
    category: "health",
    svg: '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.14z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.14z"/>',
  },
  {
    id: "shield",
    label: "Immunity",
    category: "health",
    svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  },
  {
    id: "leaf",
    label: "Natural",
    category: "health",
    svg: '<path d="M17 8C8 10 5.9 16.17 3.82 19.5A3 3 0 0 0 6 22c2.5 0 5.73-3.4 7-5 3.5-4 3.5-5 5-7 0 0-1 3-1 6a16 16 0 0 0 5-8c0-5.5-5-9-5-9z"/>',
  },
  {
    id: "drop",
    label: "Hydration",
    category: "health",
    svg: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
  },
  {
    id: "flask",
    label: "Science",
    category: "health",
    svg: '<path d="M9 2v7l-4 9h14l-4-9V2"/><line x1="9" y1="2" x2="15" y2="2"/>',
  },
  {
    id: "atom",
    label: "Formula",
    category: "health",
    svg: '<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9C11.2 3.8 5.87 1.77 3.84 3.8c-2.03 2.04-.01 7.37 4.5 11.9 4.51 4.51 9.84 6.54 11.87 4.5z"/><path d="M15.7 15.7c4.51-4.53 6.54-9.86 4.5-11.9-2.03-2.03-7.36-.01-11.87 4.5-4.51 4.51-6.54 9.84-4.5 11.87 2.04 2.04 7.37.02 11.87-4.47z"/>',
  },
  {
    id: "capsule",
    label: "Supplement",
    category: "health",
    svg: '<path d="M10.5 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7.5"/><path d="M2 10h20"/><circle cx="17" cy="17" r="5"/><path d="M17 14v6M14 17h6"/>',
  },
  {
    id: "pulse",
    label: "Vitality",
    category: "health",
    svg: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  },
  {
    id: "eye",
    label: "Focus",
    category: "health",
    svg: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  },
  {
    id: "thermometer",
    label: "Wellness",
    category: "health",
    svg: '<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>',
  },
  {
    id: "dna",
    label: "Genetics",
    category: "health",
    svg: '<path d="M2 15c6.667-6 13.333 0 20-6M2 9c6.667-6 13.333 0 20-6"/><path d="M2 9v6M22 3v6"/><path d="M7 4.5v2M17 13.5v2M7 14v2M17 4v2"/>',
  },

  // ── Lifestyle (14) ────────────────────────────────────────────────────────
  {
    id: "sun",
    label: "Morning",
    category: "lifestyle",
    svg: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  },
  {
    id: "coffee",
    label: "Morning Ritual",
    category: "lifestyle",
    svg: '<path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>',
  },
  {
    id: "headphones",
    label: "Relaxation",
    category: "lifestyle",
    svg: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
  },
  {
    id: "book",
    label: "Wind Down",
    category: "lifestyle",
    svg: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  },
  {
    id: "candle",
    label: "Evening",
    category: "lifestyle",
    svg: '<line x1="12" y1="2" x2="12" y2="8"/><path d="M9 8h6a0 0 0 0 1 0 0v6a3 3 0 0 1-6 0V8a0 0 0 0 1 0 0z"/><rect x="9" y="8" width="6" height="8" rx="2"/><path d="M10.5 6.5c0-1 1.5-3 1.5-3s1.5 2 1.5 3"/>',
  },
  {
    id: "tree",
    label: "Nature",
    category: "lifestyle",
    svg: '<path d="M17 22V12M7 22v-7"/><path d="M12 22V2M2 17h6L5 12h14l-3 5h6"/>',
  },
  {
    id: "mountain",
    label: "Outdoors",
    category: "lifestyle",
    svg: '<polygon points="3 20 10 4 17 12 21 8 22 20 3 20"/>',
  },
  {
    id: "wave",
    label: "Rhythm",
    category: "lifestyle",
    svg: '<path d="M2 6c.6.5 1.2 1 2 1s1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1 1.2 1 2 1 1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1"/><path d="M2 12c.6.5 1.2 1 2 1s1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1 1.2 1 2 1 1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1"/><path d="M2 18c.6.5 1.2 1 2 1s1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1 1.2 1 2 1 1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1"/>',
  },
  {
    id: "fire",
    label: "Energy",
    category: "lifestyle",
    svg: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c2 0 3-1 3-3-1-1.5-1-2.5-1-4 1 1 2.5 2.5 2.5 5a4.5 4.5 0 0 1-9 0c0-5.5 3-8 5-10 0 0-1 4.5 1 7.5"/><path d="M12 11c0 2-1 3-1 3"/>',
  },
  {
    id: "snowflake",
    label: "Cool Down",
    category: "lifestyle",
    svg: '<line x1="12" y1="2" x2="12" y2="22"/><path d="m17 7-5 5-5-5"/><path d="m17 17-5-5-5 5"/><line x1="2" y1="12" x2="22" y2="12"/><path d="m7 7 5 5 5-5"/><path d="m7 17 5-5 5 5"/>',
  },
  {
    id: "infinity",
    label: "Balance",
    category: "lifestyle",
    svg: '<path d="M12 12c-2-2.5-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.5 6-4z"/><path d="M12 12c2 2.5 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.5-6 4z"/>',
  },
  {
    id: "compass",
    label: "Direction",
    category: "lifestyle",
    svg: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  },
  {
    id: "feather",
    label: "Light",
    category: "lifestyle",
    svg: '<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>',
  },
  {
    id: "star",
    label: "Quality",
    category: "lifestyle",
    svg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  },

  // ── Fitness (14) ─────────────────────────────────────────────────────────
  {
    id: "dumbbell",
    label: "Strength",
    category: "fitness",
    svg: '<path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M4 8.5v7M20 8.5v7"/><path d="M2 9v6M22 9v6M6 5.5v3M6 15.5v3M18 5.5v3M18 15.5v3"/>',
  },
  {
    id: "bicycle",
    label: "Cardio",
    category: "fitness",
    svg: '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
  },
  {
    id: "lightning",
    label: "Power",
    category: "fitness",
    svg: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  },
  {
    id: "target",
    label: "Goal",
    category: "fitness",
    svg: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  },
  {
    id: "trophy",
    label: "Achievement",
    category: "fitness",
    svg: '<path d="M8 2h8v8a4 4 0 0 1-8 0V2z"/><path d="M4 2h4M12 2h4M4 2v4a4 4 0 0 0 4 4h0M20 2v4a4 4 0 0 1-4 4h0M12 14v4M8 22h8M9 18h6"/>',
  },
  {
    id: "heartbeat",
    label: "Vitals",
    category: "fitness",
    svg: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  },
  {
    id: "stopwatch",
    label: "Performance",
    category: "fitness",
    svg: '<circle cx="12" cy="14" r="8"/><path d="M12 6V2M8 2h8M12 10v4l2 2"/>',
  },
  {
    id: "yoga",
    label: "Mindfulness",
    category: "fitness",
    svg: '<circle cx="12" cy="5" r="2"/><path d="M6 20c0-4 2.5-7 6-7s6 3 6 7"/><path d="M6 11h12"/><path d="M8 14l4-3 4 3"/>',
  },
  {
    id: "swim",
    label: "Recovery",
    category: "fitness",
    svg: '<path d="M2 6c.6.5 1.2 1 2 1s1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1 1.2 1 2 1 1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1"/><circle cx="15" cy="13" r="2"/><path d="M2 13c.6.5 1.2 1 2 1s1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1 1.2 1 2 1 1.4-.5 2-1 1.2-1 2-1 1.4.5 2 1"/><path d="M15 11l-3-2-3 2"/>',
  },
  {
    id: "running",
    label: "Endurance",
    category: "fitness",
    svg: '<circle cx="16" cy="4" r="2"/><path d="M14 13l-2 5M20 12l-6 1-3-4 2-3 3 2M4 12l4 4 2 5"/>',
  },
  {
    id: "medal",
    label: "Excellence",
    category: "fitness",
    svg: '<circle cx="12" cy="15" r="7"/><path d="M8.56 2.9A7 7 0 0 1 12 2a7 7 0 0 1 3.44.9L17 8H7L8.56 2.9z"/>',
  },
  {
    id: "barbell",
    label: "Training",
    category: "fitness",
    svg: '<line x1="2" y1="12" x2="22" y2="12"/><line x1="5" y1="8" x2="5" y2="16"/><line x1="19" y1="8" x2="19" y2="16"/><line x1="2" y1="10" x2="2" y2="14"/><line x1="22" y1="10" x2="22" y2="14"/>',
  },
  {
    id: "energy",
    label: "Boost",
    category: "fitness",
    svg: '<circle cx="12" cy="12" r="10"/><path d="m13 2-3 7h7l-9 13 3-7H4l9-13z"/>',
  },
  {
    id: "steps",
    label: "Progress",
    category: "fitness",
    svg: '<polyline points="3 18 8 13 13 17 18 12 22 15"/><line x1="3" y1="22" x2="22" y2="22"/>',
  },
];

export function getIconsByCategory(category: IconCategory): CarouselIcon[] {
  return CAROUSEL_ICONS.filter((ic) => ic.category === category);
}

export function getIconById(id: string): CarouselIcon | undefined {
  return CAROUSEL_ICONS.find((ic) => ic.id === id);
}
