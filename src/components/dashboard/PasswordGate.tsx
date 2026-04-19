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
          <input
            ref={inputRef}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null); }}
            autoFocus
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "var(--surface-r)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text)",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              borderColor: error ? "var(--error)" : "var(--border)",
            }}
          />

          {error && (
            <p style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--error)",
              margin: 0,
            }}>
              {error}
            </p>
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
            }}
          >
            {loading ? "Verifying…" : buttonLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
