"use client";
import { useState } from "react";

type Props = {
  text: string | (() => string | Promise<string>);
  label?: string;
  size?: "sm" | "md";
  /** Style variant. "outline" = bordered button; "ghost" = subtle inline link. */
  variant?: "outline" | "ghost";
};

export default function CopyButton({ text, label = "Copy", size = "sm", variant = "outline" }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      const value = typeof text === "function" ? await text() : text;
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        // SSR / older browser fallback
        return;
      }
      await navigator.clipboard.writeText(value);
      setState("copied");
      setTimeout(() => setState("idle"), 1400);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 1400);
    }
  }

  const padding = size === "md" ? "6px 12px" : "3px 8px";
  const fontSize = size === "md" ? 12 : 11;

  return (
    <button
      onClick={handleCopy}
      type="button"
      style={{
        padding,
        fontSize,
        fontWeight: 600,
        letterSpacing: "0.04em",
        background: variant === "ghost" ? "transparent" : state === "copied" ? "var(--success)" : "var(--surface)",
        color: variant === "ghost" ? "var(--accent)" : state === "copied" ? "#fff" : "var(--muted)",
        border: variant === "ghost" ? "none" : `1px solid ${state === "copied" ? "var(--success)" : "var(--border)"}`,
        borderRadius: 5,
        cursor: "pointer",
        fontFamily: "inherit",
        textTransform: state === "idle" ? "uppercase" : "none",
      }}
      title="Copy to clipboard"
    >
      {state === "copied" ? "Copied" : state === "error" ? "Failed" : label}
    </button>
  );
}
