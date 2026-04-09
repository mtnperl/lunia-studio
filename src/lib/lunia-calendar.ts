export type LuniaCalendarEvent = {
  date: string;          // "Apr 1"
  month: string;         // "April"
  monthNum: number;      // 4
  day: number;           // 1
  event: string;         // event name
  subject: string;       // email subject line
  preheader: string;
  type: string;          // "Sale / Promo" | "Health Awareness" | etc
  suggestedTopic: string; // short prompt-ready topic string
};

export const LUNIA_CALENDAR_2026: LuniaCalendarEvent[] = [
  // ── April ──────────────────────────────────────────────────────────────────
  {
    date: "Apr 1", month: "April", monthNum: 4, day: 1,
    type: "Content Anchor",
    event: "April Fools — myth-bust",
    subject: "The sleep myth we hear most — and why it's wrong",
    preheader: "No tricks. Just the truth about what actually helps you sleep.",
    suggestedTopic: "Busting the biggest sleep myth with science",
  },
  {
    date: "Apr 7", month: "April", monthNum: 4, day: 7,
    type: "Health Awareness",
    event: "World Health Day",
    subject: "Sleep is the foundation. Not a bonus.",
    preheader: "On World Health Day, a reminder that rest is where health begins.",
    suggestedTopic: "Sleep as the foundation of every health goal",
  },
  {
    date: "Apr 15", month: "April", monthNum: 4, day: 15,
    type: "Paid Ads Spike",
    event: "Tax Day (US) — stress spike",
    subject: "Tax season is wrecking your sleep. Here's why.",
    preheader: "Cortisol spikes, deadline anxiety, and the one thing that helps.",
    suggestedTopic: "Managing cortisol and sleep during tax deadline stress",
  },
  {
    date: "Apr 22", month: "April", monthNum: 4, day: 22,
    type: "Cultural / Holiday",
    event: "Earth Day",
    subject: "Clean sleep starts with a clean formula",
    preheader: "USA-made. Vegan. No fillers. This is what we chose — and why.",
    suggestedTopic: "Clean, vegan sleep supplements made in the USA",
  },
  {
    date: "Apr 28", month: "April", monthNum: 4, day: 28,
    type: "Health Awareness",
    event: "World Sleep Disorders Awareness Day",
    subject: "Most people don't know they have a sleep disorder",
    preheader: "The signs are subtle. The fix is simpler than you'd think.",
    suggestedTopic: "Recognising subtle signs of sleep disorders",
  },

  // ── May ────────────────────────────────────────────────────────────────────
  {
    date: "May 1", month: "May", monthNum: 5, day: 1,
    type: "Email Trigger",
    event: "Better Sleep Month — launch email",
    subject: "It's Better Sleep Month. Here's what we know.",
    preheader: "One month. A full picture of what it actually takes to sleep better.",
    suggestedTopic: "Better Sleep Month — one habit that changes everything",
  },
  {
    date: "May 5", month: "May", monthNum: 5, day: 5,
    type: "Content Anchor",
    event: "Cinco de Mayo — alcohol + sleep",
    subject: "What one drink actually does to your sleep",
    preheader: "The science behind alcohol and REM is not what most people expect.",
    suggestedTopic: "How alcohol disrupts REM sleep cycles",
  },
  {
    date: "May 12", month: "May", monthNum: 5, day: 12,
    type: "Sale / Promo",
    event: "Mother's Day",
    subject: "The best gift for someone who never sleeps enough",
    preheader: "Give the one thing she won't buy herself. Free shipping this weekend.",
    suggestedTopic: "Mother's Day sleep gift — free shipping this weekend",
  },
  {
    date: "May 26", month: "May", monthNum: 5, day: 26,
    type: "Sale / Promo",
    event: "Memorial Day Weekend",
    subject: "This weekend only — sleep better for less",
    preheader: "3-day sale. No code needed. Ships Monday.",
    suggestedTopic: "Memorial Day 3-day sale — no code needed",
  },

  // ── June ───────────────────────────────────────────────────────────────────
  {
    date: "Jun 1", month: "June", monthNum: 6, day: 1,
    type: "Cultural / Holiday",
    event: "Pride Month begins",
    subject: "Better sleep is for everyone",
    preheader: "This month and every month — rest is a right, not a reward.",
    suggestedTopic: "Rest is a right — sleep for every body",
  },
  {
    date: "Jun 15", month: "June", monthNum: 6, day: 15,
    type: "Sale / Promo",
    event: "Father's Day",
    subject: "He won't ask for help sleeping. Give it to him anyway.",
    preheader: "The sleep stack for the person who pushes through. Gift guide inside.",
    suggestedTopic: "Father's Day sleep gift for the person who never stops",
  },
  {
    date: "Jun 21", month: "June", monthNum: 6, day: 21,
    type: "Content Anchor",
    event: "Summer Solstice — longest day",
    subject: "The longest day of the year just messed with your sleep",
    preheader: "Light exposure, melatonin timing, and what to do tonight.",
    suggestedTopic: "Summer solstice light exposure and melatonin timing",
  },
  {
    date: "Jun 27", month: "June", monthNum: 6, day: 27,
    type: "Health Awareness",
    event: "National PTSD Awareness Day",
    subject: "Sleep and stress: what the research actually says",
    preheader: "An honest look at the connection — and how to support your nervous system.",
    suggestedTopic: "Supporting nervous system recovery through better sleep",
  },

  // ── July ───────────────────────────────────────────────────────────────────
  {
    date: "Jul 4", month: "July", monthNum: 7, day: 4,
    type: "Content Anchor",
    event: "Independence Day — late nights, fireworks",
    subject: "How to reset your sleep after a late night",
    preheader: "The exact protocol for getting back on track tomorrow morning.",
    suggestedTopic: "Resetting your sleep after a late night out",
  },
  {
    date: "Jul 14", month: "July", monthNum: 7, day: 14,
    type: "Email Trigger",
    event: "Mid-year check-in",
    subject: "6 months of better sleep — where are you?",
    preheader: "Halfway through the year. A moment to check in on the habit that changes everything.",
    suggestedTopic: "Mid-year sleep habit check-in and reset protocol",
  },
  {
    date: "Jul 28", month: "July", monthNum: 7, day: 28,
    type: "Health Awareness",
    event: "World Hepatitis Day — inflammation angle",
    subject: "Inflammation is quiet. And it's ruining your sleep.",
    preheader: "Low-grade inflammation disrupts your deepest sleep stages. Here's what to know.",
    suggestedTopic: "Low-grade inflammation and disrupted deep sleep stages",
  },

  // ── August ─────────────────────────────────────────────────────────────────
  {
    date: "Aug 8", month: "August", monthNum: 8, day: 8,
    type: "Content Anchor",
    event: "International Cat Day — playful content",
    subject: "The one thing cats get right about sleep",
    preheader: "They don't apologise for resting. Neither should you.",
    suggestedTopic: "Permission to prioritise rest without guilt",
  },
  {
    date: "Aug 12", month: "August", monthNum: 8, day: 12,
    type: "Content Anchor",
    event: "Back to School begins",
    subject: "Your teenager's sleep is worse than you think",
    preheader: "Chronotypes, early starts, and what the research says about adolescent rest.",
    suggestedTopic: "Adolescent sleep science and chronotype mismatch",
  },
  {
    date: "Aug 19", month: "August", monthNum: 8, day: 19,
    type: "Cultural / Holiday",
    event: "World Humanitarian Day — brand values",
    subject: "Made in the USA. Formulated for real sleep.",
    preheader: "Why our manufacturing choices are part of the product, not just the packaging.",
    suggestedTopic: "USA-made supplements and transparent manufacturing standards",
  },
  {
    date: "Aug 26", month: "August", monthNum: 8, day: 26,
    type: "Sale / Promo",
    event: "Late-summer sale / Labor Day preview",
    subject: "Before summer ends — our best offer of Q3",
    preheader: "A preview of what's coming Labor Day. Early access inside.",
    suggestedTopic: "Late-summer sale — early access before Labor Day",
  },

  // ── September ──────────────────────────────────────────────────────────────
  {
    date: "Sep 1", month: "September", monthNum: 9, day: 1,
    type: "Sale / Promo",
    event: "Labor Day Weekend",
    subject: "Work hard. Sleep harder. This weekend only.",
    preheader: "Our biggest Q3 sale. Ends Monday midnight.",
    suggestedTopic: "Labor Day weekend sale — biggest Q3 discount",
  },
  {
    date: "Sep 8", month: "September", monthNum: 9, day: 8,
    type: "Content Anchor",
    event: "International Literacy Day",
    subject: "Read more, sleep better. The connection is real.",
    preheader: "How sleep consolidates learning — and what to do before you open a book.",
    suggestedTopic: "Sleep and memory consolidation for better learning",
  },
  {
    date: "Sep 21", month: "September", monthNum: 9, day: 21,
    type: "Health Awareness",
    event: "World Alzheimer's Day",
    subject: "What deep sleep does to your brain (the science is striking)",
    preheader: "The glymphatic system runs at night. This is why deep sleep is non-negotiable.",
    suggestedTopic: "Deep sleep and the glymphatic system brain-cleansing process",
  },
  {
    date: "Sep 29", month: "September", monthNum: 9, day: 29,
    type: "Health Awareness",
    event: "World Heart Day",
    subject: "Your heart recovers at night. Are you letting it?",
    preheader: "HRV, cardiovascular repair, and the sleep stage that does the work.",
    suggestedTopic: "Cardiovascular recovery through HRV and deep sleep",
  },

  // ── October ────────────────────────────────────────────────────────────────
  {
    date: "Oct 1", month: "October", monthNum: 10, day: 1,
    type: "Health Awareness",
    event: "World Mental Health Month begins",
    subject: "REM sleep and your emotional state — a month of insights",
    preheader: "October is Mental Health Month. We're starting with the sleep-mood connection.",
    suggestedTopic: "REM sleep and emotional regulation for mental health",
  },
  {
    date: "Oct 10", month: "October", monthNum: 10, day: 10,
    type: "Health Awareness",
    event: "World Mental Health Day",
    subject: "Mood, stress, and the sleep cycle no one talks about",
    preheader: "REM isn't just rest. It's emotional regulation. Here's what that means for you.",
    suggestedTopic: "REM sleep as emotional processing and stress regulation",
  },
  {
    date: "Oct 13", month: "October", monthNum: 10, day: 13,
    type: "Cultural / Holiday",
    event: "Thanksgiving (Canada)",
    subject: "Grateful for good sleep — and here's how we get there",
    preheader: "To our Canadian community: happy Thanksgiving. Rest well this weekend.",
    suggestedTopic: "Gratitude and the ritual of rest on Thanksgiving weekend",
  },
  {
    date: "Oct 31", month: "October", monthNum: 10, day: 31,
    type: "Content Anchor",
    event: "Halloween — late nights, candy crash",
    subject: "What sugar at 9pm does to your sleep at midnight",
    preheader: "The blood sugar spike, the crash, and the REM disruption that follows.",
    suggestedTopic: "Sugar crashes and REM disruption on Halloween night",
  },

  // ── November ───────────────────────────────────────────────────────────────
  {
    date: "Nov 1", month: "November", monthNum: 11, day: 1,
    type: "Content Anchor",
    event: "Daylight Saving Ends (US)",
    subject: "The clocks fall back. Your body doesn't know that.",
    preheader: "Circadian disruption, light exposure, and how to recalibrate this week.",
    suggestedTopic: "Circadian recalibration after daylight saving time ends",
  },
  {
    date: "Nov 3", month: "November", monthNum: 11, day: 3,
    type: "Email Trigger",
    event: "DST email send",
    subject: "The clocks changed. Your sleep shouldn't suffer.",
    preheader: "How to adjust your routine in the next 48 hours — and why it matters.",
    suggestedTopic: "48-hour routine adjustment after the clocks change",
  },
  {
    date: "Nov 11", month: "November", monthNum: 11, day: 11,
    type: "Cultural / Holiday",
    event: "Veterans Day",
    subject: "For those who serve — and for everyone who needs real rest",
    preheader: "Veterans Day. A moment to acknowledge the people who protect our ability to rest.",
    suggestedTopic: "Rest as recovery — honouring those who serve",
  },
  {
    date: "Nov 20", month: "November", monthNum: 11, day: 20,
    type: "Sale / Promo",
    event: "BFCM campaign launch",
    subject: "Something big is coming. You should see this first.",
    preheader: "Our biggest sale of the year launches in one week. Early access inside.",
    suggestedTopic: "Black Friday early access — biggest sale of the year",
  },
  {
    date: "Nov 27", month: "November", monthNum: 11, day: 27,
    type: "Cultural / Holiday",
    event: "Thanksgiving (US)",
    subject: "Rest, gratitude, and what actually comes next",
    preheader: "Happy Thanksgiving. Enjoy the table — and the sleep after.",
    suggestedTopic: "Post-Thanksgiving rest and recovery protocol",
  },
  {
    date: "Nov 28", month: "November", monthNum: 11, day: 28,
    type: "Sale / Promo",
    event: "Black Friday",
    subject: "Our biggest sale of the year. Today only.",
    preheader: "Deepest discount we run. Subscribe and save, or stock up. Ends midnight.",
    suggestedTopic: "Black Friday — deepest discount, ends midnight tonight",
  },
  {
    date: "Nov 30", month: "November", monthNum: 11, day: 30,
    type: "Sale / Promo",
    event: "Cyber Monday",
    subject: "Last chance — ends tonight at midnight",
    preheader: "Final day of the BFCM window. Same deal. No extensions.",
    suggestedTopic: "Cyber Monday last chance — BFCM sale ends tonight",
  },

  // ── December ───────────────────────────────────────────────────────────────
  {
    date: "Dec 8", month: "December", monthNum: 12, day: 8,
    type: "Email Trigger",
    event: "Post-BFCM list nurture",
    subject: "Didn't grab it during Black Friday? We saved something for you.",
    preheader: "A quieter offer for the people who missed the window.",
    suggestedTopic: "Post-Black Friday offer for those who missed the sale",
  },
  {
    date: "Dec 14", month: "December", monthNum: 12, day: 14,
    type: "Sale / Promo",
    event: "Holiday gift guide final push",
    subject: "Last call for standard shipping",
    preheader: "Order by tonight for guaranteed delivery before the holidays. Gift guide inside.",
    suggestedTopic: "Last call for holiday shipping — gift guide inside",
  },
  {
    date: "Dec 21", month: "December", monthNum: 12, day: 21,
    type: "Content Anchor",
    event: "Winter Solstice — shortest day",
    subject: "The shortest day of the year is actually the longest night",
    preheader: "Darkness, melatonin, and why your body is primed to sleep well right now.",
    suggestedTopic: "Winter solstice darkness and peak melatonin production",
  },
  {
    date: "Dec 26", month: "December", monthNum: 12, day: 26,
    type: "Email Trigger",
    event: "Post-holiday reset campaign",
    subject: "The holidays wrecked your sleep. Let's fix it.",
    preheader: "Late nights, time zones, sugar, alcohol. A reset protocol for the next 7 days.",
    suggestedTopic: "7-day post-holiday sleep reset protocol",
  },
  {
    date: "Dec 31", month: "December", monthNum: 12, day: 31,
    type: "Email Trigger",
    event: "New Year's Eve — resolution set-up",
    subject: "One habit. Better sleep in 2027.",
    preheader: "Before the resolutions pile up, start with the one that makes everything else easier.",
    suggestedTopic: "The one sleep habit that makes every resolution easier",
  },
];

export const EVENT_TYPE_COLORS: Record<string, string> = {
  "Sale / Promo": "var(--success)",
  "Health Awareness": "var(--accent)",
  "Content Anchor": "var(--muted)",
  "Email Trigger": "#c084fc",
  "Cultural / Holiday": "#f59e0b",
  "Paid Ads Spike": "#f87171",
};

/** Returns upcoming events from today (year 2026), sorted ascending. */
export function getUpcomingEvents(count = 3): LuniaCalendarEvent[] {
  const today = new Date();
  const year = 2026;

  return LUNIA_CALENDAR_2026
    .map(ev => ({ ev, d: new Date(year, ev.monthNum - 1, ev.day) }))
    .filter(({ d }) => d >= today)
    .sort((a, b) => a.d.getTime() - b.d.getTime())
    .slice(0, count)
    .map(({ ev }) => ev);
}
