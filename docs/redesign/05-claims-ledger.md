# The claims ledger

A framework so a number never reaches a slide or an email from memory again. Built 2026-09-02 after
a published carousel swapped Keenan 2011's black tea and green tea L-theanine figures.

## The rule

Every figure the studio publishes comes from the ledger or ends up in it. The ledger is keyed by the
subject library, so coverage is measurable: which subjects have sourced facts on file, and which do not.

## The four gates

1. **Before writing.** When a carousel or email is generated for a library subject, the ledger is
   read. Verified facts are appended to the prompt as figures to quote verbatim with their source.
   Sourced but unreviewed facts are appended below them, marked as such. If the subject has nothing on
   file, research runs first (about a minute, primary sources only, attribution rules in the prompt)
   and the results are used and filed as pending. The brief shows what is on file for the chosen
   subject before you press Generate. Code: `src/lib/facts-gate.ts`, both generate routes.
2. **After writing.** Every carousel is fact-checked automatically after its first save, no click.
   The verifier's rule "cited source wins" fails a figure attributed to a named paper when that paper
   says otherwise, and states the correct figure. Code: `VerificationPanel autoRun`,
   `src/lib/verification.ts`.
3. **Into the ledger.** Every claim that passes with a source is filed as a verified fact under the
   carousel's subject. Edited units are never filed, so a corrected slide cannot re-seed its old claim.
   Code: `src/lib/facts-file.ts`, `api/facts/seed`.
4. **When a fact changes.** Editing a statement keeps the old one; retracting keeps the fact. The
   Facts screen hunts the earlier value across every saved carousel and email and lists them with
   Open. Code: `api/facts/propagate`, `findCarriers`.

## Coverage

`api/facts/coverage` reports verified and pending counts per subject. A Vercel Cron job researches
the next three uncovered subjects every night at 05:30 UTC (`api/facts/research-batch`), and the
Facts screen has "Research the next 2 now". Subjects that returned nothing are retried after 14 days.
At the time of writing: 12 of 433 subjects covered, 421 to go, so full coverage takes about five
months on the nightly schedule, or an afternoon of pressing the button.

## Review

Researched facts arrive as pending. Pending facts are quoted with a "not yet reviewed" label; verified
facts are quoted as ground truth. Approve, edit, retract and delete live on the Facts screen under
Library. The dialog asks for the figure, its condition, the citation, the URL and a verbatim quote.

## Backend touches, stated plainly

- KV collection `lunia:facts` and a small `lunia:facts:research-attempts` map. Additive.
- Routes: `api/facts` (GET, POST), `api/facts/[id]` (PATCH, DELETE), `api/facts/seed`,
  `api/facts/research`, `api/facts/research-batch`, `api/facts/coverage`, `api/facts/propagate`.
- One prompt block in `carousel-v2/generate` and `campaign/generate`, one fire-and-forget hook after a
  verify run, one rule added to the verifier prompt.
- Middleware lets a request through when it carries `Authorization: Bearer <CRON_SECRET>`, which is
  how Vercel Cron authenticates. Set `CRON_SECRET` in the Vercel project for the nightly batch to run;
  the route rejects anything else.
- `vercel.json`: the cron entry and function durations for the two research routes.

## What it does not do yet

- Emails are not fact-checked after save; the verifier is wired for carousels only, as before.
- Free-typed topics that are not in the subject library are not auto-researched. Add the topic as a
  subject first, or research it from the Facts screen with a custom subject text.
- No claim linting while typing. That was removed from scope by decision.
