"use client";
import { useState, useEffect } from "react";
import GenerateView from "@/components/GenerateView";
import EditorView from "@/components/EditorView";
import LibraryView from "@/components/LibraryView";
import CarouselView from "@/components/CarouselView";
import CarouselViewV2 from "@/components/CarouselViewV2";
import BatchView from "@/components/BatchView";
import CarouselLibraryView from "@/components/CarouselLibraryView";
import SubjectsView from "@/components/SubjectsView";
import HomeView from "@/components/HomeView";
import BusinessView from "@/components/business/BusinessView";
import VideoView from "@/components/VideoView";
import VideoAssetsView from "@/components/VideoAssetsView";
import VideoLibraryView from "@/components/VideoLibraryView";
import EmailLibraryView from "@/components/EmailLibraryView";
import EmailSubjectsView from "@/components/EmailSubjectsView";
import EmailPanelBuilderView from "@/components/email/EmailPanelBuilderView";
import UGCTrackerView from "@/components/ugc/UGCTrackerView";
import UGCBriefsView from "@/components/ugc/UGCBriefsView";
import {
  IconHome, IconSparkles, IconPencil, IconFolder, IconGrid, IconStack,
  IconHash, IconMail, IconDocument, IconBoard, IconTrendingUp,
  IconVideo, IconImage, IconSearch, IconPlus, IconChevronDown,
  IconSun, IconMoon,
} from "@/components/Icons";
import { Script, EmailSection } from "@/lib/types";
import { getLibrary, saveScript } from "@/lib/storage";

// Feature flag: the Video builder is hidden from the nav. Flip to true to restore.
const SHOW_VIDEO = false;

type Tab = "home" | "generate" | "editor" | "library" | "carousel" | "carousel-v2" | "carousel-library" | "batch" | "subjects" | "email-library" | "email-subjects" | "email-panels" | "video" | "video-assets" | "video-library" | "ugc" | "ugc-briefs" | "business-overview" | "business-pnl" | "business-unit-economics" | "business-cash" | "business-assumptions";
type Product = "home" | "script" | "carousel" | "ugc" | "video" | "business";

const LIGHT_VARS: Record<string, string> = {
  "--bg": "#f6f7fb", "--surface": "#ffffff", "--surface-r": "#f5f6f8",
  "--surface-h": "#eef0f7", "--text": "#323338", "--muted": "#676879",
  "--subtle": "#9699a6", "--accent": "#0073ea", "--accent-hover": "#0060b9",
  "--accent-dim": "rgba(0, 115, 234, 0.10)", "--accent-mid": "rgba(0, 115, 234, 0.22)",
  "--border": "#d0d4e4", "--border-strong": "#c3c6d4",
  "--success": "#00c875", "--warning": "#fdab3d", "--error": "#e2445c",
};
const DARK_VARS: Record<string, string> = {
  "--bg": "#181b34", "--surface": "#1f2048", "--surface-r": "#292b50",
  "--surface-h": "#323464", "--text": "#e7e8f5", "--muted": "#a7abc7",
  "--subtle": "#6a6e93", "--accent": "#579bfc", "--accent-hover": "#4a88e8",
  "--accent-dim": "rgba(87, 155, 252, 0.14)", "--accent-mid": "rgba(87, 155, 252, 0.30)",
  "--border": "#3f4174", "--border-strong": "#50539a",
  "--success": "#00c875", "--warning": "#fdab3d", "--error": "#e2445c",
};
function applyThemeVars(t: "dark" | "light") {
  const vars = t === "light" ? LIGHT_VARS : DARK_VARS;
  const el = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
}

