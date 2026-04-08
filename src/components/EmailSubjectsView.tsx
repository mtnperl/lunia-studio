"use client";
import { useState } from "react";

type SubjectIdea = {
  subject: string;
  preheader: string;
  category: string;
};

// ─── Seed library of email subject ideas ─────────────────────────────────────
// Categories: Sleep · Energy · Focus · Gut · Stress · Recovery · Ritual · Product · Educational · Seasonal
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

const CATEGORIES = ["All", ...Array.from(new Set(SEED_SUBJECTS.map(s => s.category)))];

export default function EmailSubjectsView() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = SEED_SUBJECTS.filter(s => {
    const matchCat = activeCategory === "All" || s.category === activeCategory;
    const matchSearch = !search.trim() || s.subject.toLowerCase().includes(search.toLowerCase()) || s.preheader.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 40px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 300,
          color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.02em",
        }}>
          Email Subjects
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", margin: 0 }}>
          {SEED_SUBJECTS.length} subject lines + preheaders in Lunia voice. Click to copy.
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search subjects..."
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

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
        {CATEGORIES.map(cat => (
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

      {/* Subject list */}
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
                transition: "border-color 0.12s",
                cursor: "pointer",
              }}
              onClick={() => copy(item.subject)}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-strong)"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500,
                  color: "var(--text)", marginBottom: 4, lineHeight: 1.4,
                }}>
                  {item.subject}
                </div>
                <div style={{
                  fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)",
                  lineHeight: 1.5,
                }}>
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
                flexShrink: 0,
                fontFamily: "var(--font-mono)", fontSize: 10,
                color: isCopied ? "var(--success)" : "var(--subtle)",
                letterSpacing: "0.06em", paddingTop: 2,
                transition: "color 0.15s",
              }}>
                {isCopied ? "✓ copied" : "copy"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
