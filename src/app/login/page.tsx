"use client";
import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
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
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "10px 12px",
            background: "var(--bg, #FFFFFF)",
            color: "var(--text, #1D1D1F)",
            border: "1px solid var(--border, #D2D2D7)",
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 12,
          }}
        />
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
          }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {err && (
          <div style={{ marginTop: 12, color: "var(--error, #C40000)", fontSize: 12 }}>{err}</div>
        )}
      </form>
    </div>
  );
}
