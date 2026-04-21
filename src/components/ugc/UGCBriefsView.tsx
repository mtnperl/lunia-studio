"use client";
import { useEffect, useState } from "react";
import UGCBriefsPanel from "./UGCBriefsPanel";
import PasswordGate from "@/components/dashboard/PasswordGate";

export default function UGCBriefsView({ onBack }: { onBack: () => void }) {
  const [isDesktop, setIsDesktop] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lunia:ugc:unlocked");
    if (stored === "1") setUnlocked(true);
  }, []);

  useEffect(() => {
    function check() { setIsDesktop(window.innerWidth >= 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!unlocked) {
    return (
      <PasswordGate
        title="UGC"
        description="Enter password to view UGC briefs"
        buttonLabel="Unlock UGC"
        verifyUrl="/api/ugc/verify"
        storageKey="lunia:ugc:unlocked"
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  if (!isDesktop) {
    return (
      <div style={{
        minHeight: "70vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: 40, textAlign: "center",
        fontFamily: "var(--font-ui)",
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
          UGC briefs are desktop-only
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 320 }}>
          Open this on a laptop to manage briefs.
        </div>
      </div>
    );
  }

  return <UGCBriefsPanel onBack={onBack} />;
}
