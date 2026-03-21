"use client";
import { useState, useEffect } from "react";
import GenerateView from "@/components/GenerateView";
import EditorView from "@/components/EditorView";
import LibraryView from "@/components/LibraryView";
import { Script } from "@/lib/types";
import { getLibrary, saveScript } from "@/lib/storage";

type Tab = "generate" | "editor" | "library";

export default function Page() {
  const [tab, setTab] = useState<Tab>("generate");
  const [activeScript, setActiveScript] = useState<Script | null>(null);
  const [scriptCount, setScriptCount] = useState(0);

  useEffect(() => { getLibrary().then((lib) => setScriptCount(lib.length)).catch(() => {}); }, [tab]);

  function openEditor(script: Script) { setActiveScript(script); setTab("editor"); }
  function handleScriptUpdate(s: Script) { setActiveScript(s); saveScript(s); getLibrary().then((lib) => setScriptCount(lib.length)).catch(() => {}); }

  const tabs: { key: Tab; label: string }[] = [
    { key: "generate", label: "Generate" },
    { key: "editor", label: "Editor" },
    { key: "library", label: "Library" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <header style={{
        borderBottom: "1px solid var(--border)", background: "var(--bg)",
        position: "sticky", top: 0, zIndex: 50,
        padding: "0 24px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 20, height: 20, background: "#000", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, lineHeight: 1 }}>L</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.02em" }}>Lunia Script Studio</span>
        </div>

        <nav style={{ display: "flex", gap: 2 }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "6px 14px", fontSize: 13, fontWeight: 500,
              background: tab === t.key ? "var(--surface)" : "transparent",
              color: tab === t.key ? "var(--text)" : "var(--muted)",
              border: "none", borderRadius: 6, cursor: "pointer",
              fontFamily: "inherit",
            }}>{t.label}</button>
          ))}
        </nav>

        <span style={{ fontSize: 12, color: "var(--subtle)" }}>{scriptCount} scripts</span>
      </header>

      <main style={{ flex: 1 }}>
        {tab === "generate" && <GenerateView onOpenEditor={openEditor} />}
        {tab === "editor" && <EditorView script={activeScript} onUpdate={handleScriptUpdate} />}
        {tab === "library" && <LibraryView onOpen={(s) => { setActiveScript(s); setTab("editor"); }} />}
      </main>
    </div>
  );
}
