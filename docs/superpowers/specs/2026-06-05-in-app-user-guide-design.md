# In-App User Guide — Design

**Date:** 2026-06-05
**Status:** Approved (design)
**Author:** PIT010

## Goal

Add an in-app **user guide** to PaySchedManager-next, modelled on the PMH System
onboarding guide (provided as reference screenshots). The guide teaches people how to
*use* the app in plain, non-technical language — "what you do / what it's for" — not
implementation detail.

## Decisions

- **Language:** English only (matches the app's English-UI convention).
- **Audiences:** two tabs — **User Guide** (everyday use) and **Admin Guide**
  (administration). Both tabs visible to everyone; the guide is documentation, not
  gated data.
- **Content source:** hard-coded as data in a TypeScript file (no DB, no editor).
- **Tone:** short, second-person ("you"), 1–3 sentences per item, plain words, no
  jargon. Each chapter opens with a "WHAT YOU'LL LEARN" callout, like the sample.

## Architecture

| File | Role |
|---|---|
| `app/(app)/guide/content.ts` | All content as data. `GuideAudience = "user" \| "admin"`. Each audience is an array of `chapters`; each chapter has `id`, `title`, `whatYoullLearn`, and `sections`. A section is either `{ kind: "prose", heading, body }` or `{ kind: "glossary", items: { term, definition }[] }`. |
| `app/(app)/guide/guide-view.tsx` | Client component. Two audience tabs, a chapter rail (numbered pills, ✓ when completed) with a progress bar + percent, the "WHAT YOU'LL LEARN" callout, section renderer, and **← Back / Next / Complete ✓** footer. |
| `app/(app)/guide/page.tsx` | Server wrapper (`requireUser`). |
| `app/(app)/layout.tsx` (edit) | Add a **"Guide"** nav entry (book icon). |

**Styling:** HP editorial theme (`eyebrow`, `font-title`, `hp-ink`/`hp-pink`/`hp-rule`/
`hp-inset`). Active pill = `hp-ink` fill; completed pill = `hp-pink` ✓; callout = left
accent border + `hp-inset` background; thin gold-equivalent progress bar with a percent
label, as in the sample.

**Progress tracking:** stored in `localStorage` (key per audience), no backend.
"Complete" marks the current chapter done; the rail shows ✓ and the percent =
completed ÷ total. Resettable; losing it only loses reading progress.

## Chapters

**User Guide**
1. Welcome & getting around — what the app is for, the left menu, sign in/out, light/dark.
2. Reading the dashboard — what each big number means, the timeframe buttons, the charts,
   clicking through to details, the Upcoming and Payment Issues lists.
3. Adding & managing schedules — add a recurring expense, what each field is for, edit,
   cancel/reactivate, find one quickly.
4. Recording a payment — mark something paid, attach the confirmation/approval photo,
   fix a mistake.
5. Importing from a spreadsheet — bring in many payments at once via CSV.
6. Everyday tips — small habits that keep the numbers honest.
7. Glossary — plain-words definitions (schedule, due date, run-rate, overdue, etc.).

**Admin Guide**
1. Welcome — what you can do as an admin.
2. People & access — add users, who is a User vs an Admin.
3. Setting up your lists — companies, vendors, payment accounts, payment types, expense
   types: what each is and why it matters.
4. Keeping things tidy — the change log (audit), deleting safely, watching late payments.
5. Glossary — a few admin-specific terms.

## Out of scope

- No database / admin editor for content (hard-coded).
- No translations (English only).
- No per-user server-side progress (localStorage only).

## Testing

Content is static data + a presentational client component. Verify via `tsc`, `next
build`, and a manual local read-through. No new unit tests (no new pure logic worth
testing; existing Vitest suite stays green).
