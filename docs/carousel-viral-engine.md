# Viral carousel engine

The Viral theme sits next to Editorial Scientific and Free Press. Same palette, same Inter, same restraint, same compliance language, same caption conventions, same channel specs. What changes is the slide architecture and the retention logic underneath it.

To build one: pick a subject, choose 5 or 10 slides, fill the slot table in section 1 in order, run the checklist in section 5, export. Example at the end.

## 1. Slot architecture

Two lengths. Every slot has a job and a pass or fail test. A slide that does another slot's job fails.

### 5-slide

| Slot | Job | Test | Open-loop line (last line on the slide) |
|---|---|---|---|
| 1 Hook | Stop the scroll. Not explain, not introduce. | 8 words or fewer. One sentence. A promise or a number. No product. | none, the hook is the loop |
| 2 Stakes | Confirm the hook. Set up the problem and what it costs. | A stranger thinks "worth my time" in one second. Names a cost the reader recognises. | "Here is why the usual fix fails." |
| 3 Turn | Amplify the pain, invalidate the current method, pivot on BUT. | Contains the word "but" or "except". Does not deliver the solution. | "The fix is smaller than you think." |
| 4 Solution | One idea. One easy step toward a result, with its proof. | A beginner could do it tonight. One number or one named study. | "One more thing decides whether it holds." |
| 5 CTA | One ask, to lunialife.com. | Exactly one action. No second link, no hashtags on the slide. | none |

### 10-slide

| Slot | Job | Test | Open-loop line |
|---|---|---|---|
| 1 Hook | Stop the scroll. | 8 words or fewer. A promise or a number. | none |
| 2 Stakes | Confirm the hook, set the problem and its cost. | Reader recognises the cost in one second. | "It is not the reason you were told." |
| 3 Pain | Amplify. Show the problem compounding. | Adds a second consequence the reader has felt. | "Most people fix the wrong half." |
| 4 Invalidate and turn | Name the current method, say why it fails, pivot on BUT. | Contains "but". Solution still withheld. | "The real lever is upstream." |
| 5 Idea 1 | Education. One idea, one step. | Beginner does it tonight. | "That handles the start of the night." |
| 6 Idea 2 | Education. One idea, one step. | Beginner does it tonight. | "The middle of the night needs something else." |
| 7 Idea 3 | Education. One idea, one step. | Beginner does it tonight. | "Now the part that makes it stick." |
| 8 Proof | Social proof or mechanism proof that the solution works. | One figure with a source, or one mechanism in one sentence. | "Which leaves one question." |
| 9 Objection | The reason they still will not do it, answered. | Names the objection in the reader's words. | "So here is the only thing to do." |
| 10 CTA | One ask, to lunialife.com. | Exactly one action. | none |

Rules for the table:
- Write the open-loop line into the slot before writing the body. It is the last line on the slide, set as the support line.
- Slot names are for the writer. They never appear on the slide.
- If a subject cannot fill slots 3 and 4 without repeating itself, use the 5-slide length.

## 2. Retention rules

1. Never resolve the tension before the midpoint. Slide 3 of 5 and slide 5 of 10 are the first places a solution may appear. A great hook followed by the answer on slide 2 is what kills swipe depth.
2. Every slide ends owing the reader something. The open-loop line is mandatory on every slide except the hook and the CTA.
3. Simplicity gate. Read each slide as a complete beginner. If it needs a second read, rewrite it. Confused people do not swipe.
4. One idea per slide. Two ideas means two slides or one cut.
5. Numbers beat adjectives. Where the ledger has a sourced figure, use it. Where it does not, hedge in words, never invent.
6. The product arrives late. Slot 8 of 10 or slot 4 of 5 at the earliest, and only as the mechanism, never as the promise.

## 3. Layout and reading pattern

Western F and Z order. The eye lands top-left, drops, then sweeps.

- Primary line: top-left, largest. Hero size.
- Support line: directly below, left-aligned, smaller.
- Smallest line last: source or open loop, bottom-left.
- Never right-align a heading over centred body copy. Never centre the hero over left-aligned support.

