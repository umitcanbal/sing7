# SING7

A music app that shows song lyrics with chords above the words, auto-scrolls at the player's pace, and lets people play along. Read-only, no accounts.

## Stack

- **Backend:** Go — reads `.txt` song files, parses them, holds them in memory, serves read-only REST.
- **Frontend:** Next.js — consumes the API.
- **Song source:** the `akordy/` folder (one `.txt` file per song) is the source of truth. The app never writes songs.
- **Storage:** in-memory (parsed on startup). No database.
- **Runtime:** Docker.

## Where to look (read these first)

- **`sing7-build-steps.html`** — the ordered, actionable build plan. **Execute steps in order.** Each step has Goal / Implementation tasks / Done when / Result. Phase 1 = working app; Phase 2 = enhancements (chord diagrams, transpose).
- **`sing7-mvp-plan.html`** — the full technical plan: data model (§3), parser design (§4), chord shapes (§5), API contract (§7), architecture (§8), open assumptions (§11).
- **`akordy/`** — the 28 real song files. Use them as parser test fixtures. `akordy/.cursor/skills/strumming/SKILL.md` is the authoritative `.txt` song-file format grammar and rules.

## Key decisions (already settled)

- Chord shapes: a backend base dictionary + per-file overrides (file wins → else base → else no diagram). Assumption A1 confirmed 2026-07-20.
- **No separate validator.** The parser is the only guardrail: it returns an error on malformed input, and the store logs and skips those files.
- Internal `Song` struct is never serialized directly — the API maps it to a separate response DTO.
## Decision protocol

Whenever an implementation choice affects what the user sees or hears — chord alignment, what gets dropped, how something is rendered, any behaviour the owner could reasonably disagree with — **stop and ask before implementing**. Do not silently pick a side. State the options, give a recommendation, and wait for confirmation. The owner cannot push back on a decision they were never told was made.

## Conventions

