"use client";
import { useState } from "react";
import type { KlaviyoWritebackResult } from "@/lib/types";
import { Button } from "@/components/ui";

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
          fontWeight: 600,
          background: "var(--success)",
          color: "var(--ui-on-ink)",
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
        <Button variant="primary" size="sm" onClick={push} disabled={busy}>
          {busy ? "Pushing…" : "Confirm push"}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
          Cancel
        </Button>
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Button variant="secondary" size="sm" onClick={() => setConfirming(true)} disabled={disabled} title={disabled ? "No source template id available — Klaviyo writeback only works for Klaviyo-sourced flows" : "Clones the source template, applies the rewrite, swaps as a draft. You publish manually from Klaviyo."}>
        {label}
      </Button>
      {error && <span style={{ fontSize: 11, color: "var(--error)" }}>{error}</span>}
    </span>
  );
}
