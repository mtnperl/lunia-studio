"use client";
import { useState, useRef } from "react";

type Props = {
  title: string;
  description: string;
  buttonLabel: string;
  verifyUrl: string;
  storageKey: string;
  onUnlock: () => void;
};

export default function PasswordGate({
  title,
  description,
  buttonLabel,
  verifyUrl,
  storageKey,
  onUnlock,
}: Props) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        localStorage.setItem(storageKey, "1");
        onUnlock();
        return;
      }

      if (res.status === 401) {
        setError("Incorrect password");
      } else {
        setError("Could not connect, try again");
      }
    } catch {
      setError("Could not connect, try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      maxWidth: 360,
      margin: "120px auto",
      padding: "0 16px",
    }}>
      <h2 style={{
        fontFamily: "var(--font-ui)",
        fontSize: 20,
        fontWeight: 600,
        color: "var(--text)",
        marginBottom: 24,
        textAlign: "center",
      }}>
        {title}
      </h2>

      <div className="modal-box" style={{ padding: "28px 24px" }}>
        <p style={{
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "var(--muted)",
          marginBottom: 20,
          marginTop: 0,
          textAlign: "center",
        }}>
          {description}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <input
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              disabled={loading}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              autoFocus
              style={{
                width: "100%",
                padding: "10px 44px 10px 12px",
                background: "var(--surface-r)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--text)",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                borderColor: error ? "var(--error)" : "var(--border)",
                opacity: loading ? 0.6 : 1,
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              disabled={loading}
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
                cursor: loading ? "not-allowed" : "pointer",
                color: "var(--muted)",
                padding: 0,
              }}
            >
              {showPassword ? EyeOffIcon : EyeIcon}
            </button>
          </div>

          {error && (
            <div role="alert" style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--error)",
              padding: "8px 10px",
              background: "rgba(196, 0, 0, 0.08)",
              border: "1px solid var(--error)",
              borderRadius: 5,
              margin: 0,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="btn"
            style={{
              width: "100%",
              padding: "10px",
              opacity: loading || !password ? 0.6 : 1,
              cursor: loading || !password ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading && SpinnerIcon}
            {loading ? "Verifying…" : buttonLabel}
          </button>
        </form>
      </div>
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
