"use client";
import { useEffect, useState } from "react";
import UGCCampaignList from "./UGCCampaignList";
import UGCCampaignView from "./UGCCampaignView";
import UGCBriefsPanel from "./UGCBriefsPanel";
import UGCOutreachPanel from "./UGCOutreachPanel";

type View =
  | { kind: "list" }
  | { kind: "campaign"; id: string }
  | { kind: "briefs" }
  | { kind: "outreach" };

export default function UGCTrackerView() {
  const [view, setView] = useState<View>({ kind: "list" });
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    function check() { setIsDesktop(window.innerWidth >= 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isDesktop) {
    return (
      <div style={{
        minHeight: "70vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: 40, textAlign: "center",
        fontFamily: "var(--font-ui)",
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
          UGC tracker is desktop-only
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 320 }}>
          Open this on a laptop to manage campaigns. The inline table needs room to breathe.
        </div>
      </div>
    );
  }

  if (view.kind === "list") {
    return (
      <UGCCampaignList
        onOpen={(id) => setView({ kind: "campaign", id })}
        onOpenBriefs={() => setView({ kind: "briefs" })}
        onOpenOutreach={() => setView({ kind: "outreach" })}
      />
    );
  }
  if (view.kind === "campaign") {
    return (
      <UGCCampaignView
        campaignId={view.id}
        onBack={() => setView({ kind: "list" })}
      />
    );
  }
  if (view.kind === "briefs") {
    return <UGCBriefsPanel onBack={() => setView({ kind: "list" })} />;
  }
  return <UGCOutreachPanel onBack={() => setView({ kind: "list" })} />;
}
