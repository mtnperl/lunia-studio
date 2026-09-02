"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { AppShell, type RecentDoc } from "@/components/shell/AppShell";
import { isTab, type Tab } from "@/components/shell/nav";
import type { Script, SavedCarousel, SavedCampaign, EmailFlow } from "@/lib/types";
import { getLibrary, saveScript } from "@/lib/storage";

export type OpenDoc = { kind: "carousel" | "email"; id: string };

/** URL for a view or a document. Views live at `/?v=`; documents at `/c/:id`
 *  and `/e/:id`. The app stays one client bundle; the URL is the address. */
function urlFor(tab: Tab, doc?: OpenDoc | null): string {
  if (doc?.kind === "carousel") return `/c/${doc.id}`;
  if (doc?.kind === "email") return `/e/${doc.id}`;
  return tab === "home" ? "/" : `/?v=${tab}`;
}

/** The whole studio. `initialOpen` comes from the /c and /e routes. */
export default function StudioApp({ initialOpen = null, initialTab = "home" }: { initialOpen?: OpenDoc | null; initialTab?: Tab }) {
  const [tab, setTabState] = useState<Tab>(initialOpen ? (initialOpen.kind === "carousel" ? "carousel-v2" : "campaign") : initialTab);
  const [activeScript, setActiveScript] = useState<Script | null>(null);
  const [pendingCarousel, setPendingCarousel] = useState<SavedCarousel | null>(null);
  const [pendingCampaign, setPendingCampaign] = useState<SavedCampaign | null>(null);
  const [pendingEmailFlow, setPendingEmailFlow] = useState<EmailFlow | null>(null);
  const [pendingReviewId, setPendingReviewId] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<OpenDoc | null>(initialOpen);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentDoc[]>([]);

  /* ── URL sync ──────────────────────────────────────────────────────────── */
  const go = useCallback((t: Tab, doc: OpenDoc | null = null, replace = false) => {
    setTabState(t);
    setOpenDoc(doc);
    setLoadError(null);
    const url = urlFor(t, doc);
    if (typeof window !== "undefined" && window.location.pathname + window.location.search !== url) {
      const fn = replace ? "replaceState" : "pushState";
      window.history[fn]({ tab: t, doc }, "", url);
    }
  }, []);

  // `?openScript=` deep link from the share page. The view itself comes from
  // the server through `initialTab`, so there is nothing to read here.
  useEffect(() => {
    if (initialOpen) return;
    const scriptId = new URLSearchParams(window.location.search).get("openScript");
    if (scriptId) {
      fetch(`/api/scripts/${scriptId}`).then((r) => (r.ok ? r.json() : null)).then((s: Script | null) => {
        if (!s) return;
        setActiveScript(s);
        go("editor", null, true);
      }).catch(() => {});
    }
  }, [initialOpen, go]);

  // Back and forward.
  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname;
      const m = path.match(/^\/(c|e)\/([^/]+)/);
      if (m) { const doc: OpenDoc = { kind: m[1] === "c" ? "carousel" : "email", id: m[2] }; setOpenDoc(doc); setTabState(doc.kind === "carousel" ? "carousel-v2" : "campaign"); return; }
      const v = new URLSearchParams(window.location.search).get("v");
      setOpenDoc(null);
      setTabState(isTab(v) ? v : "home");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Load the document the URL names.
  useEffect(() => {
    if (!openDoc) return;
    let cancelled = false;
    const url = openDoc.kind === "carousel" ? `/api/carousel-v2/${openDoc.id}` : `/api/campaign/${openDoc.id}`;
    fetch(url).then(async (r) => {
      if (!r.ok) throw new Error(r.status === 404 ? "This document no longer exists." : "Could not load the document.");
      return r.json();
    }).then((d) => {
      if (cancelled) return;
      if (openDoc.kind === "carousel") setPendingCarousel(d as SavedCarousel); else setPendingCampaign(d as SavedCampaign);
    }).catch((e: Error) => { if (!cancelled) setLoadError(e.message); });
    return () => { cancelled = true; };
  }, [openDoc]);

  useEffect(() => { getLibrary().catch(() => {}); }, [tab]);

  // Recent documents for the palette.
  useEffect(() => {
    Promise.all([
      fetch("/api/carousel/library").then((r) => r.json()).catch(() => []),
      fetch("/api/campaign/library").then((r) => r.json()).catch(() => []),
    ]).then(([cs, es]) => {
      const c: RecentDoc[] = (Array.isArray(cs) ? cs : []).slice(0, 4).map((x: SavedCarousel) => ({ kind: "carousel", id: x.id, title: x.topic }));
      const e: RecentDoc[] = (Array.isArray(es) ? es : []).slice(0, 4).map((x: SavedCampaign) => ({ kind: "email", id: x.id, title: x.content?.subjectLines?.[x.content.selectedSubject] ?? x.topic }));
      setRecent([...c, ...e]);
    });
  }, [tab]);

  /* ── openers ───────────────────────────────────────────────────────────── */
  const openCarousel = useCallback((c: SavedCarousel | null) => {
    setPendingCarousel(c);
    if (c?.id && !(c as SavedCarousel & { _unsaved?: boolean })._unsaved) go("carousel-v2", { kind: "carousel", id: c.id });
    else go("carousel-v2", null);
  }, [go]);
  const openCampaign = useCallback((c: SavedCampaign | null) => {
    setPendingCampaign(c);
    if (c?.id) go("campaign", { kind: "email", id: c.id }); else go("campaign", null);
  }, [go]);
  const openScript = useCallback((s: Script) => { setActiveScript(s); go("editor"); }, [go]);
  const navigate = useCallback((t: Tab) => go(t, null), [go]);
  const newCarousel = useCallback(() => { setPendingCarousel(null); go("carousel-v2", null); }, [go]);
  const newEmail = useCallback(() => { setPendingCampaign(null); setPendingCarousel(null); go("campaign", null); }, [go]);
  const openRecent = useCallback((d: RecentDoc) => {
    if (d.kind === "carousel") { setPendingCarousel(null); go("carousel-v2", { kind: "carousel", id: d.id }); }
    else { setPendingCampaign(null); go("campaign", { kind: "email", id: d.id }); }
  }, [go]);

  const shellProps = useMemo(() => ({ tab, onNavigate: navigate, onNewCarousel: newCarousel, onNewEmail: newEmail, recent, onOpenRecent: openRecent }), [tab, navigate, newCarousel, newEmail, recent, openRecent]);

  return (
    <AppShell {...shellProps}>
      {loadError && (
        <div style={{ margin: 24, padding: 16, border: "1px solid var(--ui-danger)", borderRadius: 8, fontSize: 13, display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ flex: 1 }}>{loadError}</span>
          <button type="button" className="ui-btn ui-btn--sm ui-btn--secondary" onClick={() => { setLoadError(null); go(openDoc?.kind === "email" ? "campaign-library" : "carousel-library", null); }}>Open the library</button>
        </div>
      )}
      {tab === "home" && (
        <HomeView
          onNewScript={() => navigate("generate")}
          onNewCarousel={newCarousel}
          onNewEmail={newEmail}
          onOpenScript={openScript}
          onOpenCarousel={(c) => openCarousel(c ?? null)}
          onOpenCampaign={openCampaign}
        />
      )}
      {tab === "generate" && <GenerateView onOpenEditor={openScript} />}
      {tab === "editor" && <EditorView script={activeScript} onUpdate={(s) => { setActiveScript(s); saveScript(s); }} onOpenEditor={openScript} />}
      {tab === "library" && <LibraryView onOpen={openScript} />}
      {tab === "carousel-v2" && (
        <CarouselViewV2
          key={openDoc?.id ?? "new"}
          initialCarousel={pendingCarousel}
          onCarouselLoaded={() => setPendingCarousel(null)}
          onSaved={(id) => { if (openDoc?.id !== id) go("carousel-v2", { kind: "carousel", id }, true); }}
        />
      )}
      {tab === "batch" && <BatchView />}
      {tab === "subjects" && <SubjectsView />}
      {tab === "carousel-library" && (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 40px 80px" }}>
          <PageHeader title="Carousels" description="Everything you have built. Open one to keep editing, or copy its caption straight to Instagram." />
          <CarouselLibraryView onOpen={openCarousel} onConvertToCampaign={(c) => { setPendingCarousel(c); setPendingCampaign(null); go("campaign", null); }} />
        </div>
      )}
      {tab === "campaign" && (
        <CampaignView
          key={openDoc?.id ?? "new"}
          initialCampaign={pendingCampaign}
          initialCarousel={pendingCarousel}
          onCampaignLoaded={() => setPendingCampaign(null)}
          onCarouselConsumed={() => setPendingCarousel(null)}
        />
      )}
      {tab === "campaign-library" && <CampaignLibraryView onOpen={openCampaign} />}
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
            onPickReview={(reviewId) => { setPendingReviewId(reviewId); setPendingEmailFlow(null); go("email-reviews"); }}
            onNewReview={() => { setPendingReviewId(null); setPendingEmailFlow(null); go("email-reviews"); }}
          />
        </div>
      )}
      {tab === "video" && <VideoView />}
      {tab === "video-library" && <VideoLibraryView />}
      {tab === "video-assets" && <VideoAssetsView />}
      {tab === "assets" && <AssetsView />}
      {tab === "ugc" && <UGCTrackerView />}
      {tab === "ugc-briefs" && <UGCBriefsView onBack={() => navigate("home")} />}
      {tab === "business-overview" && <BusinessView active="overview" />}
      {tab === "business-pnl" && <BusinessView active="pnl" />}
      {tab === "business-unit-economics" && <BusinessView active="unit-economics" />}
      {tab === "business-cash" && <BusinessView active="cash" />}
      {tab === "business-assumptions" && <BusinessView active="assumptions" />}
    </AppShell>
  );
}
