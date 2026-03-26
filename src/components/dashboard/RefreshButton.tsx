"use client";

type Props = {
  loading: boolean;
  onClick: () => void;
  lastRefreshed?: Date;
};

export default function RefreshButton({ loading, onClick, lastRefreshed }: Props) {
  const timeLabel = lastRefreshed
    ? lastRefreshed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {timeLabel && (
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--muted)",
        }}>
          Updated {timeLabel}
        </span>
      )}
      <button
        onClick={onClick}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          border: "1px solid var(--border-strong)",
          borderRadius: 6,
          background: "transparent",
          color: "var(--text)",
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? (
          <>
            <span style={{
              width: 12,
              height: 12,
              border: "2px solid var(--border-strong)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.7s linear infinite",
            }} />
            Refreshing
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 6A4 4 0 1 1 6 2a4 4 0 0 1 2.83 1.17L10 4" />
              <path d="M10 2v2H8" />
            </svg>
            Refresh
          </>
        )}
      </button>
    </div>
  );
}
