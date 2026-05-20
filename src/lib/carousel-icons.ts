export type IconCategory = "sleep" | "health" | "lifestyle" | "fitness" | "mind" | "daily";

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
  // ── Sleep extras (8) ───────────────────────────────────────────────────────
  {
    id: "sunrise",
    label: "Morning",
    category: "sleep",
    svg: '<path d="M12 2v2M4.22 10.22l1.42 1.42M1 18h2M21 18h2M18.36 11.64l1.42-1.42M23 22H1M8 6l-1-1M12 6a6 6 0 0 1 6 6"/><path d="M6 12a6 6 0 0 1 6-6"/>',
  },
  {
    id: "moon-stars",
    label: "Night Rest",
    category: "sleep",
    svg: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/><path d="M20 3v4M22 5h-4"/>',
  },
  {
    id: "sleep-mask",
    label: "Blackout",
    category: "sleep",
    svg: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M8 12a4 4 0 0 0 8 0"/>',
  },
  {
    id: "melatonin",
    label: "Melatonin",
    category: "sleep",
    svg: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
  },
  {
    id: "night-ritual",
    label: "Ritual",
    category: "sleep",
    svg: '<path d="M9 2h6l1 7H8L9 2z"/><path d="M8 9c0 5 3 8 4 10M16 9c0 5-3 8-4 10"/><line x1="6" y1="22" x2="18" y2="22"/>',
  },
  {
    id: "sleep-cycle",
    label: "Cycle",
    category: "sleep",
    svg: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  },
  {
    id: "lavender",
    label: "Calm",
    category: "sleep",
    svg: '<path d="M12 22V8"/><path d="M7 12c0-3 2-5 5-5s5 2 5 5"/><path d="M6 17c0-2 1-4 3-5"/><path d="M18 17c0-2-1-4-3-5"/><circle cx="12" cy="6" r="2"/>',
  },
  {
    id: "weighted",
    label: "Comfort",
    category: "sleep",
    svg: '<rect x="3" y="8" width="18" height="10" rx="2"/><path d="M5 8V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/><line x1="8" y1="14" x2="16" y2="14"/>',
  },
  // ── Health extras (8) ─────────────────────────────────────────────────────
  {
    id: "lungs",
    label: "Breath",
    category: "health",
    svg: '<path d="M6 12H4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2"/><path d="M18 12h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><path d="M12 3v9"/><path d="M6 12c0-5 2-9 6-9s6 4 6 9"/><path d="M6 12v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"/>',
  },
  {
    id: "gut",
    label: "Gut Health",
    category: "health",
    svg: '<path d="M12 2a5 5 0 0 1 5 5c0 3-2 5-2 8a5 5 0 0 1-10 0c0-3-2-5-2-8a5 5 0 0 1 5-5z"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>',
  },
  {
    id: "inflammation",
    label: "Inflammation",
    category: "health",
    svg: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  },
  {
    id: "immune",
    label: "Immunity",
    category: "health",
    svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
  },
  {
    id: "microbiome",
    label: "Microbiome",
    category: "health",
    svg: '<circle cx="12" cy="12" r="3"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/><path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01"/>',
  },
  {
    id: "hormone",
    label: "Hormones",
    category: "health",
    svg: '<path d="M6 3v12"/><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M15 6H6"/><path d="M18 18H6"/>',
  },
  {
    id: "nutrition",
    label: "Nutrition",
    category: "health",
    svg: '<path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h3v6"/><path d="M13 2a2 2 0 0 1 2 2v5h5a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-3v6"/>',
  },
  {
    id: "recovery",
    label: "Recovery",
    category: "health",
    svg: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  },
  // ── Lifestyle extras (8) ──────────────────────────────────────────────────
  {
    id: "journaling",
    label: "Journaling",
    category: "lifestyle",
    svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
  },
  {
    id: "garden",
    label: "Nature",
    category: "lifestyle",
    svg: '<path d="M12 22V12"/><path d="M12 12C12 7 8 3 3 3c0 5 4 9 9 9z"/><path d="M12 12c0-5 4-9 9-9-1 5-5 9-9 9z"/>',
  },
  {
    id: "bath",
    label: "Self-Care",
    category: "lifestyle",
    svg: '<path d="M9 6l-5 5"/><path d="M9 6a4 4 0 1 1 5 5L9 6z"/><path d="M4 11h16v2a8 8 0 0 1-16 0v-2z"/><line x1="6" y1="21" x2="8" y2="19"/><line x1="18" y1="21" x2="16" y2="19"/>',
  },
  {
    id: "sunset",
    label: "Unwind",
    category: "lifestyle",
    svg: '<path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/><polyline points="8 6 12 2 16 6"/>',
  },
  {
    id: "social",
    label: "Community",
    category: "lifestyle",
    svg: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  },
  {
    id: "cold-shower",
    label: "Cold Exposure",
    category: "lifestyle",
    svg: '<path d="M12 22V11"/><path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M8 22h8"/><path d="M7 16c-1.5 0-2-1-2-2s.5-2 2-2"/><path d="M17 16c1.5 0 2-1 2-2s-.5-2-2-2"/>',
  },
  {
    id: "balance",
    label: "Balance",
    category: "lifestyle",
    svg: '<line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  },
  {
    id: "creativity",
    label: "Creativity",
    category: "lifestyle",
    svg: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
  },
  // ── Fitness extras (8) ────────────────────────────────────────────────────
  {
    id: "stretch",
    label: "Mobility",
    category: "fitness",
    svg: '<path d="M16 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/><path d="M15 8l-3 9"/><path d="M12 17l3-3-3-3"/><path d="M10 22l2-5 5 2"/>',
  },
  {
    id: "plank",
    label: "Core",
    category: "fitness",
    svg: '<circle cx="17" cy="5" r="2"/><path d="M2 10l5-5 5 5 5-5"/><path d="M2 14h5v6"/><path d="M17 7v13"/>',
  },
  {
    id: "water-bottle",
    label: "Hydration",
    category: "fitness",
    svg: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
  },
  {
    id: "protein",
    label: "Protein",
    category: "fitness",
    svg: '<path d="M8 2h8l2 4H6L8 2z"/><path d="M6 6v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6"/><line x1="10" y1="11" x2="14" y2="11"/><line x1="12" y1="9" x2="12" y2="13"/>',
  },
  {
    id: "vo2max",
    label: "VO2 Max",
    category: "fitness",
    svg: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  },
  {
    id: "zone2",
    label: "Zone 2",
    category: "fitness",
    svg: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/><circle cx="12" cy="12" r="4" fill="none"/>',
  },
  {
    id: "flexibility",
    label: "Flexibility",
    category: "fitness",
    svg: '<path d="M18 11.5A6.5 6.5 0 0 0 6 9"/><path d="M6 12.5A6.5 6.5 0 0 0 18 15"/><path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>',
  },
  {
    id: "sauna",
    label: "Heat Therapy",
    category: "fitness",
    svg: '<path d="M4 14h16"/><path d="M4 10h16"/><path d="M4 18h16"/><path d="M2 6h20"/><path d="M2 22h20"/>',
  },
  // ── Mind (12) ─────────────────────────────────────────────────────────────
  {
    id: "focus",
    label: "Focus",
    category: "mind",
    svg: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  },
  {
    id: "mindfulness",
    label: "Mindfulness",
    category: "mind",
    svg: '<path d="M12 22c4.97 0 9-4.03 9-9s-4.03-9-9-9S3 8.03 3 13s4.03 9 9 9z"/><path d="M12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
  },
  {
    id: "gratitude",
    label: "Gratitude",
    category: "mind",
    svg: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  },
  {
    id: "meditation",
    label: "Meditation",
    category: "mind",
    svg: '<circle cx="12" cy="4" r="2"/><path d="M9 20h6M12 10v10"/><path d="M6 12a6 6 0 0 1 6-4 6 6 0 0 1 6 4"/>',
  },
  {
    id: "brain-boost",
    label: "Brain Boost",
    category: "mind",
    svg: '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/>',
  },
  {
    id: "stress",
    label: "Stress",
    category: "mind",
    svg: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  },
  {
    id: "clarity",
    label: "Clarity",
    category: "mind",
    svg: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  },
  {
    id: "resilience",
    label: "Resilience",
    category: "mind",
    svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  },
  {
    id: "awareness",
    label: "Awareness",
    category: "mind",
    svg: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  },
  {
    id: "flow",
    label: "Flow State",
    category: "mind",
    svg: '<path d="M5 12c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 5-5 5"/><path d="M19 12c0 3.9-3.1 7-7 7"/><path d="M12 3c3.9 0 7 3.1 7 7"/>',
  },
  {
    id: "intention",
    label: "Intention",
    category: "mind",
    svg: '<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>',
  },
  {
    id: "growth",
    label: "Growth",
    category: "mind",
    svg: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  },

  // ── Sleep extras 2 (8) ─────────────────────────────────────────────────────
  {
    id: "pillow-stack",
    label: "Pillows",
    category: "sleep",
    svg: '<rect x="3" y="6" width="18" height="6" rx="3"/><rect x="3" y="13" width="18" height="6" rx="3"/>',
  },
  {
    id: "lamp-bedside",
    label: "Bedside Lamp",
    category: "sleep",
    svg: '<path d="M8 4h8l-2 6h-4z"/><path d="M12 10v8"/><path d="M9 22h6"/>',
  },
  {
    id: "tea-warm",
    label: "Warm Tea",
    category: "sleep",
    svg: '<path d="M5 11h12v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M17 13h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2"/><path d="M9 4v3M12 3v4M15 4v3"/>',
  },
  {
    id: "candle-flame",
    label: "Candle Flame",
    category: "sleep",
    svg: '<path d="M12 3c-1 2.5 2 4 2 6a2 2 0 0 1-4 0c0-2 1.5-3 2-6z"/><rect x="9" y="11" width="6" height="9" rx="1"/><path d="M8 20h8"/>',
  },
  {
    id: "owl",
    label: "Night Owl",
    category: "sleep",
    svg: '<circle cx="12" cy="13" r="8"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/><path d="M12 15v2"/><path d="M6 6l2 3M18 6l-2 3"/>',
  },
  {
    id: "night-window",
    label: "Night Window",
    category: "sleep",
    svg: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 12h16M12 3v18"/><circle cx="8" cy="7" r="1"/>',
  },
  {
    id: "breathing-curve",
    label: "Slow Breath",
    category: "sleep",
    svg: '<path d="M2 12c3-6 6-6 10 0s7 6 10 0"/>',
  },
  {
    id: "do-not-disturb",
    label: "Quiet Hours",
    category: "sleep",
    svg: '<circle cx="12" cy="12" r="9"/><path d="M7 12h10"/>',
  },

  // ── Health extras 2 (8) ────────────────────────────────────────────────────
  {
    id: "vitamin",
    label: "Vitamin",
    category: "health",
    svg: '<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M12 8v8"/>',
  },
  {
    id: "supplement-bottle",
    label: "Supplement",
    category: "health",
    svg: '<rect x="7" y="3" width="10" height="3" rx="0.5"/><rect x="5" y="6" width="14" height="15" rx="2"/><path d="M9 13h6M12 10v6"/>',
  },
  {
    id: "pill",
    label: "Pill",
    category: "health",
    svg: '<rect x="3" y="9" width="18" height="6" rx="3"/><path d="M12 9v6"/>',
  },
  {
    id: "bone",
    label: "Bone Health",
    category: "health",
    svg: '<path d="M4 8a2 2 0 0 1 2-3 2 2 0 0 1 3 1 2 2 0 0 1 1 3l9 9a2 2 0 0 1 1 3 2 2 0 0 1-3 1 2 2 0 0 1-3-1l-9-9a2 2 0 0 1-3-1 2 2 0 0 1 1-3 2 2 0 0 1 1-1z"/>',
  },
  {
    id: "first-aid",
    label: "First Aid",
    category: "health",
    svg: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M12 10v6M9 13h6"/><path d="M9 6V4h6v2"/>',
  },
  {
    id: "stethoscope",
    label: "Checkup",
    category: "health",
    svg: '<path d="M6 3v8a5 5 0 0 0 10 0V3"/><path d="M6 3h2M14 3h2"/><circle cx="19" cy="16" r="2"/><path d="M11 16v-2"/><path d="M11 14a4 4 0 0 1 8 0v2"/>',
  },
  {
    id: "bandage",
    label: "Recovery",
    category: "health",
    svg: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-25 12 12)"/><path d="M9 10l1 1M10 13l1 1M13 9l1 1M14 12l1 1"/>',
  },
  {
    id: "mortar",
    label: "Apothecary",
    category: "health",
    svg: '<path d="M4 9h16l-2 8a3 3 0 0 1-3 2H9a3 3 0 0 1-3-2z"/><path d="M14 3l-2 6"/>',
  },

  // ── Lifestyle extras 2 (10) ────────────────────────────────────────────────
  {
    id: "home",
    label: "Home",
    category: "lifestyle",
    svg: '<path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  },
  {
    id: "plant-pot",
    label: "Houseplant",
    category: "lifestyle",
    svg: '<path d="M5 14h14l-2 8H7z"/><path d="M12 14V6"/><path d="M12 10c-3 0-4-3-2-5 2 1 3 3 2 5z"/><path d="M12 8c2-1 5 0 5 3-2 0-4-1-5-3z"/>',
  },
  {
    id: "flower",
    label: "Flower",
    category: "lifestyle",
    svg: '<circle cx="12" cy="12" r="2.5"/><path d="M12 5a3 3 0 1 1 0-1z"/><path d="M12 22v-7"/><path d="M19 12a3 3 0 1 1-1 0z"/><path d="M5 12a3 3 0 1 1 1 0z"/><path d="M17 7a3 3 0 1 1-1 1z"/><path d="M7 7a3 3 0 1 1 1 1z"/>',
  },
  {
    id: "music",
    label: "Music",
    category: "lifestyle",
    svg: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  },
  {
    id: "book-open",
    label: "Reading",
    category: "lifestyle",
    svg: '<path d="M2 4h7a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v14a3 3 0 0 1 3-3h7z"/>',
  },
  {
    id: "journal-pen",
    label: "Journal",
    category: "lifestyle",
    svg: '<rect x="4" y="3" width="14" height="18" rx="1"/><path d="M8 7h6M8 11h6M8 15h4"/><path d="M19 14l3 3-2 3-3-1z"/>',
  },
  {
    id: "thermos",
    label: "Thermos",
    category: "lifestyle",
    svg: '<rect x="8" y="2" width="8" height="3" rx="0.5"/><rect x="7" y="5" width="10" height="17" rx="2"/><path d="M7 10h10"/>',
  },
  {
    id: "yoga-mat",
    label: "Yoga Mat",
    category: "lifestyle",
    svg: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M3 15h18"/>',
  },
  {
    id: "beach",
    label: "Beach",
    category: "lifestyle",
    svg: '<path d="M12 3v6"/><path d="M8 9c1-3 7-3 8 0"/><path d="M3 18c2 1 4 1 6 0s4-1 6 0 4 1 6 0"/><path d="M3 21c2 1 4 1 6 0s4-1 6 0 4 1 6 0"/>',
  },
  {
    id: "incense",
    label: "Calm",
    category: "lifestyle",
    svg: '<path d="M12 3v3M12 8v3M12 13v3"/><rect x="6" y="17" width="12" height="3" rx="0.5"/>',
  },

  // ── Fitness extras 2 (8) ───────────────────────────────────────────────────
  {
    id: "barbell",
    label: "Barbell",
    category: "fitness",
    svg: '<path d="M3 9v6M6 7v10M21 9v6M18 7v10M6 12h12"/>',
  },
  {
    id: "kettlebell",
    label: "Kettlebell",
    category: "fitness",
    svg: '<path d="M9 4h6v2a2 2 0 0 0 2 2v0a5 5 0 0 1 1 4 6 6 0 0 1-12 0 5 5 0 0 1 1-4v0a2 2 0 0 0 2-2z"/>',
  },
  {
    id: "pushup",
    label: "Push-up",
    category: "fitness",
    svg: '<circle cx="18" cy="6" r="2"/><path d="M3 18h13l-2-4-4 1-3-2z"/><path d="M16 14l2-6"/>',
  },
  {
    id: "jump-rope",
    label: "Jump Rope",
    category: "fitness",
    svg: '<path d="M5 6c0-1 1-2 2-2s2 1 2 2c0 6-4 8-4 14"/><path d="M19 6c0-1-1-2-2-2s-2 1-2 2c0 6 4 8 4 14"/><path d="M9 6h6"/>',
  },
  {
    id: "treadmill",
    label: "Treadmill",
    category: "fitness",
    svg: '<rect x="2" y="14" width="20" height="5" rx="1"/><path d="M2 16h20"/><path d="M5 14V9h5l3-5h4"/>',
  },
  {
    id: "sneaker",
    label: "Sneakers",
    category: "fitness",
    svg: '<path d="M3 17v-3l4-2 2-4h5l1 4 6 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M7 12l3 3M12 8l1 7"/>',
  },
  {
    id: "stretch-floor",
    label: "Stretch",
    category: "fitness",
    svg: '<circle cx="6" cy="6" r="2"/><path d="M6 8l3 5 6-1 4 5"/><path d="M9 13l-3 5"/>',
  },
  {
    id: "yoga-block",
    label: "Yoga Block",
    category: "fitness",
    svg: '<rect x="4" y="8" width="16" height="8" rx="1.5"/><path d="M4 12h16"/>',
  },

  // ── Mind extras 2 (6) ──────────────────────────────────────────────────────
  {
    id: "thought-bubble",
    label: "Thoughts",
    category: "mind",
    svg: '<path d="M5 13a5 5 0 0 1 4-7 6 6 0 0 1 11 4 4 4 0 0 1-2 7H9a4 4 0 0 1-4-4z"/><circle cx="6" cy="19" r="1.5"/><circle cx="3" cy="22" r="0.8"/>',
  },
  {
    id: "balance-scale",
    label: "Balance",
    category: "mind",
    svg: '<path d="M12 4v16"/><path d="M6 20h12"/><path d="M3 9l3-5 3 5"/><path d="M15 9l3-5 3 5"/><path d="M3 9a3 3 0 0 0 6 0"/><path d="M15 9a3 3 0 0 0 6 0"/>',
  },
  {
    id: "smile",
    label: "Joy",
    category: "mind",
    svg: '<circle cx="12" cy="12" r="9"/><path d="M8 14c1 2 7 2 8 0"/><circle cx="9" cy="10" r="0.8"/><circle cx="15" cy="10" r="0.8"/>',
  },
  {
    id: "lotus",
    label: "Calm Mind",
    category: "mind",
    svg: '<path d="M12 20c-5 0-9-3-9-7 3 0 5 1 6 3 0-3 1-6 3-8 2 2 3 5 3 8 1-2 3-3 6-3 0 4-4 7-9 7z"/>',
  },
  {
    id: "puzzle",
    label: "Insight",
    category: "mind",
    svg: '<path d="M10 3h4v3a2 2 0 0 0 4 0V3h3v4h-3a2 2 0 0 0 0 4h3v4h-3a2 2 0 0 1-2 2v3h-4v-3a2 2 0 0 0-4 0v3H4v-4h3a2 2 0 0 0 0-4H4V8h3a2 2 0 0 1 2-2V3z"/>',
  },
  {
    id: "spark",
    label: "Spark",
    category: "mind",
    svg: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4"/>',
  },

  // ── Daily (NEW category, 18) ───────────────────────────────────────────────
  {
    id: "mug",
    label: "Mug",
    category: "daily",
    svg: '<path d="M4 7h13v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M17 10h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2"/>',
  },
  {
    id: "kettle",
    label: "Kettle",
    category: "daily",
    svg: '<path d="M5 11h14v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"/><path d="M9 11V8h6v3"/><path d="M15 8h3v-2"/><path d="M9 8c-1-1-2-2-2-3"/>',
  },
  {
    id: "plate",
    label: "Plate",
    category: "daily",
    svg: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>',
  },
  {
    id: "bowl",
    label: "Bowl",
    category: "daily",
    svg: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M5 11c1-2 5-4 7-4s6 2 7 4"/>',
  },
  {
    id: "fork-knife",
    label: "Meal",
    category: "daily",
    svg: '<path d="M7 3v8a2 2 0 0 0 2 2v8"/><path d="M11 3v8a2 2 0 0 1-2 2"/><path d="M16 3c2 2 2 6 0 8v10"/>',
  },
  {
    id: "spoon",
    label: "Spoon",
    category: "daily",
    svg: '<ellipse cx="12" cy="6" rx="4" ry="5"/><path d="M12 11v10"/>',
  },
  {
    id: "egg",
    label: "Egg",
    category: "daily",
    svg: '<path d="M12 3c-4 0-7 5-7 11a7 7 0 0 0 14 0c0-6-3-11-7-11z"/>',
  },
  {
    id: "apple",
    label: "Apple",
    category: "daily",
    svg: '<path d="M12 7c-2-3-7-2-7 3 0 6 4 11 7 11s7-5 7-11c0-5-5-6-7-3z"/><path d="M12 7V4"/><path d="M12 4l3-1"/>',
  },
  {
    id: "berries",
    label: "Berries",
    category: "daily",
    svg: '<circle cx="9" cy="14" r="4"/><circle cx="15" cy="14" r="4"/><path d="M11 10c0-2 1-4 1-6"/><path d="M12 4l2-1M12 4l-2-1"/>',
  },
  {
    id: "toast",
    label: "Toast",
    category: "daily",
    svg: '<path d="M4 9c0-3 4-4 8-4s8 1 8 4v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/><path d="M7 12h10M7 16h7"/>',
  },
  {
    id: "calendar",
    label: "Calendar",
    category: "daily",
    svg: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/>',
  },
  {
    id: "alarm-clock",
    label: "Alarm Clock",
    category: "daily",
    svg: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M5 4 2 7M22 7l-3-3M6 21l-2 2M18 21l2 2"/>',
  },
  {
    id: "key",
    label: "Key",
    category: "daily",
    svg: '<circle cx="7" cy="17" r="3"/><path d="M9 15l11-11M16 8l3 3M14 10l3 3"/>',
  },
  {
    id: "phone-off",
    label: "Phone Off",
    category: "daily",
    svg: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M10 18h4"/><path d="M3 3l18 18"/>',
  },
  {
    id: "laptop",
    label: "Laptop",
    category: "daily",
    svg: '<rect x="4" y="4" width="16" height="11" rx="1"/><path d="M2 18h20l-1 2H3z"/>',
  },
  {
    id: "robe",
    label: "Robe",
    category: "daily",
    svg: '<path d="M8 3l-3 5 3 1v12h8V9l3-1-3-5"/><path d="M10 3l2 6 2-6"/>',
  },
  {
    id: "slippers",
    label: "Slippers",
    category: "daily",
    svg: '<path d="M3 16c0-3 4-4 6-4s5 1 5 4-3 4-5 4-6-1-6-4z"/><path d="M14 16c0-3 4-4 5-4s2 1 2 4-2 4-3 4-4-1-4-4z"/>',
  },
  {
    id: "tap-water",
    label: "Hydration Glass",
    category: "daily",
    svg: '<path d="M7 4h10l-1 17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z"/><path d="M8 10c1 1 3 1 4 0s3-1 4 0"/>',
  },
];

export function getIconsByCategory(category: IconCategory): CarouselIcon[] {
  return CAROUSEL_ICONS.filter((ic) => ic.category === category);
}

export function getIconById(id: string): CarouselIcon | undefined {
  return CAROUSEL_ICONS.find((ic) => ic.id === id);
}
