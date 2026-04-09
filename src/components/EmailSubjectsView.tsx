"use client";
import { useState } from "react";
import { LUNIA_CALENDAR_2026, EVENT_TYPE_COLORS } from "@/lib/lunia-calendar";

type SubjectIdea = {
  subject: string;
  preheader: string;
  category: string;
};

// Legacy local type — kept for type compatibility in the map below
type CalendarEvent = {
  date: string;
  month: string;
  event: string;
  subject: string;
  preheader: string;
  type: string;       // "Sale / Promo" | "Health Awareness" | "Content Anchor" | etc.
};

// ─── Seed library of email subject ideas ─────────────────────────────────────
const SEED_SUBJECTS: SubjectIdea[] = [
  // Sleep
  { subject: "You're not tired — you're magnesium-deficient", preheader: "One mineral. One hour. A night that actually restores you.", category: "Sleep" },
  { subject: "The 90-minute rule your sleep needs", preheader: "Align with your body's natural cycle and wake up different.", category: "Sleep" },
  { subject: "What happens to your body at 2am", preheader: "Most people miss this window. You don't have to.", category: "Sleep" },
  { subject: "Sleep is a skill. Here's how to get better at it.", preheader: "Three practices worth adding to your evening.", category: "Sleep" },
  { subject: "Why you wake up at 3am (and how to stop)", preheader: "Cortisol, blood sugar, and the quiet fix.", category: "Sleep" },

  // Energy
  { subject: "The energy crash isn't normal", preheader: "Steady, sustained output — no spike, no slump.", category: "Energy" },
  { subject: "Before your second coffee, read this", preheader: "What your body is actually asking for at 2pm.", category: "Energy" },
  { subject: "Adaptogens 101: what they actually do", preheader: "The science behind how your body handles stress and energy.", category: "Energy" },
  { subject: "You can't outwork a recovery deficit", preheader: "Why the highest performers prioritise restoration.", category: "Energy" },
  { subject: "More energy without more caffeine", preheader: "The three pillars that actually move the needle.", category: "Energy" },

  // Focus
  { subject: "Your focus window is 90 minutes. Use it.", preheader: "Ultradian rhythms and how to work with them, not against them.", category: "Focus" },
  { subject: "The clearest thinking of your life starts here", preheader: "What top performers do before they open their inbox.", category: "Focus" },
  { subject: "Distraction isn't a character flaw", preheader: "Your brain is doing exactly what it was designed for. Here's the fix.", category: "Focus" },
  { subject: "Sharper thinking in 30 days", preheader: "The protocol we built for sustained cognitive performance.", category: "Focus" },
  { subject: "Lion's Mane and the neurons you're not growing", preheader: "The research is quiet. The results aren't.", category: "Focus" },

  // Gut
  { subject: "The gut-brain connection isn't a metaphor", preheader: "Why your digestion is running your mood.", category: "Gut" },
  { subject: "What you eat at breakfast sets the tone", preheader: "One change. Twelve hours of difference.", category: "Gut" },
  { subject: "Your microbiome is talking. Are you listening?", preheader: "Simple signals your gut sends — and what to do with them.", category: "Gut" },
  { subject: "The inflammation you can't see", preheader: "How low-grade inflammation quietly erodes performance.", category: "Gut" },

  // Stress & Cortisol
  { subject: "Stress isn't the problem. Unmanaged cortisol is.", preheader: "What's happening hormonally and the levers you control.", category: "Stress" },
  { subject: "Ashwagandha or Rhodiola? Here's the difference.", preheader: "How to choose the right adaptogen for your stress pattern.", category: "Stress" },
  { subject: "Your nervous system needs a recovery day too", preheader: "What real rest looks like for a high-output person.", category: "Stress" },
  { subject: "The cortisol spike you didn't know you had", preheader: "Morning behaviour that sets your stress tone for the day.", category: "Stress" },
  { subject: "Less reactive. More intentional. Here's how.", preheader: "The tools that build stress resilience from the inside out.", category: "Stress" },

  // Recovery
  { subject: "Recovery is training. You're probably skipping it.", preheader: "What happens to your body when adaptation is interrupted.", category: "Recovery" },
  { subject: "The protocol after a hard week", preheader: "How to actually reset — not just rest.", category: "Recovery" },
  { subject: "Inflammation is a signal, not a flaw", preheader: "How to support your body through the adaptation process.", category: "Recovery" },
  { subject: "Cold. Heat. Sleep. The recovery triangle.", preheader: "Three inputs that make everything else work better.", category: "Recovery" },

  // Morning Ritual
  { subject: "The first 60 minutes determine the next 16 hours", preheader: "A Lunia morning — slow, intentional, optimised.", category: "Ritual" },
  { subject: "No screens. No coffee. Not yet.", preheader: "The 20-minute window most people waste every morning.", category: "Ritual" },
  { subject: "What a Lunia morning actually looks like", preheader: "Simple, repeatable, and grounded in how your biology works.", category: "Ritual" },
  { subject: "The supplement stack we reach for at 6am", preheader: "What's in it, why it's there, and how it works together.", category: "Ritual" },
  { subject: "Rituals outperform willpower every time", preheader: "Building the scaffolding that makes good decisions automatic.", category: "Ritual" },

  // Product-led
  { subject: "Formulated for people who take this seriously", preheader: "What sets Lunia apart starts with what we refuse to compromise on.", category: "Product" },
  { subject: "The ingredients list is the product", preheader: "Why we're transparent about what's inside and at what dose.", category: "Product" },
  { subject: "Third-party tested. Not because we have to. Because you should expect it.", preheader: "Our standard for what goes into every Lunia formula.", category: "Product" },
  { subject: "No fillers. No fairy dusting. Just the dose that works.", preheader: "What evidence-based supplementation actually looks like.", category: "Product" },
  { subject: "New formula. Same obsession with getting it right.", preheader: "What we improved and why the change matters to your results.", category: "Product" },

  // Educational
  { subject: "The supplement industry has a transparency problem", preheader: "How to read a label like someone who knows what they're looking for.", category: "Educational" },
  { subject: "Bioavailability: the word your supplements are hiding from", preheader: "Why the form of a nutrient matters as much as the dose.", category: "Educational" },
  { subject: "What 'clinically studied' actually means", preheader: "And how to tell the difference between good research and marketing.", category: "Educational" },
  { subject: "You're probably dosing magnesium wrong", preheader: "Form, timing, and the common mistake that blunts results.", category: "Educational" },
  { subject: "The research behind adaptogens: a plain-English explainer", preheader: "What the studies say, what they don't — and what we concluded.", category: "Educational" },

  // Seasonal / Timely
  { subject: "Autumn is when your immune system needs the most support", preheader: "What the seasonal shift does to your biology — and how to prepare.", category: "Seasonal" },
  { subject: "Summer energy vs winter energy: why they feel different", preheader: "Circadian shifts, daylight, and how to adjust your protocol.", category: "Seasonal" },
  { subject: "New year energy: resetting your baseline", preheader: "A 30-day protocol for people who want to start differently this time.", category: "Seasonal" },
  { subject: "Your body's January — what's actually happening", preheader: "Beyond motivation: the biological case for a January reset.", category: "Seasonal" },
  { subject: "The Q4 burnout pattern — and how to interrupt it", preheader: "What high-output people miss every November.", category: "Seasonal" },
];

