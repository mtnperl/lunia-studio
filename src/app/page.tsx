"use client";
import { useState, useEffect } from "react";
import GenerateView from "@/components/GenerateView";
import EditorView from "@/components/EditorView";
import LibraryView from "@/components/LibraryView";
import CarouselView from "@/components/CarouselView";
import AssetsView from "@/components/AssetsView";
import SubjectsView from "@/components/SubjectsView";
import { Script } from "@/lib/types";
import { getLibrary, saveScript } from "@/lib/storage";

type Tab = "generate" | "editor" | "library" | "carousel" | "assets" | "subjects";

function LuniaLogoMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/lunia-logo.jpg" alt="Lunia Life" style={{ height: 36, width: "auto", display: "block" }} />
  );
}

export default function Page() {
  const [tab, setTab] = useState<Tab>("generate");
  const [activeScript, setActiveScript] = useState<Script | null>(null);
  const [scriptCount, setScriptCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => { getLibrary().then((lib) => setScriptCount(lib.length)).catch(() => {}); }, [tab]);

  function openEditor(script: Script) { setActiveScript(script); setTab("editor"); setMobileNavOpen(false); }
  function handleScriptUpdate(s: Script) { setActiveScript(s); saveScript(s); getLibrary().then((lib) => setScriptCount(lib.length)).catch(() => {}); }

  const tabs: { key: Tab; label: string }[] = [
    { key: "generate", label: "Generate" },
    { key: "editor", label: "Editor" },
    { key: "library", label: "Library" },
    { key: "carousel", label: "Carousel" },
    { key: "subjects", label: "Subjects" },
    { key: "assets", label: "Assets" },
  ];

  function switchTab(t: Tab) { setTab(t); setMobileNavOpen(false); }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        @media (max-width: 680px) {
          .lunia-nav-desktop { display: none !important; }
          .lunia-nav-mobile-btn { display: flex !important; }
          .lunia-script-count { display: none !important; }
        }
        @media (min-width: 681px) {
          .lunia-nav-mobile-btn { display: none !important; }
          .lunia-mobile-menu { display: none !important; }
        }
      `}</style>

      {/* Nav */}
      <header style={{
        borderBottom: "1px solid var(--border)", background: "var(--bg)",
        position: "sticky", top: 0, zIndex: 50,
        padding: "0 24px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <LuniaLogoMark />
          <span style={{ fontWeight: 600, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Studio</span>
        </div>

        {/* Desktop nav — centered */}
        <nav className="lunia-nav-desktop" style={{ display: "flex", gap: 0, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => switchTab(t.key)} style={{
              padding: "6px 14px", fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
              background: "transparent",
              color: tab === t.key ? "var(--text)" : "var(--muted)",
              border: "none",
              borderBottom: tab === t.key ? "2px solid #1e7a8a" : "2px solid transparent",
              borderRadius: 0,
              cursor: "pointer",
              fontFamily: "inherit",
              height: 52,
              transition: "color 0.15s, border-color 0.15s",
            }}>{t.label}</button>
          ))}
        </nav>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="lunia-script-count" style={{ fontSize: 12, color: "var(--subtle)" }}>{scriptCount} scripts</span>
          {/* Mobile hamburger */}
          <button
            className="lunia-nav-mobile-btn"
            onClick={() => setMobileNavOpen((v) => !v)}
            style={{
              display: "none", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, background: "transparent",
              border: "1px solid var(--border)", borderRadius: 7,
              cursor: "pointer", flexShrink: 0,
            }}
            aria-label="Menu"
          >
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="0" y1="1" x2="16" y2="1"/>
              <line x1="0" y1="6" x2="16" y2="6"/>
              <line x1="0" y1="11" x2="16" y2="11"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile nav dropdown */}
      {mobileNavOpen && (
        <div className="lunia-mobile-menu" style={{
          position: "fixed", top: 52, left: 0, right: 0, zIndex: 49,
          background: "var(--bg)", borderBottom: "1px solid var(--border)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => switchTab(t.key)} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "14px 24px", fontSize: 15, fontWeight: tab === t.key ? 700 : 400,
              background: tab === t.key ? "rgba(30,122,138,0.06)" : "transparent",
              color: tab === t.key ? "#1e7a8a" : "var(--text)",
              border: "none", borderBottom: "1px solid var(--border)",
              cursor: "pointer", fontFamily: "inherit",
            }}>{t.label}</button>
          ))}
        </div>
      )}

      <main style={{ flex: 1 }}>
        {tab === "generate" && <GenerateView onOpenEditor={openEditor} />}
        {tab === "editor" && <EditorView script={activeScript} onUpdate={handleScriptUpdate} />}
        {tab === "library" && <LibraryView onOpen={(s) => { setActiveScript(s); setTab("editor"); }} />}
        {tab === "carousel" && <CarouselView />}
        {tab === "subjects" && <SubjectsView />}
        {tab === "assets" && <AssetsView />}
      </main>
    </div>
  );
}
