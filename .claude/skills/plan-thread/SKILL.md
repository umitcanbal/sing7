---
name: plan-thread
description: Write a plan or design proposal as a commentable HTML page the owner reviews in Chrome, leaving comments that save back into the file. Use when the owner asks for a plan, design doc, or proposal to review — and on any later turn where they say they have saved comments in one of these pages.
---

# Plan-thread — reviewable plans with an inline comment thread

The owner is a frontend developer, new to Go and to backend concepts, who reviews best in a
browser. Instead of discussing a plan in chat, the plan lives in a self-contained HTML page
where each section carries its own comment thread. The owner comments in the browser; the
page writes those comments back into its own source file; Claude reads the file, replies in
place, and — once agreed — collapses the thread and rewrites the plan section to match.

The page is the single source of truth. Chat is only for "I saved" / "reload it".

## Creating a plan page

1. Read `assets/plan-template.html`, then create the page with a **single `Write`** to
   the repo root as `sing7-<topic>-plan.html` — template contents plus your filled-in
   sections, in one shot. **Do not `cp` the template and edit it afterwards:** a
   `PostToolUse` hook in `.claude/settings.json` watches the `Write` tool and opens any
   `*-plan.html` in Chrome the moment it is created. A `cp` is a Bash call, so the hook
   never sees it and the owner has to open the page by hand.
   (Name it `-plan.html`, not `-explained.html` — that pattern is gitignored and reserved
   for throwaway explanation artifacts. Plan pages hold agreed decisions, so they are
   committed.)
2. Replace `TITLE` (twice: `<title>` and `<h1>`) and the `INTRO` line.
3. Fill the `<script id="thread-data">` JSON with one object per plan section:
   - `id` — short kebab-case, unique, stable. It keys the draft storage, so **never
     rename an id** once the owner has commented.
   - `title` — numbered, e.g. `"3. Routing"`.
   - `plan` — the proposal. HTML is allowed (lists, tables, `<pre>`, `<code>`), so use it;
     this is the part that must survive as the final document.
   - `status` — `"open"` to start.
   - `entries` — `[]` to start.
4. Tell the owner to open it in Chrome, click **Connect this file**, pick the same file.

Keep sections small enough to agree on one at a time — one decision per section beats one
giant section nobody can accept or reject.

## The review loop

When the owner says they saved comments:

1. Read the page's `thread-data` JSON. New `{"author": "umit"}` entries are their comments.
2. For each one, append a `{"author": "claude", "text": "..."}` entry directly after it.
   A reply must contain **both**:
   - an honest evaluation — agree, disagree, or "yes but here's the cost". Never just
     comply; the owner is asking for judgement, not obedience.
   - a **concrete suggested change** to the plan text, specific enough to accept as-is.
3. Tell the owner to reload. One short line, not a summary of what you wrote — they are
   about to read it.

## Closing a section — two steps, never one

A section has three states: `open` → `proposed` → `resolved`. **Claude may move a section
to `proposed`. Only the owner's explicit agreement moves it to `resolved`.** Skipping the
middle state is the one thing this skill exists to prevent: it closes a decision using
wording the owner never saw, so they cannot push back on it.

**One block, not two.** A section's `plan` HTML *is* the record — the complete outcome,
not a summary of the argued-over parts. Agreeing to a section agrees to everything in it,
including the parts nobody commented on, so the text the owner approves must be the whole
thing. There is no separate one-line "agreed" field: a summary beside the real text would
drift out of sync and nobody would know which one governs. When a section resolves, that
same block simply turns green and is relabelled *Agreed*.

**Step 1 — propose.** When the discussion has converged:

1. Set `"status": "proposed"`.
2. Put the **complete rewritten section text** in `"proposedPlan"` and **leave `plan`
   untouched**. Not a diff, not the changed paragraph — the entire final wording,
   ready to stand alone. The page renders it in an amber "Proposed final text — not
   agreed yet" box, right under the current version, so the owner compares them.
3. Omit `proposedPlan` only when the discussion changed nothing and the existing text is
   already right. The box then says so explicitly.
4. Tell the owner it is waiting on their yes.

**Step 2 — the owner resolves it, not you.** The proposal box renders one button, which
only the owner can click: **Agree — close this section**. The page itself then sets
`resolved`, moves `proposedPlan` into `plan`, drops `proposedPlan`, and the owner saves.

So **Claude never writes `"status": "resolved"` — ever.** If you read a resolved section,
the owner clicked the button; that is the only way it can happen. Your job after a
resolve is nothing: the page already moved the text. Do not touch `plan` afterwards.

There is no reject button, because not clicking Agree already means "not agreed". If a
`proposed` section comes back with a new `umit` entry, that is the pushback: reply to the
objection and propose different wording. Never argue from inside the proposal box.

**Reopening.** A resolved section carries a quiet **Reopen** button. Pressing it sends the
section straight back to `open` — not to `proposed`, because re-showing the Agree button
would just invite re-agreeing to wording that was rejected. Reopening does **not** restore
the text as it was before the agreement; the current text is the starting point and the
thread holds the history. It does set `"wasResolved": true`, which puts an **Agree as-is
again** button on the reopened section so a change of mind (or a mis-click) costs nothing.
Both flags are the page's to write — leave them alone.