// ─── Marketing Calendar 2026 — imported from shared lib ─────────────────────
const CALENDAR_EVENTS: CalendarEvent[] = LUNIA_CALENDAR_2026 as CalendarEvent[];

// (kept here only so TS recognises the local type as used)
const _SEED_LOCAL: CalendarEvent[] = [
  // ── April ──────────────────────────────────────────────────────────────────
  {
    date: "Apr 1", month: "April", type: "Content Anchor",
    event: "April Fools — myth-bust",
    subject: "The sleep myth we hear most — and why it's wrong",
    preheader: "No tricks. Just the truth about what actually helps you sleep.",
  },
  {
    date: "Apr 7", month: "April", type: "Health Awareness",
    event: "World Health Day",
    subject: "Sleep is the foundation. Not a bonus.",
    preheader: "On World Health Day, a reminder that rest is where health begins.",
  },
  {
    date: "Apr 15", month: "April", type: "Paid Ads Spike",
    event: "Tax Day (US) — stress spike",
    subject: "Tax season is wrecking your sleep. Here's why.",
    preheader: "Cortisol spikes, deadline anxiety, and the one thing that helps.",
  },
  {
    date: "Apr 22", month: "April", type: "Cultural / Holiday",
    event: "Earth Day",
    subject: "Clean sleep starts with a clean formula",
    preheader: "USA-made. Vegan. No fillers. This is what we chose — and why.",
  },
  {
    date: "Apr 28", month: "April", type: "Health Awareness",
    event: "World Sleep Disorders Awareness Day",
    subject: "Most people don't know they have a sleep disorder",
    preheader: "The signs are subtle. The fix is simpler than you'd think.",
  },

  // ── May ────────────────────────────────────────────────────────────────────
  {
    date: "May 1", month: "May", type: "Email Trigger",
    event: "Better Sleep Month — launch email",
    subject: "It's Better Sleep Month. Here's what we know.",
    preheader: "One month. A full picture of what it actually takes to sleep better.",
  },
  {
    date: "May 5", month: "May", type: "Content Anchor",
    event: "Cinco de Mayo — alcohol + sleep",
    subject: "What one drink actually does to your sleep",
    preheader: "The science behind alcohol and REM is not what most people expect.",
  },
  {
    date: "May 12", month: "May", type: "Sale / Promo",
    event: "Mother's Day",
    subject: "The best gift for someone who never sleeps enough",
    preheader: "Give the one thing she won't buy herself. Free shipping this weekend.",
  },
  {
    date: "May 26", month: "May", type: "Sale / Promo",
    event: "Memorial Day Weekend",
    subject: "This weekend only — sleep better for less",
    preheader: "3-day sale. No code needed. Ships Monday.",
  },

  // ── June ───────────────────────────────────────────────────────────────────
  {
    date: "Jun 1", month: "June", type: "Cultural / Holiday",
    event: "Pride Month begins",
    subject: "Better sleep is for everyone",
    preheader: "This month and every month — rest is a right, not a reward.",
  },
  {
    date: "Jun 15", month: "June", type: "Sale / Promo",
    event: "Father's Day",
    subject: "He won't ask for help sleeping. Give it to him anyway.",
    preheader: "The sleep stack for the person who pushes through. Gift guide inside.",
  },
  {
    date: "Jun 21", month: "June", type: "Content Anchor",
    event: "Summer Solstice — longest day",
    subject: "The longest day of the year just messed with your sleep",
    preheader: "Light exposure, melatonin timing, and what to do tonight.",
  },
  {
    date: "Jun 27", month: "June", type: "Health Awareness",
    event: "National PTSD Awareness Day",
    subject: "Sleep and stress: what the research actually says",
    preheader: "An honest look at the connection — and how to support your nervous system.",
  },

  // ── July ───────────────────────────────────────────────────────────────────
  {
    date: "Jul 4", month: "July", type: "Content Anchor",
    event: "Independence Day — late nights, fireworks",
    subject: "How to reset your sleep after a late night",
    preheader: "The exact protocol for getting back on track tomorrow morning.",
  },
  {
    date: "Jul 14", month: "July", type: "Email Trigger",
    event: "Mid-year check-in",
    subject: "6 months of better sleep — where are you?",
    preheader: "Halfway through the year. A moment to check in on the habit that changes everything.",
  },
  {
    date: "Jul 28", month: "July", type: "Health Awareness",
    event: "World Hepatitis Day — inflammation angle",
    subject: "Inflammation is quiet. And it's ruining your sleep.",
    preheader: "Low-grade inflammation disrupts your deepest sleep stages. Here's what to know.",
  },

  // ── August ─────────────────────────────────────────────────────────────────
  {
    date: "Aug 8", month: "August", type: "Content Anchor",
    event: "International Cat Day — playful content",
    subject: "The one thing cats get right about sleep",
    preheader: "They don't apologise for resting. Neither should you.",
  },
  {
    date: "Aug 12", month: "August", type: "Content Anchor",
    event: "Back to School begins",
    subject: "Your teenager's sleep is worse than you think",
    preheader: "Chronotypes, early starts, and what the research says about adolescent rest.",
  },
  {
    date: "Aug 19", month: "August", type: "Cultural / Holiday",
    event: "World Humanitarian Day — brand values",
    subject: "Made in the USA. Formulated for real sleep.",
    preheader: "Why our manufacturing choices are part of the product, not just the packaging.",
  },
  {
    date: "Aug 26", month: "August", type: "Sale / Promo",
    event: "Late-summer sale / Labor Day preview",
    subject: "Before summer ends — our best offer of Q3",
    preheader: "A preview of what's coming Labor Day. Early access inside.",
  },

  // ── September ──────────────────────────────────────────────────────────────
  {
    date: "Sep 1", month: "September", type: "Sale / Promo",
    event: "Labor Day Weekend",
    subject: "Work hard. Sleep harder. This weekend only.",
    preheader: "Our biggest Q3 sale. Ends Monday midnight.",
  },
  {
    date: "Sep 8", month: "September", type: "Content Anchor",
    event: "International Literacy Day",
    subject: "Read more, sleep better. The connection is real.",
    preheader: "How sleep consolidates learning — and what to do before you open a book.",
  },
  {
    date: "Sep 21", month: "September", type: "Health Awareness",
    event: "World Alzheimer's Day",
    subject: "What deep sleep does to your brain (the science is striking)",
    preheader: "The glymphatic system runs at night. This is why deep sleep is non-negotiable.",
  },
  {
    date: "Sep 29", month: "September", type: "Health Awareness",
    event: "World Heart Day",
    subject: "Your heart recovers at night. Are you letting it?",
    preheader: "HRV, cardiovascular repair, and the sleep stage that does the work.",
  },

  // ── October ────────────────────────────────────────────────────────────────
  {
    date: "Oct 1", month: "October", type: "Health Awareness",
    event: "World Mental Health Month begins",
    subject: "REM sleep and your emotional state — a month of insights",
    preheader: "October is Mental Health Month. We're starting with the sleep-mood connection.",
  },
  {
    date: "Oct 10", month: "October", type: "Health Awareness",
    event: "World Mental Health Day",
    subject: "Mood, stress, and the sleep cycle no one talks about",
    preheader: "REM isn't just rest. It's emotional regulation. Here's what that means for you.",
  },
  {
    date: "Oct 13", month: "October", type: "Cultural / Holiday",
    event: "Thanksgiving (Canada)",
    subject: "Grateful for good sleep — and here's how we get there",
    preheader: "To our Canadian community: happy Thanksgiving. Rest well this weekend.",
  },
  {
    date: "Oct 31", month: "October", type: "Content Anchor",
    event: "Halloween — late nights, candy crash",
    subject: "What sugar at 9pm does to your sleep at midnight",
    preheader: "The blood sugar spike, the crash, and the REM disruption that follows.",
  },

  // ── November ───────────────────────────────────────────────────────────────
  {
    date: "Nov 1", month: "November", type: "Content Anchor",
    event: "Daylight Saving Ends (US)",
    subject: "The clocks fall back. Your body doesn't know that.",
    preheader: "Circadian disruption, light exposure, and how to recalibrate this week.",
  },
  {
    date: "Nov 3", month: "November", type: "Email Trigger",
    event: "DST email send",
    subject: "The clocks changed. Your sleep shouldn't suffer.",
    preheader: "How to adjust your routine in the next 48 hours — and why it matters.",
  },
  {
    date: "Nov 11", month: "November", type: "Cultural / Holiday",
    event: "Veterans Day",
    subject: "For those who serve — and for everyone who needs real rest",
    preheader: "Veterans Day. A moment to acknowledge the people who protect our ability to rest.",
  },
  {
    date: "Nov 20", month: "November", type: "Sale / Promo",
    event: "BFCM campaign launch",
    subject: "Something big is coming. You should see this first.",
    preheader: "Our biggest sale of the year launches in one week. Early access inside.",
  },
  {
    date: "Nov 27", month: "November", type: "Cultural / Holiday",
    event: "Thanksgiving (US)",
    subject: "Rest, gratitude, and what actually comes next",
    preheader: "Happy Thanksgiving. Enjoy the table — and the sleep after.",
  },
  {
    date: "Nov 28", month: "November", type: "Sale / Promo",
    event: "Black Friday",
    subject: "Our biggest sale of the year. Today only.",
    preheader: "Deepest discount we run. Subscribe and save, or stock up. Ends midnight.",
  },
  {
    date: "Nov 30", month: "November", type: "Sale / Promo",
    event: "Cyber Monday",
    subject: "Last chance — ends tonight at midnight",
    preheader: "Final day of the BFCM window. Same deal. No extensions.",
  },

  // ── December ───────────────────────────────────────────────────────────────
  {
    date: "Dec 8", month: "December", type: "Email Trigger",
    event: "Post-BFCM list nurture",
    subject: "Didn't grab it during Black Friday? We saved something for you.",
    preheader: "A quieter offer for the people who missed the window.",
  },
  {
    date: "Dec 14", month: "December", type: "Sale / Promo",
    event: "Holiday gift guide final push",
    subject: "Last call for standard shipping",
    preheader: "Order by tonight for guaranteed delivery before the holidays. Gift guide inside.",
  },
  {
    date: "Dec 21", month: "December", type: "Content Anchor",
    event: "Winter Solstice — shortest day",
    subject: "The shortest day of the year is actually the longest night",
    preheader: "Darkness, melatonin, and why your body is primed to sleep well right now.",
  },
  {
    date: "Dec 26", month: "December", type: "Email Trigger",
    event: "Post-holiday reset campaign",
    subject: "The holidays wrecked your sleep. Let's fix it.",
    preheader: "Late nights, time zones, sugar, alcohol. A reset protocol for the next 7 days.",
  },
  {
    date: "Dec 31", month: "December", type: "Email Trigger",
    event: "New Year's Eve — resolution set-up",
    subject: "One habit. Better sleep in 2026.",
    preheader: "Before the resolutions pile up — start with the one that makes everything else easier.",
  },
];

