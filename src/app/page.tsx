"use client";
import { useState, useEffect } from "react";
import GenerateView from "@/components/GenerateView";
import EditorView from "@/components/EditorView";
import LibraryView from "@/components/LibraryView";
import CarouselView from "@/components/CarouselView";
import BatchView from "@/components/BatchView";
import CalendarView from "@/components/CalendarView";
import AssetsView from "@/components/AssetsView";
import SubjectsView from "@/components/SubjectsView";
import HomeView from "@/components/HomeView";
import AdsView from "@/components/AdsView";
import { Script } from "@/lib/types";
import { getLibrary, saveScript } from "@/lib/storage";

type Tab = "home" | "generate" | "editor" | "library" | "carousel" | "batch" | "assets" | "subjects" | "calendar" | "ads";
type Product = "home" | "script" | "carousel" | "ads";

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
      { key: "subjects",  product: "carousel", label: "Subjects" },
      { key: "assets",    product: "carousel", label: "Assets"   },
    ],
  },
  {
    section: "Ads",
    items: [
      { key: "ads",      product: "ads",  label: "Generate"  },
      { key: "calendar", product: "home", label: "Calendar"  },
    ],
  },
];

export default function Page() {
  const [tab, setTab]               = useState<Tab>("home");
  const [activeScript, setActiveScript] = useState<Script | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
              fontSize: 11, fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase",
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
                fontFamily: "var(--font-ui)", fontSize: 9.5, fontWeight: 700,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "var(--subtle)", marginBottom: 4,
              }}>
                {section}
              </div>
              {items.map(({ key, label }) => {
                const active = tab === key;
                return (
                  <button key={key} onClick={() => navigate(key)} style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "7px 24px",
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
          padding: "14px 24px",
          borderTop: "1px solid var(--border)",
          fontFamily: "var(--font-mono)", fontSize: 10,
          color: "var(--subtle)", letterSpacing: "0.04em",
        }}>
          lunia.life · studio
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
            onOpenCarousel={() => navigate("carousel")}
          />
        )}
        {tab === "generate"  && <GenerateView onOpenEditor={openEditor} />}
        {tab === "editor"    && <EditorView script={activeScript} onUpdate={handleScriptUpdate} />}
        {tab === "library"   && <LibraryView onOpen={(s) => { setActiveScript(s); setTab("editor"); }} />}
        {tab === "carousel"  && <CarouselView />}
        {tab === "batch"     && <BatchView />}
        {tab === "subjects"  && <SubjectsView />}
        {tab === "assets"    && <AssetsView />}
        {tab === "calendar"  && <CalendarView onNewCarousel={() => navigate("carousel")} onNewScript={() => navigate("generate")} />}
        {tab === "ads"       && <AdsView />}
      </main>
    </div>
  );
}
