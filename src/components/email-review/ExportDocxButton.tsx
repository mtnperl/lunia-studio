"use client";
import { useState } from "react";
import { MiniReviewLoader } from "@/components/email-review/ReviewLoaders";
import { Button } from "@/components/ui";

type Props = {
  reviewId: string;
  flowName: string;
};

export default function ExportDocxButton({ reviewId, flowName }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportDocx() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/email-review/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      });
      const ct = res.headers.get("content-type") ?? "";
      if (!res.ok) {
        const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };
        setError(data.error ?? `${res.status}`);
        return;
      }
      // Two response shapes:
      //   - JSON { url } when Blob mirroring is configured
      //   - binary docx with Content-Disposition when Blob isn't available
      if (ct.includes("application/json")) {
        const { url } = await res.json();
        if (!url) { setError("Server returned no download URL"); return; }
        // Trigger download
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(flowName || "lunia-flow-review").replace(/[^a-z0-9]+/gi, "-")}.docx`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Stream fallback
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(flowName || "lunia-flow-review").replace(/[^a-z0-9]+/gi, "-")}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, position: "relative" }}>
      <Button variant="secondary" size="md" onClick={exportDocx} disabled={busy} title="Export the review as a Word doc matching the framework template">
        {busy ? "Exporting…" : "Export Word doc"}
      </Button>
      {error && <span style={{ fontSize: 11, color: "var(--error)" }}>{error}</span>}
      {busy && (
        <span style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 280, zIndex: 10 }}>
          <MiniReviewLoader label="building word doc" detail="MIRRORING TO BLOB" engine="email-review · docx" />
        </span>
      )}
    </span>
  );
}
