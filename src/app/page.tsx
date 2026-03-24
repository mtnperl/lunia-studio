"use client";
import { useState, useEffect } from "react";
import GenerateView from "@/components/GenerateView";
import EditorView from "@/components/EditorView";
import LibraryView from "@/components/LibraryView";
import CarouselView from "@/components/CarouselView";
import AssetsView from "@/components/AssetsView";
import SubjectsView from "@/components/SubjectsView";
import HomeView from "@/components/HomeView";
import { Script } from "@/lib/types";
import { getLibrary, saveScript } from "@/lib/storage";

type Tab = "home" | "generate" | "editor" | "library" | "carousel" | "assets" | "subjects";
type Product = "home" | "script" | "carousel";

function LuniaLogoMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/lunia-logo.jpg" alt="Lunia Life" style={{ height: 72, width: "auto", display: "block" }} />
  );
}

export default function Page() {
  const [tab, setTab] = useState<Tab>("home");
  const [product, setProduct] = useState<Product>("home");
  const [activeScript, setActiveScript] = useState<Script | null>(null);
  const [scriptCount, setScriptCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => { getLibrary().then((lib) => setScriptCount(lib.length)).catch(() => {}); }, [tab]);

  function openEditor(script: Script) {
    setActiveScript(script);
    setTab("editor");
    setProduct("script");
    setMobileNavOpen(false);
  }

  function handleScriptUpdate(s: Script) {
    setActiveScript(s);
    saveScript(s);
    getLibrary().then((lib) => setScriptCount(lib.length)).catch(() => {});
  }

  function switchProduct(p: Product) {
    setProduct(p);
    if (p === "home") setTab("home");
    else if (p === "script") setTab("generate");
    else if (p === "carousel") setTab("carousel");
    setMobileNavOpen(false);
  }

  function switchTab(t: Tab) {
    setTab(t);
    setMobileNavOpen(false);
  }

  const scriptTabs: { key: Tab; label: string }[] = [
    { key: "generate", label: "Generate" },
    { key: "editor", label: "Editor" },
    { key: "library", label: "Library" },
  ];

  const carouselTabs: { key: Tab; label: string }[] = [
    { key: "carousel", label: "Builder" },
    { key: "subjects", label: "Subjects" },
    { key: "assets", label: "Assets" },
  ];

  const activeTabs = product === "script" ? scriptTabs : product === "carousel" ? carouselTabs : [];

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
        {/* Logo — always links to home */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, cursor: "pointer" }}
          onClick={() => switchProduct("home")}
        >
          <LuniaLogoMark />
          <span style={{ fontWeight: 600, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Studio</span>
        </div>

        {/* Desktop nav */}
        <nav className="lunia-nav-desktop" style={{ display: "flex", alignItems: "center", gap: 0, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          {/* Product switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginRight: 8 }}>
            {([
              { key: "script" as Product, label: "Script" },
              { key: "carousel" as Product, label: "Carousel" },
            ]).map(p => (
              <button key={p.key} onClick={() => switchProduct(p.key)} style={{
                padding: "5px 12px", fontSize: 13, fontWeight: 600,
                background: product === p.key ? "var(--text)" : "transparent",
                color: product === p.key ? "var(--bg)" : "var(--muted)",
                border: "1px solid",
                borderColor: product === p.key ? "var(--text)" : "transparent",
                borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.12s",
              }}>{p.label}</button>
            ))}
          </div>

          {/* Sub-tabs for active product */}
          {activeTabs.length > 0 && (
            <>
              <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 8px" }} />
              {activeTabs.map((t) => (
                <button key={t.key} onClick={() => switchTab(t.key)} style={{
                  padding: "6px 12px", fontSize: 13,
                  fontWeight: tab === t.key ? 600 : 400,
                  background: "transparent",
                  color: tab === t.key ? "var(--text)" : "var(--muted)",
                  border: "none",
                  borderBottom: tab === t.key ? "2px solid #1e7a8a" : "2px solid transparent",
                  borderRadius: 0,
                  cursor: "pointer", fontFamily: "inherit",
                  height: 52, transition: "color 0.15s, border-color 0.15s",
                }}>{t.label}</button>
              ))}
            </>
          )}
        </nav>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="lunia-script-count" style={{ fontSize: 12, color: "var(--subtle)" }}>{scriptCount} scripts</span>
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
          <div style={{ padding: "8px 16px", fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Script</div>
          {scriptTabs.map((t) => (
            <button key={t.key} onClick={() => { setProduct("script"); switchTab(t.key); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "12px 24px", fontSize: 15, fontWeight: tab === t.key ? 700 : 400,
              background: tab === t.key ? "rgba(30,122,138,0.06)" : "transparent",
              color: tab === t.key ? "#1e7a8a" : "var(--text)",
              border: "none", borderBottom: "1px solid var(--border)",
              cursor: "pointer", fontFamily: "inherit",
            }}>{t.label}</button>
          ))}
          <div style={{ padding: "8px 16px", fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Carousel</div>
          {carouselTabs.map((t) => (
            <button key={t.key} onClick={() => { setProduct("carousel"); switchTab(t.key); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "12px 24px", fontSize: 15, fontWeight: tab === t.key ? 700 : 400,
              background: tab === t.key ? "rgba(30,122,138,0.06)" : "transparent",
              color: tab === t.key ? "#1e7a8a" : "var(--text)",
              border: "none", borderBottom: "1px solid var(--border)",
              cursor: "pointer", fontFamily: "inherit",
            }}>{t.label}</button>
          ))}
        </div>
      )}

      <main style={{ flex: 1 }}>
        {tab === "home" && (
          <HomeView
            onNewScript={() => switchProduct("script")}
            onNewCarousel={() => switchProduct("carousel")}
            onOpenScript={openEditor}
            onOpenCarousel={() => switchProduct("carousel")}
          />
        )}
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
