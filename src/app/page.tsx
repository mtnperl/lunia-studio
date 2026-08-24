"use client";
import { useState, useEffect } from "react";
import GenerateView from "@/components/GenerateView";
import EditorView from "@/components/EditorView";
import LibraryView from "@/components/LibraryView";
import CarouselViewV2 from "@/components/CarouselViewV2";
import CampaignView from "@/components/CampaignView";
import CampaignLibraryView from "@/components/CampaignLibraryView";
import BatchView from "@/components/BatchView";
import { PageHeader } from "@/components/ui/PageHeader";
import CarouselLibraryView from "@/components/CarouselLibraryView";
import SubjectsView from "@/components/SubjectsView";
import HomeView from "@/components/HomeView";
import BusinessView from "@/components/business/BusinessView";
import VideoView from "@/components/VideoView";
import VideoAssetsView from "@/components/VideoAssetsView";
import AssetsView from "@/components/AssetsView";
import VideoLibraryView from "@/components/VideoLibraryView";
import EmailReviewView from "@/components/email-review/EmailReviewView";
import EmailFlowsLibrary from "@/components/email-review/EmailFlowsLibrary";
import UGCTrackerView from "@/components/ugc/UGCTrackerView";
import UGCBriefsView from "@/components/ugc/UGCBriefsView";
import {
  IconHome, IconSparkles, IconPencil, IconFolder, IconGrid, IconStack,
  IconHash, IconMail, IconDocument, IconBoard, IconTrendingUp,
  IconVideo, IconImage, IconSearch, IconPlus, IconChevronDown,
  IconSun, IconMoon,
} from "@/components/Icons";
import { Script } from "@/lib/types";
import { getLibrary, saveScript } from "@/lib/storage";

// Feature flag: the Video builder is hidden from the nav. Flip to true to restore.
const SHOW_VIDEO = false;

type Tab = "home" | "generate" | "editor" | "library" | "carousel-v2" | "carousel-library" | "batch" | "subjects" | "email-reviews" | "email-flows" | "campaign" | "campaign-library" | "video" | "video-assets" | "video-library" | "ugc" | "ugc-briefs" | "assets" | "business-overview" | "business-pnl" | "business-unit-economics" | "business-cash" | "business-assumptions";
type Product = "home" | "script" | "carousel" | "ugc" | "video" | "business" | "assets";

/**
 * Theme switching.
 *
 * This used to be a second copy of the whole token table, written onto
 * <html> as inline styles — with a comment asking whoever touched it to "keep
 * in lockstep with globals.css". Inline styles beat every stylesheet rule, so
 * the copy always won, and any token added to globals.css simply never
 * changed between themes: it looked like it worked in light mode and silently
 * stayed light in dark mode.
 *
 * globals.css already carries complete [data-theme="light"] and
 * [data-theme="dark"] blocks. Setting the attribute is all this needs to do,
 * and a token now only has to be declared once to work everywhere.
 */
function applyThemeVars(t: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", t);
}

