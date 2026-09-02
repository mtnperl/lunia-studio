"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Script, SavedCarousel, SavedCampaign } from "@/lib/types";
import { getLibrary } from "@/lib/storage";
import { IconArrowRight } from "@/components/Icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, Badge, Skeleton, EmptyState, IcPlus } from "@/components/ui";

const DRAFT_TTL_MS = 30 * 60 * 1000;

type Props = {
  onNewScript: () => void;
  onNewCarousel: () => void;
  onNewEmail: () => void;
  onOpenScript: (s: Script) => void;
  onOpenCarousel: (c?: SavedCarousel & { _unsaved?: boolean }) => void;
  onOpenCampaign: (c: SavedCampaign) => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Home is the library. The two things you make come first, with their
 *  artwork; scripts and stats sit below. */
export default function HomeView({ onNewScript, onNewCarousel, onNewEmail, onOpenScript, onOpenCarousel, onOpenCampaign }: Props) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [carousels, setCarousels] = useState<(SavedCarousel & { _unsaved?: boolean })[]>([]);
  const [emails, setEmails] = useState<SavedCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getLibrary().catch(() => [] as Script[]),
      fetch("/api/carousel/library").then((r) => r.json()).catch(() => [] as SavedCarousel[]),
      fetch("/api/campaign/library").then((r) => r.json()).catch(() => [] as SavedCampaign[]),
    ]).then(([s, c, e]) => {
      setScripts(Array.isArray(s) ? s : []);
      const saved: (SavedCarousel & { _unsaved?: boolean })[] = Array.isArray(c) ? c : [];
      try {
        const now = Date.now();
        const rawDrafts = localStorage.getItem("lunia:drafts");
        const drafts: Array<SavedCarousel & { _unsaved?: boolean }> = rawDrafts ? JSON.parse(rawDrafts) : [];
        const freshDrafts = drafts.filter((d) => {
          const age = now - new Date(d.savedAt).getTime();
          if (age > DRAFT_TTL_MS) return false;
          return !saved.some((sc) => sc.topic === d.topic && Math.abs(new Date(sc.savedAt).getTime() - new Date(d.savedAt).getTime()) < 10_000);
        });
        saved.unshift(...freshDrafts);
        localStorage.setItem("lunia:drafts", JSON.stringify(drafts.filter((d) => now - new Date(d.savedAt).getTime() <= DRAFT_TTL_MS)));
      } catch {}
      setCarousels(saved);
      setEmails(Array.isArray(e) ? e : []);
      setLoading(false);
    });
  }, []);

  const recentCarousels = [...carousels].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).slice(0, 8);
  const recentEmails = [...emails].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
  const recentScripts = [...scripts].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).slice(0, 5);
  const inReview = scripts.filter((s) => s.status === "review").length;

  // Client-only: the server does not know the reader's date.
  const date = useSyncExternalStore(() => () => {}, () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }), () => " ");

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px 64px" }}>
      <PageHeader
        size="lg"
        eyebrow={date}
        title="Studio"
        description="Pick up where you left off, or start something new."
        actions={<><Button variant="primary" size="md" icon={<IcPlus size={14} />} onClick={onNewCarousel}>New carousel</Button><Button size="md" onClick={onNewEmail}>New email</Button><Button size="md" variant="ghost" onClick={onNewScript}>New script</Button></>}
      />

      <Section title="Carousels" count={carousels.length} onAll={() => onOpenCarousel()} allLabel="Open the builder">
        {loading ? <CardSkeletons /> : recentCarousels.length === 0 ? (
          <EmptyState title="No carousels yet" description="Start from a subject in your library or paste a topic. A first draft takes about two minutes." actions={<Button variant="primary" onClick={onNewCarousel}>New carousel</Button>} />
        ) : (
          <div className="home-grid">
            {recentCarousels.map((c) => (
              <button key={c.id} type="button" className="home-card" onClick={() => onOpenCarousel(c)}>
                <div className="home-card__art" style={{ aspectRatio: "4 / 5" }}>
                  {c.hookImageUrl ? <img src={c.hookImageUrl} alt="" loading="lazy" /> : <div className="home-card__blank">{c.content?.hooks?.[c.selectedHook]?.headline ?? c.topic}</div>}
                </div>
                <div className="home-card__meta">
                  <span className="home-card__title">{c.topic}</span>
                  <span className="home-card__sub">{formatDate(c.savedAt)} · {c.hookTone}{c._unsaved && <> · <Badge tone="warning">Unsaved</Badge></>}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Emails" count={emails.length} onAll={onNewEmail} allLabel="Open the builder">
        {loading ? <CardSkeletons /> : recentEmails.length === 0 ? (
          <EmptyState title="No emails yet" description="Pick a subject or an offer. Subject lines arrive first, then the blocks fill in." actions={<Button variant="primary" onClick={onNewEmail}>New email</Button>} />
        ) : (
          <div className="home-grid">
            {recentEmails.map((e) => {
              const hero = e.content.images?.find((i) => i.role === "hero");
              const subject = e.content.subjectLines?.[e.content.selectedSubject] ?? e.content.subjectLines?.[0] ?? e.topic;
              return (
                <button key={e.id} type="button" className="home-card" onClick={() => onOpenCampaign(e)}>
                  <div className="home-card__art" style={{ aspectRatio: "4 / 3", background: "var(--lunia-rich-navy)" }}>
                    {hero?.url ? <img src={hero.url} alt="" loading="lazy" /> : <div className="home-card__blank" style={{ color: "var(--lunia-soft-ivory)" }}>{subject}</div>}
                  </div>
                  <div className="home-card__meta">
                    <span className="home-card__title">{subject}</span>
                    <span className="home-card__sub">{formatDate(e.createdAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Scripts" count={scripts.length} onAll={onNewScript} allLabel="Generate a script" note={inReview > 0 ? `${inReview} in review` : undefined}>
        {loading ? <Skeleton height={40} /> : recentScripts.length === 0 ? (
          <EmptyState title="No scripts yet" description="Generate hooks and a full UGC script from a topic." actions={<Button onClick={onNewScript}>New script</Button>} />
        ) : (
          <div className="home-list">
            {recentScripts.map((s) => (
              <button key={s.id} type="button" className="home-row" onClick={() => onOpenScript(s)}>
                <span className="home-row__title">{s.title}</span>
                <Badge tone={s.status === "review" ? "warning" : s.status === "locked" ? "success" : "neutral"}>{s.status === "review" ? "Review" : s.status === "locked" ? "Locked" : "Draft"}</Badge>
                <span className="home-row__date">{formatDate(s.savedAt)}</span>
                <IconArrowRight size={14} />
              </button>
            ))}
          </div>
        )}
      </Section>

      <style>{`
        .home-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }
        .home-card { display: flex; flex-direction: column; gap: 8px; padding: 0; background: none; border: none; text-align: left; cursor: pointer; color: var(--ui-text); font: inherit; border-radius: var(--ui-radius-3); }
        .home-card:focus-visible { outline: none; box-shadow: var(--ui-focus-ring); }
        .home-card__art { width: 100%; overflow: hidden; border-radius: var(--ui-radius-3); border: 1px solid var(--ui-border); background: var(--ui-surface-2); position: relative; transition: border-color var(--ui-dur-1) var(--ui-ease-out); }
        .home-card:hover .home-card__art { border-color: var(--ui-border-strong); }
        .home-card__art img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .home-card__blank { position: absolute; inset: 0; padding: 14px; font-size: 13px; line-height: 1.3; font-weight: 500; color: var(--lunia-deep-navy); background: var(--lunia-soft-ivory); display: flex; align-items: flex-end; }
        .home-card__meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .home-card__title { font-size: 13px; font-weight: 500; line-height: 1.35; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .home-card__sub { font-size: 11px; color: var(--ui-text-3); display: inline-flex; align-items: center; gap: 4px; }
        .home-list { display: flex; flex-direction: column; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-3); overflow: hidden; }
        .home-row { display: grid; grid-template-columns: 1fr auto 60px 16px; align-items: center; gap: 12px; padding: 10px 14px; background: var(--ui-bg); border: none; border-bottom: 1px solid var(--ui-border); text-align: left; cursor: pointer; color: var(--ui-text); font: inherit; font-size: 13px; }
        .home-row:last-child { border-bottom: none; }
        .home-row:hover { background: var(--ui-surface); }
        .home-row:focus-visible { outline: none; box-shadow: inset var(--ui-focus-ring); }
        .home-row__title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .home-row__date { font-size: 12px; color: var(--ui-text-3); font-variant-numeric: tabular-nums; }
      `}</style>
    </div>
  );
}

function Section({ title, count, onAll, allLabel, note, children }: { title: string; count: number; onAll: () => void; allLabel: string; note?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: "var(--ui-text-16)", fontWeight: 600, letterSpacing: "var(--ui-tracking-tight)" }}>{title}</h2>
        <span style={{ fontSize: 12, color: "var(--ui-text-3)", fontFamily: "var(--ui-font-mono)" }}>{count}</span>
        {note && <Badge tone="warning">{note}</Badge>}
        <span style={{ flex: 1 }} />
        <Button variant="ghost" size="sm" onClick={onAll}>{allLabel}</Button>
      </div>
      {children}
    </section>
  );
}

function CardSkeletons() {
  return <div className="home-grid" aria-busy="true">{Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}><Skeleton height={0} style={{ aspectRatio: "4 / 5", height: "auto", borderRadius: 8 }} /><Skeleton width="80%" /><Skeleton width="40%" /></div>)}</div>;
}