const NAV_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  home: IconHome,
  generate: IconSparkles,
  editor: IconPencil,
  library: IconFolder,
  carousel: IconGrid,
  "carousel-v2": IconSparkles,
  batch: IconStack,
  subjects: IconHash,
  "carousel-library": IconFolder,
  "email-panels": IconMail,
  "email-subjects": IconHash,
  "email-library": IconFolder,
  video: IconVideo,
  "video-library": IconFolder,
  "video-assets": IconImage,
  ugc: IconBoard,
  "ugc-briefs": IconDocument,
  "business-overview": IconTrendingUp,
  "business-pnl": IconDocument,
  "business-unit-economics": IconStack,
  "business-cash": IconBoard,
  "business-assumptions": IconHash,
};

const TAB_TITLES: Record<string, string> = {
  home: "Home",
  generate: "Generate script",
  editor: "Script editor",
  library: "Script library",
  carousel: "Carousel builder",
  "carousel-v2": "Carousel builder · v2 (beta)",
  batch: "Batch carousels",
  subjects: "Subjects",
  "carousel-library": "Carousel library",
  "email-panels": "Email panels",
  "email-subjects": "Email subjects",
  "email-library": "Email library",
  video: "Video builder",
  "video-library": "Video library",
  "video-assets": "Video assets",
  ugc: "UGC tracker",
  "ugc-briefs": "UGC briefs",
  "business-overview": "Business — Overview",
  "business-pnl": "Business — P&L",
  "business-unit-economics": "Business — Unit Economics",
  "business-cash": "Business — Cash & Expenses",
  "business-assumptions": "Business — Assumptions",
};

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
      { key: "carousel",    product: "carousel", label: "Builder"  },
      { key: "carousel-v2", product: "carousel", label: "Builder v2 (beta)" },
      { key: "batch",       product: "carousel", label: "Batch"    },
      { key: "subjects",          product: "carousel", label: "Subjects" },
      { key: "carousel-library", product: "carousel", label: "Library"  },
    ],
  },
  {
    section: "Email",
    items: [
      { key: "email-panels",   product: "carousel", label: "Panels"   },
      { key: "email-subjects", product: "carousel", label: "Subjects" },
      { key: "email-library",  product: "carousel", label: "Library"  },
    ],
  },
  ...(SHOW_VIDEO ? [{
    section: "Video",
    items: [
      { key: "video" as Tab,         product: "video" as Product, label: "Builder" },
      { key: "video-library" as Tab, product: "video" as Product, label: "Library" },
      { key: "video-assets" as Tab,  product: "video" as Product, label: "Assets"  },
    ],
  }] : []),
  {
    section: "UGC",
    items: [
      { key: "ugc", product: "ugc", label: "Tracker" },
      { key: "ugc-briefs", product: "ugc", label: "Briefs" },
    ],
  },
  {
    section: "Business",
    items: [
      { key: "business-overview",        product: "business", label: "Overview"        },
      { key: "business-pnl",             product: "business", label: "P&L"             },
      { key: "business-unit-economics",  product: "business", label: "Unit Economics"  },
      { key: "business-cash",            product: "business", label: "Cash & Expenses" },
      { key: "business-assumptions",     product: "business", label: "Assumptions"     },
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

  // Deep-link: `?openScript=<id>` from the share page lands here. Pull that
  // script and drop the user straight into the editor for it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const scriptId = params.get("openScript");
    if (!scriptId) return;
    fetch(`/api/scripts/${scriptId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s: Script | null) => {
        if (!s) return;
        setActiveScript(s);
        setTab("editor");
      })
      .catch(() => {})
      .finally(() => {
        // Drop the query param so a refresh doesn't reload the same script
        const url = new URL(window.location.href);
        url.searchParams.delete("openScript");
        window.history.replaceState({}, "", url.toString());
      });
  }, []);

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
    navigate("carousel-v2");
  }

  const [navQuery, setNavQuery] = useState("");
  const filteredNav = navQuery.trim()
    ? NAV.map(({ section, items }) => ({
        section,
        items: items.filter(i =>
          i.label.toLowerCase().includes(navQuery.trim().toLowerCase()) ||
          section.toLowerCase().includes(navQuery.trim().toLowerCase())
        ),
      })).filter(s => s.items.length > 0)
    : NAV;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <style>{`
        @media (max-width: 700px) {
          .lunia-sidebar { transform: translateX(-100%); transition: transform 0.22s ease; position: fixed !important; z-index: 100; }
          .lunia-sidebar.open { transform: translateX(0); }
          .lunia-mobile-toggle { display: flex !important; }
          .lunia-main { padding-left: 0 !important; }
          .lunia-topbar-title { padding-left: 52px !important; }
        }
        @media (min-width: 701px) {
          .lunia-mobile-toggle { display: none !important; }
          .lunia-mobile-overlay { display: none !important; }
        }
        .lunia-nav-row:hover:not(.active) { background: var(--surface-h) !important; color: var(--text) !important; }
        .lunia-nav-row:hover:not(.active) .lunia-nav-icon { color: var(--text) !important; }
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
        {/* Workspace header */}
        <div style={{
          padding: "14px 12px",
          borderBottom: "1px solid var(--border)",
          cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10,
        }} onClick={() => navigate("home")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lunia-logo.png" alt="Lunia Life" style={{
            height: 32, width: 32, borderRadius: 6, objectFit: "cover",
            boxShadow: "var(--shadow-sm)",
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
              color: "var(--text)", letterSpacing: 0, lineHeight: 1.2,
            }}>Lunia Studio</div>
            <div style={{
              fontFamily: "var(--font-ui)", fontSize: 11,
              color: "var(--muted)", lineHeight: 1.3,
            }}>Main workspace</div>
          </div>
          <IconChevronDown size={14} />
        </div>

        {/* Search + Create */}
        <div style={{ padding: "10px 12px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              color: "var(--subtle)", pointerEvents: "none",
              display: "flex", alignItems: "center",
            }}>
              <IconSearch size={14} />
            </span>
            <input
              value={navQuery}
              onChange={e => setNavQuery(e.target.value)}
              placeholder="Search"
              style={{
                width: "100%",
                padding: "6px 10px 6px 32px",
                fontSize: 13,
                background: "var(--surface-r)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-md)",
                color: "var(--text)",
              }}
            />
          </div>
          <button
            onClick={() => navigate("generate")}
            className="btn"
            style={{ width: "100%", justifyContent: "center", padding: "8px 12px" }}
          >
            <IconPlus size={15} />
            <span>Create</span>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "6px 8px 16px", overflowY: "auto" }}>
          {filteredNav.map(({ section, items }) => (
            <div key={section} style={{ marginBottom: 14 }}>
              <div style={{
                padding: "8px 12px 4px",
                fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "var(--subtle)",
              }}>
                {section}
              </div>
              {items.map(({ key, label }) => {
                const active = tab === key;
                const Icon = NAV_ICONS[key] ?? IconFolder;
                return (
                  <button
                    key={key}
                    onClick={() => navigate(key)}
                    className={`lunia-nav-row${active ? " active" : ""}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", textAlign: "left",
                      padding: "7px 12px",
                      marginBottom: 1,
                      fontFamily: "var(--font-ui)", fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      color: active ? "var(--accent)" : "var(--muted)",
                      background: active ? "var(--accent-dim)" : "transparent",
                      border: "none",
                      borderRadius: "var(--r-md)",
                      cursor: "pointer",
                      transition: "color 0.12s, background 0.12s",
                    }}
                  >
                    <span className="lunia-nav-icon" style={{
                      display: "inline-flex",
                      color: active ? "var(--accent)" : "var(--subtle)",
                      flexShrink: 0,
                    }}>
                      <Icon size={16} />
                    </span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {filteredNav.length === 0 && (
            <div style={{
              padding: "20px 16px", textAlign: "center",
              fontSize: 12, color: "var(--subtle)",
            }}>
              No matches for &ldquo;{navQuery}&rdquo;
            </div>
          )}
        </nav>

        {/* Footer */}
        <div style={{
          padding: "10px 12px",
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--subtle)" }}>
            lunia.life
          </span>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: "transparent", border: "1px solid var(--border)",
              borderRadius: "var(--r-md)", cursor: "pointer",
              width: 28, height: 28, padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--muted)",
              transition: "background 0.12s, color 0.12s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-h)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <IconMoon size={15} /> : <IconSun size={15} />}
          </button>
        </div>
      </aside>

      {/* ── Mobile toggle ── */}
      <button
        className="lunia-mobile-toggle"
        onClick={() => setMobileNavOpen(v => !v)}
        style={{
          display: "none", position: "fixed", top: 14, left: 14, zIndex: 101,
          width: 36, height: 36, alignItems: "center", justifyContent: "center",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r-md)", cursor: "pointer",
          boxShadow: "var(--shadow-sm)",
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
      <main className="lunia-main" style={{ flex: 1, minWidth: 0, overflowX: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "0 24px",
          height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 16,
        }}>
          <div className="lunia-topbar-title" style={{
            display: "flex", alignItems: "center", gap: 10, minWidth: 0,
          }}>
            <h1 style={{
              fontFamily: "var(--font-ui)", fontSize: 18, fontWeight: 600,
              margin: 0, color: "var(--text)", letterSpacing: "-0.01em",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {TAB_TITLES[tab] ?? "Studio"}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "var(--accent)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600,
              fontFamily: "var(--font-ui)",
            }} aria-label="Account" title="mtnperl@gmail.com">
              M
            </div>
          </div>
        </div>

        {/* View content */}
        <div style={{ flex: 1, minHeight: 0 }}>
        {tab === "home" && (
          <HomeView
            onNewScript={() => navigate("generate")}
            onNewCarousel={() => navigate("carousel-v2")}
            onOpenScript={openEditor}
            onOpenCarousel={(c) => { if (c) setPendingCarousel(c); navigate("carousel-v2"); }}
          />
        )}
        {tab === "generate"  && <GenerateView onOpenEditor={openEditor} />}
        {tab === "editor"    && <EditorView script={activeScript} onUpdate={handleScriptUpdate} onOpenEditor={openEditor} />}
        {tab === "library"   && <LibraryView onOpen={(s) => { setActiveScript(s); setTab("editor"); }} />}
        {tab === "carousel"  && <CarouselView initialCarousel={pendingCarousel} onCarouselLoaded={() => setPendingCarousel(null)} />}
        {tab === "carousel-v2" && <CarouselViewV2 initialCarousel={pendingCarousel} onCarouselLoaded={() => setPendingCarousel(null)} />}
        {tab === "batch"     && <BatchView />}
        {tab === "subjects"  && <SubjectsView />}
        {tab === "carousel-library" && (
          <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 40px 80px" }}>
            <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--border)" }}>
              <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>Carousel Library</h1>
            </div>
            <CarouselLibraryView onOpen={(c) => { setPendingCarousel(c); setTab("carousel-v2"); }} />
          </div>
        )}
        {tab === "email-panels" && <EmailPanelBuilderView />}
        {tab === "email-subjects" && <EmailSubjectsView />}
        {tab === "email-library" && <EmailPanelBuilderView initialStep="library" />}
        {tab === "video"         && <VideoView />}
        {tab === "video-library" && <VideoLibraryView />}
        {tab === "video-assets"  && <VideoAssetsView />}
        {tab === "ugc" && <UGCTrackerView />}
        {tab === "ugc-briefs" && <UGCBriefsView onBack={() => navigate("home")} />}
        {tab === "business-overview"       && <BusinessView active="overview" />}
        {tab === "business-pnl"            && <BusinessView active="pnl" />}
        {tab === "business-unit-economics" && <BusinessView active="unit-economics" />}
        {tab === "business-cash"           && <BusinessView active="cash" />}
        {tab === "business-assumptions"    && <BusinessView active="assumptions" />}
        </div>
      </main>
    </div>
  );
}