const NAV_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  home: IconHome,
  generate: IconSparkles,
  editor: IconPencil,
  library: IconFolder,
  "carousel-v2": IconGrid,
  batch: IconStack,
  subjects: IconHash,
  "carousel-library": IconFolder,
  "email-reviews": IconSparkles,
  "email-flows": IconBoard,
  campaign: IconSparkles,
  "campaign-library": IconFolder,
  video: IconVideo,
  "video-library": IconFolder,
  "video-assets": IconImage,
  assets: IconImage,
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
  "carousel-v2": "Carousel builder",
  batch: "Batch carousels",
  subjects: "Subjects",
  "carousel-library": "Carousel library",
  "email-reviews": "Email flow reviews",
  "email-flows": "Saved flow reviews",
  campaign: "Campaign builder",
  "campaign-library": "Campaign library",
  video: "Video builder",
  "video-library": "Video library",
  "video-assets": "Video assets",
  assets: "Asset library",
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
      { key: "carousel-v2", product: "carousel", label: "Builder" },
      { key: "batch",       product: "carousel", label: "Batch"    },
      { key: "subjects",          product: "carousel", label: "Subjects" },
      { key: "carousel-library", product: "carousel", label: "Library"  },
    ],
  },
  {
    section: "Email",
    items: [
      { key: "campaign",         product: "carousel", label: "Campaign builder" },
      { key: "campaign-library", product: "carousel", label: "Campaign library" },
      { key: "email-reviews",    product: "carousel", label: "Flow reviews" },
      { key: "email-flows",      product: "carousel", label: "Saved reviews" },
    ],
  },
  {
    section: "Assets",
    items: [
      { key: "assets", product: "assets", label: "Library" },
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

/** The two-pane editing surfaces. Entering one collapses the left menu so the
 *  work gets the width, and hides the scrollbars flanking it; leaving one puts
 *  both back. Libraries and dashboards are not editors — they are lists you
 *  navigate, and navigation is what the menu is for. */
const EDITOR_TABS = new Set<Tab>(["campaign", "carousel-v2", "editor", "video"]);

export default function Page() {
  const [tab, setTab]               = useState<Tab>("home");
  const [activeScript, setActiveScript] = useState<Script | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [pendingCarousel, setPendingCarousel] = useState<import("@/lib/types").SavedCarousel | null>(null);
  const [pendingCampaign, setPendingCampaign] = useState<import("@/lib/types").SavedCampaign | null>(null);
  const [pendingEmailFlow, setPendingEmailFlow] = useState<import("@/lib/types").EmailFlow | null>(null);
  const [pendingReviewId, setPendingReviewId] = useState<string | null>(null);

  // Collapse the menu on ENTERING an editor and restore it on leaving.
  // Deliberately keyed on `tab` alone: the toggle in the top bar then sticks
  // for as long as you stay on that screen, so this sets the default rather
  // than fighting you every render.
  useEffect(() => {
    setNavCollapsed(EDITOR_TABS.has(tab));
  }, [tab]);

  // Same signal, on <html>, so the CSS can drop the scrollbars for the
  // editors and nothing else. Cleaned up on unmount so the class can't
  // outlive the page and quietly hide scrollbars everywhere.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("lunia-editing", EDITOR_TABS.has(tab));
    return () => root.classList.remove("lunia-editing");
  }, [tab]);

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
          /* The drawer IS the menu on mobile, so a collapsed width would just
             make it un-openable. The hamburger already owns show/hide here. */
          .lunia-sidebar.collapsed { width: 240px !important; }
          .lunia-nav-toggle { display: none !important; }
        }
        @media (min-width: 701px) {
          .lunia-mobile-toggle { display: none !important; }
          .lunia-mobile-overlay { display: none !important; }
        }
        .lunia-nav-toggle:hover { background: var(--surface-h) !important; border-color: var(--border-strong) !important; color: var(--text) !important; }
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
      <aside
        className={`lunia-sidebar${mobileNavOpen ? " open" : ""}${navCollapsed ? " collapsed" : ""}`}
        // `inert` while collapsed: a 0px-wide menu is still in the DOM, and
        // without this its links stay tabbable and screen-reader visible —
        // a menu you cannot see but can still land on.
        inert={navCollapsed || undefined}
        style={{
          // `overflow: hidden` below is what lets this reach 0: it makes the
          // flex item's `min-width: auto` floor resolve to zero instead of the
          // nav's min-content width.
          width: navCollapsed ? 0 : 240, flexShrink: 0,
          background: "var(--surface)", borderRight: navCollapsed ? "none" : "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          position: "sticky", top: 0, height: "100vh",
          overflow: "hidden",
          // Matches DESIGN.md's 220ms panel timing.
          transition: "width 0.22s ease-out",
        }}
      >
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
          <span
            style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--subtle)" }}
            title={`Build ${process.env.NEXT_PUBLIC_BUILD_SHA}`}
          >
            lunia.life{" "}
            <span style={{ fontFamily: "var(--font-mono)", opacity: 0.7 }}>
              {process.env.NEXT_PUBLIC_BUILD_SHA}
            </span>
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
            {/* Menu toggle. Always present, not only while collapsed: a
                control that appears where the thing it undoes used to be is
                one you have to hunt for. Lives in the top bar because the top
                bar is sticky — with the menu hidden and the editor 4,000px
                tall, an affordance anywhere else would scroll away. */}
            <button
              className="lunia-nav-toggle"
              onClick={() => setNavCollapsed(v => !v)}
              title={navCollapsed ? "Show the menu" : "Hide the menu and give the editor the width"}
              aria-label={navCollapsed ? "Show menu" : "Hide menu"}
              aria-expanded={!navCollapsed}
              style={{
                width: 28, height: 28, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "transparent", color: "var(--muted)",
                border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                cursor: "pointer", padding: 0,
                transition: "background 130ms ease, border-color 130ms ease, color 130ms ease",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
                   stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1.2" y="2.2" width="12.6" height="10.6" rx="2" />
                <line x1="5.9" y1="2.2" x2="5.9" y2="12.8" />
                {/* Chevron in the wide half, pointing the way the click goes. */}
                <polyline points={navCollapsed ? "9,5.9 11,7.5 9,9.1" : "11,5.9 9,7.5 11,9.1"} />
              </svg>
            </button>
            {/* Wayfinding, not a title. This used to be an 18px semibold
                heading competing with the view's own heading directly below
                it — two quiet titles and no display tier anywhere. It is now
                a quiet label that earns its keep when you have scrolled past
                the real title, and the view owns the loud one. */}
            <span style={{
              fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600,
              margin: 0, color: "var(--muted)", letterSpacing: "0.08em",
              textTransform: "uppercase",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {TAB_TITLES[tab] ?? "Studio"}
            </span>
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
        {tab === "carousel-v2" && <CarouselViewV2 initialCarousel={pendingCarousel} onCarouselLoaded={() => setPendingCarousel(null)} />}
        {tab === "batch"     && <BatchView />}
        {tab === "subjects"  && <SubjectsView />}
        {tab === "carousel-library" && (
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 40px 80px" }}>
            <PageHeader
              title="Carousel library"
              description="Everything you have built. Open one to keep editing, or copy its caption straight to Instagram."
            />
            <CarouselLibraryView
              onOpen={(c) => { setPendingCarousel(c); setTab("carousel-v2"); }}
              onConvertToCampaign={(c) => { setPendingCarousel(c); setTab("campaign"); }}
            />
          </div>
        )}
        {tab === "campaign" && (
          <CampaignView
            initialCampaign={pendingCampaign}
            initialCarousel={pendingCarousel}
            onCampaignLoaded={() => setPendingCampaign(null)}
            onCarouselConsumed={() => setPendingCarousel(null)}
          />
        )}
        {tab === "campaign-library" && (
          <CampaignLibraryView onOpen={(c) => { setPendingCampaign(c); setTab("campaign"); }} />
        )}
        {tab === "email-reviews" && (
          <EmailReviewView
            initialFlow={pendingEmailFlow}
            initialReviewId={pendingReviewId}
            initialCarousel={pendingCarousel}
            onConsumed={() => { setPendingEmailFlow(null); setPendingReviewId(null); setPendingCarousel(null); }}
          />
        )}
        {tab === "email-flows" && (
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 32px 80px" }}>
            <EmailFlowsLibrary
              onPickReview={(reviewId) => { setPendingReviewId(reviewId); setPendingEmailFlow(null); setTab("email-reviews"); }}
              onNewReview={() => { setPendingReviewId(null); setPendingEmailFlow(null); setTab("email-reviews"); }}
            />
          </div>
        )}
        {tab === "video"         && <VideoView />}
        {tab === "video-library" && <VideoLibraryView />}
        {tab === "video-assets"  && <VideoAssetsView />}
        {tab === "assets"        && <AssetsView />}
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
