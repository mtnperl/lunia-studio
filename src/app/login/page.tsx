"use client";
import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErr(body.error ?? `Login failed (${res.status})`);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      window.location.href = next && next.startsWith("/") ? next : "/";
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg, #FFFFFF)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: 24,
    }}>
      <form
        onSubmit={submit}
        style={{
          width: "100%", maxWidth: 360,
          padding: 32,
          background: "var(--surface, #F5F5F7)",
          border: "1px solid var(--border, #D2D2D7)",
          borderRadius: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle, #98989D)", marginBottom: 4 }}>
          Lunia Studio
        </div>
        <h1 style={{ margin: "0 0 18px", fontSize: 22, fontWeight: 600, color: "var(--text, #1D1D1F)" }}>
          Sign in
        </h1>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <input
            type={showPassword ? "text" : "password"}
            autoFocus
            disabled={busy}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 44px 10px 12px",
              background: "var(--bg, #FFFFFF)",
              color: "var(--text, #1D1D1F)",
              border: "1px solid var(--border, #D2D2D7)",
              borderRadius: 8,
              fontSize: 14,
              opacity: busy ? 0.6 : 1,
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={busy}
            aria-label={showPassword ? "Hide password" : "Show password"}
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              cursor: busy ? "not-allowed" : "pointer",
              color: "var(--muted, #6E6E73)",
              padding: 0,
            }}
          >
            {showPassword ? EyeOffIcon : EyeIcon}
          </button>
        </div>
        <button
          type="submit"
          disabled={!password || busy}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "var(--accent, #1D1D1F)",
            color: "var(--bg, #FFFFFF)",
            border: "none",
            borderRadius: 8,
            fontSize: 14, fontWeight: 500,
            cursor: busy || !password ? "default" : "pointer",
            opacity: busy || !password ? 0.6 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {busy && SpinnerIcon}
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {err && (
          <div role="alert" style={{
            marginTop: 14,
            padding: "8px 12px",
            background: "rgba(196, 0, 0, 0.08)",
            border: "1px solid var(--error, #C40000)",
            borderRadius: 6,
            color: "var(--error, #C40000)",
            fontSize: 13,
            fontWeight: 500,
          }}>{err}</div>
        )}
      </form>
    </div>
  );
}

const EyeIcon = (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
    <circle cx="8" cy="8" r="2" />
  </svg>
);

const EyeOffIcon = (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 2l12 12" />
    <path d="M6.5 6.5a2 2 0 0 0 2.83 2.83" />
    <path d="M10.7 10.7C9.9 11 9 11 8 11c-4.5 0-7-5-7-5 .8-1.4 1.8-2.6 3.1-3.5" />
    <path d="M5.5 3.5C6.3 3.2 7.1 3 8 3c4.5 0 7 5 7 5-.6 1-1.4 2-2.4 2.7" />
  </svg>
);

const SpinnerIcon = (
  <svg viewBox="0 0 16 16" width="14" height="14" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }} aria-hidden="true">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
    <path d="M14 8a6 6 0 0 1-6 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);
