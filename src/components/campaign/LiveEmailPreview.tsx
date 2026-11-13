"use client";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { syncEmailPreview } from "@/lib/sync-email-preview";

/** A persistent iframe: edits update its DOM rather than navigate a new document. */
export default function LiveEmailPreview({ html, frameRef, width, height, scale, selectedId, onHeight, onReady }: {
  html: string;
  frameRef: RefObject<HTMLIFrameElement | null>;
  width: number;
  height: number;
  scale: number;
  selectedId: string | null;
  onHeight: (height: number) => void;
  onReady: () => void;
}) {
  const [initialHtml] = useState(html);
  const ready = useRef(false);
  const applied = useRef(initialHtml);
  const cleanup = useRef<(() => void) | null>(null);
  function update() {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!ready.current || !doc?.body) return;
    if (applied.current !== html) {
      syncEmailPreview(doc, html);
      applied.current = html;
    }
    frame?.contentWindow?.postMessage({ source: "lunia-editor", type: "highlightBlock", id: selectedId }, "*");
    onHeight(doc.body.scrollHeight);
  }
  useLayoutEffect(() => { update(); });
  useLayoutEffect(() => () => { cleanup.current?.(); }, []);
  return <iframe
    ref={frameRef}
    srcDoc={initialHtml}
    title="Campaign preview"
    onLoad={() => {
      cleanup.current?.();
      ready.current = true;
      update();
      const doc = frameRef.current?.contentDocument;
      if (!doc?.body) return;
      const measure = () => onHeight(doc.body.scrollHeight);
      const wheel = (event: WheelEvent) => window.scrollBy(event.deltaX, event.deltaY);
      const observer = new ResizeObserver(measure);
      observer.observe(doc.body);
      doc.addEventListener("load", measure, true);
      doc.addEventListener("wheel", wheel, { passive: true });
      cleanup.current = () => {
        observer.disconnect();
        doc.removeEventListener("load", measure, true);
        doc.removeEventListener("wheel", wheel);
      };
      onReady();
    }}
    style={{ width, height: Math.max(600, height), border: "none", display: "block", background: "#01253f", transform: `scale(${scale})`, transformOrigin: "top left" }}
  />;
}