Type scale on the 1080-wide canvas, Inter, the weights already in the editorial preset:

| Role | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| Hero | 96 px | Inter 300 | -0.01em | The one line per slide. Uppercase on hooks only. |
| Support | 38 px | Inter 300 | 0 | Body, two to four lines. |
| Footnote | 26 px | Inter 400 | 0.06em | Citation, open-loop line when it doubles as a footnote. |
| Kicker | 24 px | Inter 600 | 0.16em | Uppercase label above the hero on slide 1 only. |

Hero weight may step to 500 or 700 through the Hook weight control. Nothing else changes weight.

Contrast, measured, WCAG 2.1 ratio, 4.5:1 minimum for text:

| Pairing | Ratio | Verdict |
|---|---|---|
| Deep Navy on Soft Ivory | 14.2 | pass |
| Rich Navy on Soft Ivory | 14.3 | pass |
| Slate Blue on Soft Ivory | 9.9 | pass |
| Soft Ivory on Rich Navy | 14.3 | pass |
| Soft Ivory on Deep Navy | 14.2 | pass |
| Aqua on Rich Navy | 13.7 | pass, accent only |
| Signal Yellow on Rich Navy | 11.3 | pass, accent only |
| Deep Navy on Aqua | 13.6 | pass |
| Deep Navy on Signal Yellow | 11.2 | pass |
| Slate Blue on Signal Yellow | 7.8 | pass |

Fails, never use for text: Aqua or Signal Yellow on Soft Ivory (1.0 and 1.3), Soft Ivory on Aqua or Signal Yellow (1.0 and 1.3), Deep Navy on Rich Navy or the reverse (1.0), Slate Blue on either navy (1.4). No current text pairing fails. One palette note: the editorial CTA slide falls back to #EFEFF4 as its background when no brand background is set. That grey is not one of the six colours. Set Soft Ivory there.

## 4. Canvas spec

Do not hardcode a new ratio. Instagram feed renders 4:5.

- Keep all live content inside a 1080 by 1350 safe zone.
- Optionally export on 1080 by 1440 with every line of type inside that 1350 zone, about 45 px of extra breathing room top and bottom. This is a technique for surviving the taller Explore and profile-grid crop, not an official feed size.
- Always use 1080 by 1350 for anything boosted.
- Side safe margins: 72 px, the existing editorial padding.
- Re-verify this against current Instagram behaviour before any large production run. Check one exported set on a real profile grid and in Explore.

## 5. QC checklist

Run against every drafted carousel before publishing. A fail on any line sends it back.

1. Slide 1 is 8 words or fewer and contains a promise or a number.
2. Every slide except 1 and the last ends with an open-loop line.
3. No solution appears before the midpoint slot.
4. One idea per slide. Count them.
5. Every text pairing is in the pass table above.
6. Compliance pass: no banned phrase, every figure carries its source, "Individual results may vary" on any outcome claim, no product claim the landing page cannot support.
7. CTA to lunialife.com appears exactly once, on the last slide.
8. Caption closes with the standard follow line: For more Sleep-Science content follow @lunia_life. The brand bridge sentence and the entity line may follow it.
9. Fact check in the studio shows nothing to fix, or every fix applied.

## 6. Worked example

Source: "How sleep deprivation affects testosterone levels", saved carousel 4f1725e7, Editorial Scientific, 5 slides.

Before:

| Slide | Role today | Text |
|---|---|---|
| Hook | Promise | 3 SIGNS YOUR LOW DRIVE IS SLEEP, NOT STRESS. You blamed the workload. Check the nights first. |
| 2 | Sign one | THE NIGHTLY RISE RUNS LATE. Fragmenting sleep pushed the testosterone rise from 22:35 to 03:24. |
| 3 | Sign two | TRAINING SAME, RESULTS SHRINKING. One week at 5 hours lowered daytime testosterone 10 to 15 percent. |
| 4 | Sign three | CORTISOL LINGERS INTO THE EVENING. After six nights of four hours, the evening decline ran six times slower. |
| 5 | Takeaway | SLEEP IS AN ENDOCRINE INPUT, three recap points, "Send this". |
| 6 | CTA | MAGNESIUM, THEANINE, THEN LIGHTS OUT. Follow @lunia_life. |

