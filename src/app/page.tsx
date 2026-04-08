"use client";
import { useState, useEffect } from "react";
import GenerateView from "@/components/GenerateView";
import EditorView from "@/components/EditorView";
import LibraryView from "@/components/LibraryView";
import CarouselView from "@/components/CarouselView";
import BatchView from "@/components/BatchView";
import CarouselLibraryView from "@/components/CarouselLibraryView";
import SubjectsView from "@/components/SubjectsView";
import HomeView from "@/components/HomeView";
import DashboardView from "@/components/DashboardView";
import VideoView from "@/components/VideoView";
import VideoAssetsView from "@/components/VideoAssetsView";
import VideoLibraryView from "@/components/VideoLibraryView";
import EmailBuilderView from "@/components/EmailBuilderView";
import EmailLibraryView from "@/components/EmailLibraryView";
import EmailSubjectsView from "@/components/EmailSubjectsView";
import { Script, EmailSection } from "@/lib/types";
import { getLibrary, saveScript } from "@/lib/storage";

type Tab = "home" | "generate" | "editor" | "library" | "carousel" | "carousel-library" | "batch" | "subjects" | "email" | "email-library" | "email-subjects" | "video" | "video-assets" | "video-library" | "analytics";
type Product = "home" | "script" | "carousel" | "ads" | "analytics";

const LIGHT_VARS: Record<string, string> = {
  "--bg": "#F5F0E8", "--surface": "#EDE8DF", "--surface-r": "#E5DFD0",
  "--surface-h": "#DDD7C8", "--text": "#1C1916", "--muted": "#6B6359",
  "--subtle": "#9B9389", "--accent": "#A07830",
  "--accent-dim": "rgba(160,120,48,0.10)", "--accent-mid": "rgba(160,120,48,0.28)",
  "--border": "#D8D1C0", "--border-strong": "#C8C0B0",
  "--success": "#3D7A52", "--warning": "#B86040", "--error": "#A04040",
};
const DARK_VARS: Record<string, string> = {
  "--bg": "#0D0C0A", "--surface": "#171512", "--surface-r": "#201E1B",
  "--surface-h": "#252219", "--text": "#EDE8DF", "--muted": "#7A7268",
  "--subtle": "#4A4640", "--accent": "#C8A96E",
  "--accent-dim": "rgba(200,169,110,0.12)", "--accent-mid": "rgba(200,169,110,0.30)",
  "--border": "#2A2723", "--border-strong": "#332F2B",
  "--success": "#5F9E75", "--warning": "#C47A5A", "--error": "#B85C5C",
};
function applyThemeVars(t: "dark" | "light") {
  const vars = t === "light" ? LIGHT_VARS : DARK_VARS;
  const el = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
}

const NAV: { section: string; items: { key: Tab; product: Product; label: string }[] }[] = [
  {
    section: "Script",
    items: [
      { key: "generate", product: "script", label: "Generate" },
      { key: "editor",   product: "script", label: "Editor"   },
      { key: "library",  product: "script", label: "Library"  },
    ],
  },
  {
    section: "Carousel",
    items: [
      { key: "carousel",  product: "carousel", label: "Builder"  },
      { key: "batch",     product: "carousel", label: "Batch"    },
      { key: "subjects",          product: "carousel", label: "Subjects" },
      { key: "carousel-library", product: "carousel", label: "Library"  },
    ],
  },
  {
    section: "Email",
    items: [
      { key: "email",          product: "carousel", label: "Builder"  },
      { key: "email-subjects", product: "carousel", label: "Subjects" },
      { key: "email-library",  product: "carousel", label: "Library"  },
    ],
  },
  {
    section: "Video",
    items: [
      { key: "video",         product: "ads", label: "Builder"       },
      { key: "video-library", product: "ads", label: "Library"       },
      { key: "video-assets",  product: "ads", label: "Assets"        },
    ],
  },
  {
    section: "Analytics",
    items: [
      { key: "analytics", product: "analytics", label: "Dashboard" },
    ],
  },
];

