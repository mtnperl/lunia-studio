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

  useEffect(() => {
    setScriptCount(getLibrary().length);
  }, [tab]);

  function openEditor(script: Script) {
    setActiveScript(script);
    setTab("editor");
  }

  function openFromLibrary(script: Script) {
    setActiveScript(script);
    setTab("editor");
  }

  function handleScriptUpdate(s: Script) {
    setActiveScript(s);
    saveScript(s);
    setScriptCount(getLibrary().length);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "generate", label: "GENERATE" },
    { key: "editor", label: "EDITOR" },
    { key: "library", label: "LIBRARY" },
  ];

  return (
    <>
      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        height: 52, background: "var(--black)",
        borderBottom: "2px solid var(--black)",
        display: "flex", alignItems: "center",
        padding: "0 24px", gap: 0,
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 32 }}>
          <div style={{
            width: 20, height: 20, background: "var(--white)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "coin 1.4s ease-in-out infinite",
          }}>
            <span style={{ fontFamily: "var(--font-pixel)", fontSize: 7, color: "var(--black)", lineHeight: 1 }}>L</span>
          </div>
          <span style={{ fontFamily: "var(--font-pixel)", fontSize: 9, color: "var(--white)", letterSpacing: "0.15em" }}>LUNIA</span>
          <span style={{ fontFamily: "var(--font-crt)", fontSize: 16, color: "var(--gray4)" }}>SCRIPT STUDIO v1.0</span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", flex: 1, height: "100%" }}>
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  fontFamily: "var(--font-pixel)", fontSize: 7, letterSpacing: "0.1em",
                  background: active ? "var(--white)" : "var(--black)",
                  color: active ? "var(--black)" : "var(--white)",
                  border: "none",
                  borderLeft: `1px solid var(--gray5)`,
                  padding: "0 20px", height: "100%", cursor: "pointer",
                  position: "relative",
                }}
              >
                {t.label}
                {active && (
                  <span style={{
                    position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                    width: 0, height: 0,
                    borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
                    borderTop: "6px solid var(--white)",
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Script count */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-pixel)", fontSize: 7, color: "var(--gray4)" }}>
            {String(scriptCount).padStart(2, "0")} FILES
          </span>
        </div>
      </nav>

      {/* Content */}
      <main style={{ minHeight: "calc(100vh - 52px)", background: "var(--white)" }}>
        {tab === "generate" && <GenerateView onOpenEditor={openEditor} />}
        {tab === "editor" && <EditorView script={activeScript} onUpdate={handleScriptUpdate} />}
        {tab === "library" && <LibraryView onOpen={openFromLibrary} />}
      </main>
    </>
  );
}