When a section you saw resolved comes back as `open` with `wasResolved` set, treat it as a
decision being reversed: ask why if the owner didn't say, and do not re-propose the same
wording.

**Why `open` sections have no Agree button.** The button means "there is a concrete final
text on the table". While a section is `open`, its `plan` text is Claude's *initial*
proposal and is **frozen** — never rewritten mid-discussion, however long the thread runs.
Changed wording only ever reaches the owner through `proposedPlan` in the amber box, so
they always see exactly what they are accepting. Do not try to make the plan block track
the conversation; that trades the one guarantee this whole page exists to provide.

## Shipping the finished plan

When the page is done, it becomes a Markdown document — `<same-topic>.md` beside the plan
page — that the *next* Claude Code session reads to implement from. The plan page stays as
the negotiation record; the `.md` is the output.

**Hard gate: every section must be `resolved` first.** If even one is `open` or `proposed`,
refuse to write the file, list exactly which sections are unfinished and what each is
waiting on, and stop. A half-agreed plan must never quietly become "the requirements".
The General thread is exempt — it never resolves.

Then write it by hand, exercising judgement — this is not a mechanical dump of the section
texts:

- **Markdown, not HTML.** The reader is a coding agent: no markup noise, cheap to read,
  diffs properly in git, sits naturally beside `CLAUDE.md`.
- **Drop the rejected alternatives.** "We considered nudging chords and rejected it" is
  negotiation history; the requirement is "chords render at their exact parsed column".
  Keep a rejected option only where knowing it prevents someone re-introducing it.
- **Reorder for building, not for arguing.** The plan page is ordered to make decisions;
  the document should be ordered to implement.
- **Add what the sections assumed** — a one-paragraph preamble saying what the app is,
  and the API endpoints it consumes.
- **Never invent a requirement that was not agreed.** If writing it up exposes a gap,
  say so and add a section to the plan page instead of quietly filling it in.

The discussion threads do **not** go into the `.md`, and the plan page is not deleted —
it stays as the record of *why*, which is the thing that is expensive to reconstruct.

## The General thread

Below the sections sits a **General** thread, held in a top-level `"general": []` array.
It belongs to no section and never resolves — there is nothing to agree to. It exists
because the sections are Claude's decomposition of the problem, and that decomposition
can simply be wrong: the owner needs somewhere to say "you left out X entirely" without
having to file it under a heading that doesn't fit.

Treat what lands there as the highest-signal feedback on the page. Reply in the same
thread, and:

- **If it names a topic the plan missed, add a new section for it** — a real one with its
  own `id`, `title`, `plan` and `entries` — and say in your General reply which section
  you added. Do not answer a missing-topic comment only in prose; it must become
  reviewable structure like everything else.
- **If it cuts across several sections**, reply in General and say which sections it
  changes, then propose new wording in each of those (never silently edit them).

## Write in plain English

English is not the owner's first language. Every word on the page — plan text, replies,
button labels, the how-to box — must be simple, everyday English. This is not a style
preference: a clever sentence they have to decode is worse than a plain one, because the
hard word hides the actual point.

- Short words, short sentences, active voice. If a word would send someone to a
  dictionary, swap it.
- No abstract phrasing. Real words that were too hard here: _knock-on effects_
  (→ side effects), _folded in_ (→ added), _converged_ (→ agreed), _load-bearing_
  (→ the important part), _corpus_ (→ the song files), _mechanical_ (→ automatic).
- Sounding plain is fine. Being clear beats sounding smart.

This rule is worth breaking a rule for: if plain English means rewriting the wording of a
section that is already `proposed`, do it, and say plainly that only the words changed and
no decision moved.

## Rules

- **Never edit or delete an `umit` entry.** Their words are the record. Add, don't revise.
- **Never write `"status": "resolved"`.** Resolving is a button the owner clicks; there
  is no case where Claude does it, including when a comment reads like a clear
  instruction ("yes, drop it", "I agree with all 5"). Agreeing with a *direction* is not
  approval of the *wording* that lands in the document. Propose, then wait.
- **Order matters.** Entries render in array order, so append rather than insert.
- **Escaping — read this before editing a `plan` value.** When the page saves, it
  rewrites the JSON and turns every `</` into a unicode escape for the `<`, followed
  by the slash. That is the minimum needed to stop a stray closing-script tag from
  ending the block early. Opening tags stay plain, closing tags do not.
  So an edit whose `old_string` contains a closing tag copied from your own draft
  **will not match the file**, and neither will the escaped form (the editor's
  auto-swap also converts `>`, which is never escaped here). Anchor edits on plain
  prose with no tags in it — that always matches.
- If a comment reveals a problem that spans several sections, reply in the section it was
  raised in and say which other sections are affected; don't silently edit those others.

## How the page works (for when the owner asks)

- The **File System Access API** gives the page a handle to one file, but only after the
  owner picks it in a native dialog — that click is the whole security model.
- The handle is kept in **IndexedDB** (keyed by filename) so it survives reloads;
  localStorage can't store handles.
- Unsaved typing is kept in **localStorage** as drafts, also keyed by filename, so two
  plan pages open at once never collide.
- Save reads the file's own text, splices the updated JSON into the `thread-data` block,
  and writes the whole file back.
- Chrome only. Other browsers fall back to downloading the updated file.
