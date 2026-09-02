"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Badge, Textarea, Dialog, useToast } from "@/components/ui";
import { SlideCanvas, SLIDE_W, SLIDE_H } from "./SlideCanvas";
import { MOCK_CAROUSEL } from "./mock-data";

/** The phone gets a review-and-approve view, not the editor. Swipe the
 *  slides at full width, read the caption, approve, or ask for a change.
 *  Editing happens on a desktop or a tablet. */
export default function ReviewView() {
  const [i, setI] = useState(0);
  const [ask, setAsk] = useState(false);
  const { toast } = useToast();
  const doc = MOCK_CAROUSEL;
  const vw = typeof window !== "undefined" ? Math.min(window.innerWidth, 480) - 48 : 342;
  const scale = vw / SLIDE_W;
  return (
    <div className="review">
      <div className="review__top">
        <Link href="/proposal" className="ui-icon-btn" aria-label="Back"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
          <div style={{ fontSize: 11, color: "var(--ui-text-3)" }}>{doc.slides.length} slides · edited 2 hours ago</div>
        </div>
        <Badge tone="warning">In review</Badge>
      </div>
      <div className="review__strip" onScroll={(e) => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / (el.clientWidth - 24))); }}>
        {doc.slides.map((s) => (
          <div key={s.id} className="review__slide" style={{ height: SLIDE_H * scale, flexBasis: SLIDE_W * scale }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}><SlideCanvas slide={s} /></div>
          </div>
        ))}
      </div>
      <div className="review__dots" aria-hidden="true">{doc.slides.map((_, k) => <i key={k} data-on={k === i} />)}</div>
      <div className="review__caption">
        <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ui-text-3)", marginBottom: 6 }}>Caption</div>
        {doc.caption.split("\n").filter(Boolean).map((p, k) => <p key={k} style={{ margin: "0 0 10px" }}>{p}</p>)}
      </div>
      <div className="review__bar">
        <Button size="lg" onClick={() => setAsk(true)}>Request a change</Button>
        <Button size="lg" variant="primary" onClick={() => toast({ title: "Approved", description: "It moves to the export queue.", kind: "success" })}>Approve</Button>
      </div>
      <Dialog open={ask} onClose={() => setAsk(false)} title={`Change on slide ${i + 1}`} footer={<><Button onClick={() => setAsk(false)}>Cancel</Button><Button variant="primary" onClick={() => { setAsk(false); toast({ title: "Sent", description: "The note is pinned to the slide in the editor." }); }}>Send</Button></>}>
        <Textarea rows={4} autoFocus placeholder="What should change?" aria-label="Change request" />
      </Dialog>
    </div>
  );
}
