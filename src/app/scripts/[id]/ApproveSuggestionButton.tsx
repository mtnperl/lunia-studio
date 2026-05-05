"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApproveSuggestionButton({
  scriptId,
  suggestionId,
}: {
  scriptId: string;
  suggestionId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/scripts/${scriptId}/accept-suggestion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? `Failed (${res.status})`);
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
      setPending(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
      <button
        onClick={approve}
        disabled={pending}
        style={{
          fontSize: 13, fontWeight: 600, padding: "7px 18px",
          background: pending ? "#fed7aa" : "#b86040", color: "#fff",
          border: "1px solid #b86040", borderRadius: 6,
          cursor: pending ? "default" : "pointer",
          letterSpacing: ".02em",
        }}
      >
        {pending ? "Approving…" : "Approve rewrite"}
      </button>
      {error && <span style={{ fontSize: 12, color: "#b91c1c" }}>{error}</span>}
    </div>
  );
}