export default function Page() {
  const [tab, setTab]               = useState<Tab>("home");
  const [activeScript, setActiveScript] = useState<Script | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [pendingCarousel, setPendingCarousel] = useState<import("@/lib/types").SavedCarousel | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("lunia:theme") as "dark" | "light" | null;
    const initial = saved ?? "light";
    setTheme(initial);
    applyThemeVars(initial);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("lunia:theme", next);
    applyThemeVars(next);
  }

  useEffect(() => { getLibrary().catch(() => {}); }, [tab]);

  function openEditor(script: Script) {
    setActiveScript(script);
    setTab("editor");
    setMobileNavOpen(false);
  }

  function handleScriptUpdate(s: Script) {
    setActiveScript(s);
    saveScript(s);
  }

  function navigate(t: Tab) {
    setTab(t);
    setMobileNavOpen(false);
  }

  function handleEmailToCarousel(data: { frameworkLabel: string; subjectLines: string[]; preheader: string; sections: EmailSection[] }) {
    const synthetic: import("@/lib/types").SavedCarousel = {
      id: "email-bridge-" + Date.now(),
      topic: data.frameworkLabel + " — " + data.subjectLines[0],
      hookTone: "educational",
      content: {
        hooks: [{ headline: data.subjectLines[0], subline: data.preheader }],
        slides: data.sections.slice(0, 3).map(s => ({
          headline: s.heading ?? "",
          body: s.body,
          citation: "",
        })),
        cta: { headline: "Follow for more", followLine: "@lunia_life" },
        caption: "",
      },
      selectedHook: 0,
      savedAt: new Date().toISOString(),
    };
    setPendingCarousel(synthetic);
    navigate("carousel");
  }

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).toUpperCase();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <style>{`
        @media (max-width: 700px) {
          .lunia-sidebar { transform: translateX(-100%); transition: transform 0.22s ease; position: fixed !important; z-index: 100; }
          .lunia-sidebar.open { transform: translateX(0); }
          .lunia-mobile-toggle { display: flex !important; }
          .lunia-main { padding-left: 0 !important; }
        }
        @media (min-width: 701px) {
          .lunia-mobile-toggle { display: none !important; }
          .lunia-mobile-overlay { display: none !important; }
        }
      `}</style>

      {/* ── Mobile overlay ── */}
      {mobileNavOpen && (
        <div className="lunia-mobile-overlay" onClick={() => setMobileNavOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 99,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
        }} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`lunia-sidebar${mobileNavOpen ? " open" : ""}`} style={{
        width: 240, flexShrink: 0,
        background: "var(--surface)", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
        overflow: "hidden",
      }}>
        {/* Brand */}
        <div style={{
          padding: "24px 24px 18px",
          borderBottom: "1px solid var(--border)",
          cursor: "pointer",
        }} onClick={() => navigate("home")}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lunia-logo.jpg" alt="Lunia Life" style={{ height: 28, width: "auto", borderRadius: 4 }} />
            <span style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--text)",
            }}>Studio</span>
          </div>
        </div>

        {/* Date */}
        <div style={{
          padding: "14px 24px 2px",
          fontFamily: "var(--font-mono)", fontSize: 10,
          color: "var(--subtle)", letterSpacing: "0.06em",
        }}>
          {dateLabel}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 0 20px", overflowY: "auto" }}>
          {NAV.map(({ section, items }) => (
            <div key={section} style={{ marginBottom: 24 }}>
              <div style={{
                padding: "0 24px",
                fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 500,
                letterSpacing: "0.16em", textTransform: "uppercase",
                color: "var(--muted)", marginBottom: 2,
              }}>
                {section}
              </div>
              {items.map(({ key, label }) => {
                const active = tab === key;
                return (
                  <button key={key} onClick={() => navigate(key)} style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 24px",
                    fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: active ? 500 : 400,
                    color: active ? "var(--text)" : "var(--muted)",
                    background: active ? "var(--accent-dim)" : "transparent",
                    border: "none",
                    borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                    cursor: "pointer",
                    transition: "color 0.12s, background 0.12s",
                    letterSpacing: "0.01em",
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)"; }}}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          padding: "12px 24px",
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)", letterSpacing: "0.04em" }}>
            lunia.life · studio
          </span>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: "var(--surface-r)", border: "1px solid var(--border-strong)",
              borderRadius: 8, cursor: "pointer",
              width: 44, height: 26, padding: 0,
              display: "flex", alignItems: "center",
              position: "relative", flexShrink: 0,
              transition: "background 0.2s",
            }}
            aria-label="Toggle theme"
          >
            <span style={{
              position: "absolute",
              left: theme === "light" ? 20 : 3,
              width: 20, height: 20,
              borderRadius: 5,
              background: "var(--accent)",
              transition: "left 0.18s ease",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10,
            }}>
              {theme === "light" ? "☀" : "◑"}
            </span>
          </button>
        </div>
      </aside>

      {/* ── Mobile toggle ── */}
      <button
        className="lunia-mobile-toggle"
        onClick={() => setMobileNavOpen(v => !v)}
        style={{
          display: "none", position: "fixed", top: 16, left: 16, zIndex: 101,
          width: 36, height: 36, alignItems: "center", justifyContent: "center",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 7, cursor: "pointer",
        }}
        aria-label="Menu"
      >
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round">
          <line x1="0" y1="1"  x2="15" y2="1"/>
          <line x1="0" y1="5.5" x2="15" y2="5.5"/>
          <line x1="0" y1="10" x2="15" y2="10"/>
        </svg>
      </button>

      {/* ── Main ── */}
      <main className="lunia-main" style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
        {tab === "home" && (
          <HomeView
            onNewScript={() => navigate("generate")}
            onNewCarousel={() => navigate("carousel")}
            onOpenScript={openEditor}
            onOpenCarousel={(c) => { if (c) setPendingCarousel(c); navigate("carousel"); }}
          />
        )}
        {tab === "generate"  && <GenerateView onOpenEditor={openEditor} />}
        {tab === "editor"    && <EditorView script={activeScript} onUpdate={handleScriptUpdate} onOpenEditor={openEditor} />}
        {tab === "library"   && <LibraryView onOpen={(s) => { setActiveScript(s); setTab("editor"); }} />}
        {tab === "carousel"  && <CarouselView initialCarousel={pendingCarousel} onCarouselLoaded={() => setPendingCarousel(null)} />}
        {tab === "batch"     && <BatchView />}
        {tab === "subjects"  && <SubjectsView />}
        {tab === "carousel-library" && (
          <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 40px 80px" }}>
            <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--border)" }}>
              <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>Carousel Library</h1>
            </div>
            <CarouselLibraryView onOpen={(c) => { setPendingCarousel(c); setTab("carousel"); }} />
          </div>
        )}
        {tab === "email" && <EmailBuilderView onConvertToCarousel={handleEmailToCarousel} onSaved={() => navigate("email-library")} />}
        {tab === "email-subjects" && <EmailSubjectsView />}
        {tab === "email-library" && (
          <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 40px 80px" }}>
            <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--border)" }}>
              <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>Email Swipe Library</h1>
            </div>
            <EmailLibraryView />
          </div>
        )}
        {tab === "video"         && <VideoView />}
        {tab === "video-library" && <VideoLibraryView />}
        {tab === "video-assets"  && <VideoAssetsView />}
        {tab === "analytics" && <DashboardView />}
      </main>
    </div>
  );
}