What is wrong with it as a retention piece: the hook is 9 words, three parallel facts resolve nothing and build no tension, the solution never appears as a step the reader can take, and the CTA carries two asks (send, follow).

After, 10-slide:

| Slot | Hero line | Support line | Open loop |
|---|---|---|---|
| 1 Hook | Five hours of sleep cut testosterone 15 percent. | One week. Healthy men in their twenties. | |
| 2 Stakes | Your training did not change. Your nights did. | Strength stalls, drive drops, and the gym takes the blame. | It is not the reason you were told. |
| 3 Pain | The drop compounds. | Sleep loss also lifts evening cortisol, which makes the next night shallower again. | Most people fix the wrong half. |
| 4 Turn | More gym, more protein, more coffee. But the release happens asleep. | Most testosterone is released overnight, rising with the first REM block and peaking near waking. | The real lever is upstream. |
| 5 Idea 1 | Protect the first unbroken block. | Fragmented sleep pushed the nightly rise from 22:35 to 03:24 in one study. Cool, dark, no late alcohol. | That handles the start of the night. |
| 6 Idea 2 | Keep the middle quiet. | No screens in bed, no late caffeine, a fixed wake time. | The middle of the night needs something else. |
| 7 Idea 3 | Bring cortisol down before it lifts. | Ten minutes of dim light and slow breathing before bed. | Now the part that makes it stick. |
| 8 Proof | Six nights of four hours slowed the evening cortisol decline six times. | Leproult et al., 1997. Restore the nights and the curve recovers. | Which leaves one question. |
| 9 Objection | "I do not have time for more sleep." | You are not adding hours. You are protecting the first block you already spend. | So here is the only thing to do. |
| 10 CTA | Read the label, then decide. | lunialife.com | |

After, 5-slide:

| Slot | Hero line | Support line | Open loop |
|---|---|---|---|
| 1 Hook | Five hours of sleep cut testosterone 15 percent. | One week. Healthy young men. | |
| 2 Stakes | Your training did not change. Your nights did. | Strength stalls, drive drops, the gym takes the blame. | Here is why the usual fix fails. |
| 3 Turn | More gym, more protein. But the release happens asleep. | Most testosterone is released overnight, peaking near waking. | The fix is smaller than you think. |
| 4 Solution | Protect the first unbroken block. | Fragmented sleep pushed the rise from 22:35 to 03:24. Cool, dark, no late alcohol. | One more thing decides whether it holds. |
| 5 CTA | Read the label, then decide. | lunialife.com | |

What the new structure changed and why:

1. The hook went from 9 words and a claim to 7 words and a sourced number. A number stops a scroll; "3 signs" asks for effort.
2. Three parallel facts became stakes, pain, turn. The reader now has a reason to reach slide 5 instead of learning everything by slide 3.
3. The solution moved from implied to explicit steps, one per slide, each doable tonight.
4. The BUT pivot on slide 4 invalidates the method the reader is already using, which is where tension comes from.
5. The takeaway slide with three asks and a "send" interaction became one CTA with one ask.

Every figure above is already in the source carousel's citations: Luboshitzky 2001, Leproult and Van Cauter 2011, Leproult et al. 1997. Nothing new was introduced.

## Executing from this document

"Build me a carousel on cortisol and 3am wakeups":

1. Choose 10 slides if the subject has three separate levers, otherwise 5.
2. Fill the slot table in order. Write the open-loop line first, then the hero, then the support.
3. Pull every figure from the claims ledger or the carousel's own fact check. Hedge anything unsourced.
4. Run the QC checklist. Fix, do not argue.
5. Export 1080 by 1350. Use the 1440 export only for organic posts, never for boosted ones.
