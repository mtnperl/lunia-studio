export type IconCategory = "sleep" | "health" | "lifestyle" | "fitness" | "mind";

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
];

export function getIconsByCategory(category: IconCategory): CarouselIcon[] {
  return CAROUSEL_ICONS.filter((ic) => ic.category === category);
}

export function getIconById(id: string): CarouselIcon | undefined {
  return CAROUSEL_ICONS.find((ic) => ic.id === id);
}
