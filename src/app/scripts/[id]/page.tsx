import { getScriptById } from "@/lib/kv";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ScriptSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const script = await getScriptById(id);
  if (!script) notFound();

  const scriptLines = script.lines;
  const duration = (() => {
    const words = scriptLines
      .filter((l) => !/^\[(HOOK|BODY|CTA)\]$/.test(l))
      .join(" ").trim().split(/\s+/).filter(Boolean).length;
    if (words === 0) return null;
    const secs = Math.round((words / 130) * 60);
    return secs < 60 ? `~${secs}s` : `~${Math.round(secs / 6) * 6}s`;
  })();

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#fafafa", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, background: "#000", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>L</span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Lunia Script Studio</span>
        <span style={{ fontSize: 13, color: "#9ca3af", marginLeft: "auto" }}>Read-only</span>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px 60px" }}>

        {/* Meta */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111", margin: "0 0 6px", lineHeight: 1.3 }}>
            {script.title}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {[script.persona, script.format, script.angle].filter(Boolean).map((tag) => (
              <span key={tag} style={{ fontSize: 11, padding: "2px 8px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 4, color: "#6b7280" }}>
                {tag}
              </span>
            ))}
            {duration && (
              <span style={{ fontSize: 11, padding: "2px 8px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 4, color: "#3b82f6" }}>
                {duration}
              </span>
            )}
            {script.creator && (
              <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>for {script.creator}</span>
            )}
          </div>
        </div>

        {/* Hook */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#9ca3af", margin: "0 0 8px" }}>HOOK</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#111", lineHeight: 1.5, margin: 0 }}>{script.hook}</p>
        </div>

        {/* Script */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#9ca3af", margin: "0 0 12px" }}>SCRIPT</p>
          {scriptLines.map((line, i) => {
            const isSection = /^\[(HOOK|BODY|CTA)\]$/.test(line);
            return isSection ? (
              <div key={i} style={{ margin: "14px 0 6px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#9ca3af", background: "#f9fafb", padding: "2px 8px", borderRadius: 4 }}>
                  {line.replace(/[\[\]]/g, "")}
                </span>
              </div>
            ) : (
              <p key={i} style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: "3px 0" }}>{line}</p>
            );
          })}
        </div>

        {/* Filming notes */}
        {(script.filmingNotes.setting || script.filmingNotes.energy || script.filmingNotes.broll || script.filmingNotes.director) && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 18px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#9ca3af", margin: "0 0 12px" }}>FILMING NOTES</p>
            {([
              { key: "setting", label: "Setting" },
              { key: "energy", label: "Energy" },
              { key: "broll", label: "B-Roll" },
              { key: "director", label: "Director notes" },
            ] as const).filter(({ key }) => script.filmingNotes[key]).map(({ key, label }) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", margin: "0 0 3px", letterSpacing: ".04em" }}>{label.toUpperCase()}</p>
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5, margin: 0 }}>{script.filmingNotes[key]}</p>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <p style={{ fontSize: 12, color: "#d1d5db", textAlign: "center", marginTop: 32 }}>
          Created with Lunia Script Studio · Lunia Life
        </p>
      </div>
    </div>
  );
}