- Backend layout: `cmd/server`, `internal/song`, `internal/parser`, `internal/store`, `internal/httpapi`.
- **Naming — package = layer, type = entity, one file per entity.** The backend is grouped by *layer* (`store`, `httpapi`, `parser`), not by domain. A package is the layer/role and stays a namespace; the *type* names the entity within it. So the song store is `store.SongStore` (loaded by `store.LoadSongs`) — not `store.Store` — and the songs API is `httpapi.SongAPI`. This keeps generic layer words (`store`) from being "used up" by one entity: a future entity slots in beside it as a **new file in the same package** (`internal/store/playlist.go` → `store.PlaylistStore`, `store.LoadPlaylists`), never by bloating an existing file. Each entity lives in its own file named after it (`internal/store/song.go`). Only revisit a full domain-package split (`internal/playlist/…`) if one layer package genuinely grows heavy — decide then, with real weight, not speculatively (note: a split that moves the store into `song` would force the standalone parser to merge in too, due to a `parser`↔`song` import cycle).
- Build the parser as a standalone, tested package first — it's the highest-risk part. Prove it against all 28 files in `akordy/` before wiring it into the server.
- Muted guitar string = `-1` in `frets`.
- **Documenting corpus quirks — one discipline, one lookup.** Every quirk the corpus reveals is recorded by **how the parser treats it today**. Never leave a known quirk undocumented, and always state plainly whether the parser handles it. Do it in the same change that introduces/handles the quirk — proactively, without waiting for the owner to notice.

  First decide **where the fix belongs — the file or the parser** — because that decides which list it goes in:

  | Parser behaviour today                                                                         | Fix belongs in        | Document it in                                                                                 | Code marker                                                     |
  | ---------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
  | Handled correctly (right output)                                                               | —                     | a variation in `sing7-mvp-plan.html` §2                                                        | —                                                               |
  | Handled, but drops user-facing info (file is valid)                                            | parser                | §2 variation (detail) **+** the _Known parser limitations_ list in §6.3                        | —                                                               |
  | Handled only by quirk-specific tolerance code                                                  | the file (eventually) | §2 (or §6.3)                                                                                   | `NORMALIZE-REMOVABLE:` comment on the code, with a §6.3 pointer |
  | **Not** handled — parses but renders stray/garbage output or loses info (file is non-standard) | the file              | the §6.3 _Known inconsistencies_ list, "Parser today" column stating the exact wrong behaviour | — (no code exists)                                              |

  Key split: **§6.3 has two mirrored lists** — _Known inconsistencies (fix in the files)_ for non-standard files, and _Known parser limitations (fix in the parser)_ for valid files the parser doesn't yet fully represent. Never put a parser gap in the files list or vice-versa. §2 is the format's living spec (and the normalizer's input); `grep -rn NORMALIZE-REMOVABLE` lists every toleration deletable once `akordy/` is normalized.

- **Finish the ripples of a change, in the same change.** When you change one thing — a struct field, a function's contract, a format rule — find every other place that must stay consistent with it (its tests, its documentation, and any parallel representation of the same thing: worked examples, JSON samples, DTOs, the plan docs) and update them together. Then state which places you updated and which you deliberately left, and why. A change is not done while a mirror of it is stale. Prefer one source of truth with few mirrors; when a mirror is unavoidable, updating it is part of the change, not a follow-up.
- Don't hide a meaningful call inside an `if` init statement. When the call itself matters (not just the boolean it produces), assign it to a variable on its own line, then test the variable. Prefer:
  ```go
  err := http.ListenAndServe(address, mux)
  if err != nil {
      log.Fatalf("server error: %v", err)
  }
  ```
  over `if err := http.ListenAndServe(address, mux); err != nil {`. The `if x := f(); cond` form is fine only when `f()` is only needed for the condition and exists purely for the condition (e.g. a map lookup: `if v, ok := m[k]; ok`).

## Change artifacts (explain non-trivial work)

The owner is a **frontend developer** who is **new to Go and to backend concepts in general**, and reviews changes best in a **visual, browser-readable HTML page**. So: whenever you complete an implementation that is **more than trivial**, also create a self-contained HTML artifact that explains and navigates it.

These artifacts are **one-off and throwaway**: the owner reads one to understand a change, then deletes it. So nothing may depend on a specific past artifact persisting — **this template below is the single source of truth for the structure**, not any example file.

- **When to create one:** a new package or feature, multi-file changes, or any non-obvious logic. **Skip** for trivial/mechanical edits (typo, rename, one-liner, config tweak, pure test changes). When unsure, lean toward creating one; ask if still unsure.
- **Where / naming:** repo root, `sing7-<topic>-explained.html`. Because they are throwaway, they are **gitignored** (via the `sing7-*-explained.html` pattern) — never commit them.
- **Audience:** a frontend developer new to Go _and_ to backend concepts. Explain plainly, define the Go concepts **and backend concepts** actually used (e.g. in-memory store, DTO, REST handler, serialization), and lean on frontend/TypeScript analogies where they help (a struct ≈ a TS interface + its data; a DTO ≈ the JSON shape your API returns). Say _why_ as well as _what_. Keep it simple; match the visual style (paper card, Arial, accent colours) of the persistent plan HTMLs (`sing7-build-steps.html`, `sing7-mvp-plan.html`). **Inline code / identifiers** (e.g. `Song`) must stay legible even inside tinted callout blocks: render them as italic, bordered chips, and give them a white background when they sit inside a coloured callout so they stand out from the surrounding prose. Block code inside `<pre>` stays upright (not italic).

**Template — the sections to include (a living structure; improve it over time):**

At the **very top of the page**, before anything else, put a **kickoff prompt**: a visually distinct, clearly-labelled, copy-pasteable block the owner can paste straight into a new Claude Code session to start an isolated Q&A about this change (the owner reviews artifacts in a fresh session, keeping the main build thread uncluttered). Fill in the **real file paths** for this change so the owner never has to type filenames. Use roughly this wording:

> Read `sing7-<topic>-explained.html` and the files it documents — `<actual source paths for this change, e.g. internal/parser/*.go>`, including their tests. I'm a frontend developer, new to Go and to backend concepts, and want to understand this change; I'll ask questions. Please answer clearly, simply and most importantly briefly (Default to 3 sentences or fewer and I will iterate if needed) and don't modify any files.

Then the explanatory sections:

1. **The one job** — a one-paragraph plain-English summary of what the change does.
2. **Big picture** — a flow/diagram of inputs → the change → outputs.
3. **Go ideas used** — only the concepts relevant to reading these files.
4. **Review roadmap** — a numbered order of which file to open first and why (typically: destination/data shape → entry point → engine → self-contained leaf).
5. **Dependency/call tree** — an ASCII tree showing how the files/functions relate.
6. **Per-file responsibility** — one card per non-test file: its job, key functions, and _why it exists separately_.
7. **Notable decisions & surprises** — trade-offs made, corpus/edge-case surprises, and any open questions for the owner to decide.
8. **See it working** — the commands/tests to run.
9. **Where it fits** — the change's place in the build plan.

When the owner suggests improvements to this structure, update this template so future artifacts get better.
