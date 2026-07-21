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
- **`akordy-format-spec.md`** — the authoritative `.txt` song-file format grammar and rules.
- **`akordy/`** — the 28 real song files. Use them as parser test fixtures. `akordy/.cursor/skills/strumming/SKILL.md` is the original format spec.

## Key decisions (already settled)
- Chord shapes: a backend base dictionary + per-file overrides (file wins → else base → else no diagram). Assumption A1 confirmed 2026-07-20.
- **No separate validator.** The parser is the only guardrail: it returns an error on malformed input, and the store logs and skips those files.
- Internal `Song` struct is never serialized directly — the API maps it to a separate response DTO.
- Songs with no section tags parse as one implicit section (`label = null`).

## Conventions
- Backend layout: `cmd/server`, `internal/song`, `internal/parser`, `internal/store`, `internal/httpapi`.
- Build the parser as a standalone, tested package first — it's the highest-risk part. Prove it against all 28 files in `akordy/` before wiring it into the server.
- Muted guitar string = `-1` in `frets`.
