"use client";
import React, { Component, type ReactNode } from "react";

type Props = {
  /** Short label for the error message (e.g. "Graphic data editor"). */
  label: string;
  children: ReactNode;
  onClose?: () => void;
};

type State = { hasError: boolean; message: string };

/**
 * Catches render-time errors in the v2 preview panels (data editor, type
 * picker, overlays). Without this, a thrown error in any of them takes
 * down the whole PreviewStep and Next.js shows a "page couldn't load"
 * fallback. With it, we surface the actual error in-place so the rest of
 * the preview keeps working.
 */
export default class PanelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message ?? String(err) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[${this.props.label}] threw:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          marginTop: 8,
          border: "1px solid var(--error, #e2445c)",
          borderRadius: 8,
          background: "rgba(184,92,92,0.06)",
          padding: "12px 14px",
          fontFamily: "inherit",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--error, #e2445c)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {this.props.label} — render error
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
                {this.state.message || "Unknown error"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => this.setState({ hasError: false, message: "" })}
                style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 5, fontSize: 10, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit", padding: "4px 8px", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}
              >
                Retry
              </button>
              <button
                onClick={() => { if (typeof window !== "undefined") window.location.reload(); }}
                title="Reload the page (clears cached JS)"
                style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 5, fontSize: 10, color: "var(--accent)", cursor: "pointer", fontFamily: "inherit", padding: "4px 8px", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}
              >
                Reload page
              </button>
              {this.props.onClose && (
                <button
                  onClick={this.props.onClose}
                  style={{ background: "transparent", border: "none", fontSize: 14, color: "var(--muted)", cursor: "pointer", lineHeight: 1, padding: "4px 6px" }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
