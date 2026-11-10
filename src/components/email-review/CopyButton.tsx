"use client";
import { useState } from "react";
import { Button, IcCheck, IcCopy } from "@/components/ui";

type Props = {
  text: string | (() => string | Promise<string>);
  label?: string;
  size?: "sm" | "md";
  /** Style variant. "outline" = bordered button; "ghost" = subtle inline action. */
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

  return (
    <Button
      size={size}
      variant={variant === "ghost" ? "ghost" : "secondary"}
      onClick={handleCopy}
      title="Copy to clipboard"
      icon={state === "copied" ? <IcCheck size={14} strokeWidth={2} style={{ color: "var(--ui-success)" }} /> : <IcCopy size={14} strokeWidth={1.75} />}
    >
      {state === "copied" ? "Copied" : state === "error" ? "Failed" : label}
    </Button>
  );
}
