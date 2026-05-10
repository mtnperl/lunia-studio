"use client";
import { useState } from "react";
import type { KlaviyoWritebackResult } from "@/lib/types";

type Props = {
  reviewId: string;
  emailId: string;
  sourceTemplateId?: string;   // required for actual push
  target: "body" | "subject" | "preview";
  contentVersion: string;      // "A" | "B" | etc.
  /** The HTML body to push (only used when target === "body"). */
  bodyHtml?: string;
  /** Friendly human label e.g. "Push Version A body to Klaviyo" */
  label?: string;
  onResult?: (result: KlaviyoWritebackResult, editorUrl: string) => void;
};

export default function KlaviyoPushButton({ reviewId, emailId, sourceTemplateId, target, contentVersion, bodyHtml, label = "Push to Klaviyo as draft", onResult }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<{ editorUrl: string } | null>(null);

  const disabled = !sourceTemplateId;

  async function push() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/email-review/klaviyo-writeback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId,
          emailId,
          target,
          contentVersion,
          sourceTemplateId,
          rewrite: target === "body" && bodyHtml ? { html: bodyHtml } : {},
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "no_write_key") {
          setError("No Klaviyo write access. Add KLAVIYO_API_KEY (full-access) or KLAVIYO_API_KEY_WRITE on the server.");
        } else {
          setError(data.error ?? `${res.status}`);
        }
        return;
      }
      setDone({ editorUrl: data.editorUrl });
      onResult?.(data.result as KlaviyoWritebackResult, data.editorUrl as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (done) {
    return (
      <a
        href={done.editorUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          padding: "5px 12px",
          fontSize: 11,
          fontWeight: 700,
          background: "var(--success)",
          color: "#fff",
          border: "1px solid var(--success)",
          borderRadius: 5,
          textDecoration: "none",
          fontFamily: "inherit",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Pushed → Open in Klaviyo
      </a>
    );
  }

  if (confirming) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={push}
          disabled={busy}
          style={{
            padding: "5px 11px",
            fontSize: 11,
            fontWeight: 700,
            background: "var(--accent)",
            color: "#fff",
            border: "1px solid var(--accent)",
            borderRadius: 5,
            cursor: busy ? "wait" : "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {busy ? "Pushing…" : "Confirm push"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={busy}
          style={{
            padding: "5px 11px",
            fontSize: 11,
            background: "transparent",
            color: "var(--subtle)",
            border: "1px solid var(--border)",
            borderRadius: 5,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button
        onClick={() => setConfirming(true)}
        disabled={disabled}
        title={disabled ? "No source template id available — Klaviyo writeback only works for Klaviyo-sourced flows" : "Clones the source template, applies the rewrite, swaps as a draft. You publish manually from Klaviyo."}
        style={{
          padding: "5px 11px",
          fontSize: 11,
          fontWeight: 700,
          background: "transparent",
          color: disabled ? "var(--subtle)" : "var(--accent)",
          border: `1px solid ${disabled ? "var(--border)" : "var(--accent)"}`,
          borderRadius: 5,
          cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {label}
      </button>
      {error && <span style={{ fontSize: 11, color: "var(--error)" }}>{error}</span>}
    </span>
  );
}