// Group calendar events by month (already sorted chronologically in the lib)
const CALENDAR_MONTHS = Array.from(new Set(CALENDAR_EVENTS.map(e => e.month)));

const SEED_CATEGORIES = ["All", ...Array.from(new Set(SEED_SUBJECTS.map(s => s.category)))];

export default function EmailSubjectsView() {
  const [view, setView] = useState<"ideas" | "calendar">("ideas");
  const [activeCategory, setActiveCategory] = useState("All");
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = SEED_SUBJECTS.filter(s => {
    const matchCat = activeCategory === "All" || s.category === activeCategory;
    const matchSearch = !search.trim() || s.subject.toLowerCase().includes(search.toLowerCase()) || s.preheader.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredCalendar = CALENDAR_EVENTS.filter(e =>
    !search.trim() ||
    e.subject.toLowerCase().includes(search.toLowerCase()) ||
    e.preheader.toLowerCase().includes(search.toLowerCase()) ||
    e.event.toLowerCase().includes(search.toLowerCase())
  );

  const calendarByMonth = CALENDAR_MONTHS.map(month => ({
    month,
    events: filteredCalendar.filter(e => e.month === month),
  })).filter(g => g.events.length > 0);

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 40px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 300,
          color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.02em",
        }}>
          Email Subjects
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", margin: 0 }}>
          {SEED_SUBJECTS.length} brand ideas + {LUNIA_CALENDAR_2026.length} 2026 calendar events. Click to copy.
        </p>
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--surface-r)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {(["ideas", "calendar"] as const).map(v => (
          <button
            key={v}
            onClick={() => { setView(v); setSearch(""); setActiveCategory("All"); }}
            style={{
              padding: "6px 18px", borderRadius: 7, cursor: "pointer",
              fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em",
              background: view === v ? "var(--bg)" : "transparent",
              border: view === v ? "1px solid var(--border)" : "1px solid transparent",
              color: view === v ? "var(--text)" : "var(--subtle)",
              transition: "all 0.12s",
            }}
          >
            {v === "ideas" ? "Brand Ideas" : "2026 Calendar"}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={view === "ideas" ? "Search subjects..." : "Search events or subjects..."}
        style={{
          width: "100%", padding: "10px 14px", marginBottom: 16,
          borderRadius: 8, background: "var(--surface-r)",
          border: "1px solid var(--border)",
          fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text)",
          boxSizing: "border-box", outline: "none",
        }}
        onFocus={e => (e.target.style.borderColor = "var(--accent)")}
        onBlur={e => (e.target.style.borderColor = "var(--border)")}
      />

      {/* ── Ideas view ── */}
      {view === "ideas" && (
        <>
          {/* Category filter */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
            {SEED_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "5px 14px", borderRadius: 20, cursor: "pointer",
                  fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em",
                  background: activeCategory === cat ? "var(--accent-dim)" : "var(--surface-r)",
                  border: activeCategory === cat ? "1px solid var(--accent-mid)" : "1px solid var(--border)",
                  color: activeCategory === cat ? "var(--accent)" : "var(--subtle)",
                  transition: "all 0.12s",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.length === 0 && (
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", textAlign: "center", padding: "40px 0" }}>
                No subjects match your search.
              </div>
            )}
            {filtered.map((item, i) => {
              const isCopied = copied === item.subject;
              return (
                <div
                  key={i}
                  style={{
                    padding: "14px 16px", borderRadius: 10,
                    background: "var(--surface)", border: "1px solid var(--border)",
                    display: "flex", alignItems: "flex-start", gap: 12,
                    transition: "border-color 0.12s", cursor: "pointer",
                  }}
                  onClick={() => copy(item.subject)}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-strong)"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 4, lineHeight: 1.4 }}>
                      {item.subject}
                    </div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                      {item.preheader}
                    </div>
                    <div style={{
                      marginTop: 6, display: "inline-block",
                      fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em",
                      textTransform: "uppercase", color: "var(--subtle)",
                      background: "var(--surface-r)", padding: "2px 7px", borderRadius: 4,
                    }}>
                      {item.category}
                    </div>
                  </div>
                  <div style={{
                    flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: 10,
                    color: isCopied ? "var(--success)" : "var(--subtle)",
                    letterSpacing: "0.06em", paddingTop: 2, transition: "color 0.15s",
                  }}>
                    {isCopied ? "✓ copied" : "copy"}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Calendar view ── */}
      {view === "calendar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {calendarByMonth.length === 0 && (
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", textAlign: "center", padding: "40px 0" }}>
              No events match your search.
            </div>
          )}
          {calendarByMonth.map(({ month, events }) => (
            <div key={month}>
              {/* Month header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12, marginBottom: 12,
              }}>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  color: "var(--text)",
                }}>
                  {month}
                </div>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)",
                  letterSpacing: "0.1em",
                }}>
                  {events.length} event{events.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Events */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {events.map((ev, i) => {
                  const isCopied = copied === ev.subject;
                  const typeColor = EVENT_TYPE_COLORS[ev.type] ?? "var(--subtle)";
                  return (
                    <div
                      key={i}
                      style={{
                        padding: "14px 16px", borderRadius: 10,
                        background: "var(--surface)", border: "1px solid var(--border)",
                        display: "flex", alignItems: "flex-start", gap: 12,
                        transition: "border-color 0.12s", cursor: "pointer",
                      }}
                      onClick={() => copy(ev.subject)}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-strong)"}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}
                    >
                      {/* Date column */}
                      <div style={{ flexShrink: 0, width: 40, paddingTop: 2 }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>
                          {ev.date}
                        </div>
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 4, lineHeight: 1.4 }}>
                          {ev.subject}
                        </div>
                        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 6 }}>
                          {ev.preheader}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <div style={{
                            fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em",
                            textTransform: "uppercase", color: "var(--subtle)",
                            background: "var(--surface-r)", padding: "2px 7px", borderRadius: 4,
                          }}>
                            {ev.event}
                          </div>
                          <div style={{
                            fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em",
                            textTransform: "uppercase", color: typeColor,
                            padding: "2px 7px", borderRadius: 4,
                            background: "var(--surface-r)",
                          }}>
                            {ev.type}
                          </div>
                        </div>
                      </div>
                      {/* Copy */}
                      <div style={{
                        flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: 10,
                        color: isCopied ? "var(--success)" : "var(--subtle)",
                        letterSpacing: "0.06em", paddingTop: 2, transition: "color 0.15s",
                      }}>
                        {isCopied ? "✓ copied" : "copy"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
