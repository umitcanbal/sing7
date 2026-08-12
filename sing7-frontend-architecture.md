# SING7 — React App Architecture

How the React app is built. The *what* lives in `sing7-frontend-requirements.md`; this is the
*how*. Agreed section by section in `sing7-frontend-architecture-plan.html`, which stays as the
record of why each choice was made.

The SvelteKit app comes later and copies every decision here that is not React-specific.

---

## 1. The libraries, and the job each one does

The rule we picked them by: The point is to practise the real stack, so "we could
get away without it" is not a reason to drop something — but building a login screen just
because the doc lists an auth library would be inventing work.

| Library | Its job here |
| --- | --- |
| React 19 + TypeScript | The app. |
| Vite 8 + plugin-react | Dev server and build. |
| TanStack Router | Two routes, and it owns the `?q=` search value. |
| TanStack Query | Fetching the song list and each song, plus loading and error states. |
| Jotai | Scroll speed and is-it-running, shared between the control bar and the scroll code. |
| Tailwind CSS 4 | All styling. |
| webrpc generated client | Every backend call. Hand-written fetch is banned. |
| Zod | Checking the `?q=` value from the address — the one piece of genuinely unchecked input. |
| lucide-react | Play and pause icons. |
| class-variance-authority | Button variants, in one file. |
| Biome | Lint and format. |
| Vitest + Testing Library | Unit tests for the renderer and the scroll hook. |
| Playwright | One end-to-end run: search, open a song, scroll. |

Two are close calls, flagged rather than hidden. **Zod** mostly overlaps with the generated
webrpc client, which is already typed — its only real job is the search value from the address.
**class-variance-authority** is a lot of ceremony for about three buttons. Both are in for the
practice, not because the app is begging for them.

---

## 2. Project setup

The React app lives in `web-react/` at the repo root, beside the Go code, as its own project
with its own `node_modules`. Package manager: **pnpm**.

```
sing7/
├── cmd/ internal/ songs/ proto/    the Go backend
├── web-react/                      this app
├── web-svelte/                     later
├── sing7-frontend-requirements.md  what we are building
└── docker-compose.yml              later
```

**Stack:** Vite 8, React 19, TypeScript. `pnpm dev` in one terminal, `go run ./cmd/server` in
another.

### Talking to the backend while developing

The Go server is on `:8080` and Vite is on `:5173`. Different ports mean the browser treats
them as two different sites and blocks the calls (CORS). The fix is a **Vite proxy** — Vite
forwards anything starting with `/rpc` to `:8080`, so as far as the browser is concerned
everything comes from one place:

```ts
// vite.config.ts
server: {
  proxy: { "/rpc": "http://localhost:8080" }
}
```

This also matches how it works once deployed, with both behind one address, so there is
nothing to undo later.

---

## 3. Folder structure

```
web-react/
├── index.html
├── vite.config.ts
├── biome.json
├── package.json
└── src/
    ├── main.tsx                 boots React, Query and the router
    ├── styles.css               Tailwind import + the @theme values
    ├── routes/
    │   ├── __root.tsx
    │   ├── index.tsx            /            the song list screen
    │   ├── songs.$slug.tsx      /songs/xxx   the song screen
    │   └── $.tsx                             not found
    ├── rpc/                     COPIED IN BY HAND, never edited
    │   └── client.gen.ts
    ├── api/
    │   ├── client.ts            one configured client instance
    │   └── queries.ts           useSongList, useSong
    ├── song-list/               everything the / screen needs
    │   ├── SongRow.tsx
    │   ├── SearchBox.tsx
    │   └── filterSongs.ts       plain function, easy to test
    ├── song/                    everything that draws a song
    │   ├── SongBody.tsx
    │   ├── SongSection.tsx
    │   ├── SongLine.tsx
    │   ├── ChordPart.tsx
    │   ├── StrumGrid.tsx
    │   └── SongMeta.tsx
    ├── scroll/                  everything about auto-scroll
    │   ├── atoms.ts             the two Jotai atoms
    │   ├── useAutoScroll.ts     the scroll engine
    │   ├── AutoScrollEngine.tsx runs the engine, draws nothing
    │   ├── useScrollKeys.ts     the spacebar
    │   ├── useWakeLock.ts       keeping the screen awake
    │   └── ScrollBar.tsx        the floating control bar
    └── ui/
        ├── Button.tsx
        ├── Skeleton.tsx
        └── ErrorState.tsx
```

**Routes hold no logic.** A file in `routes/` fetches, handles loading and not-found, and
arranges the pieces. Everything else lives in a feature folder. That keeps the router
swappable, which matters because SvelteKit uses a different one.

**Grouped by feature, not by type.** There is no top-level `components/`, `hooks/` or `state/`
folder. A feature folder holds *everything* that feature needs — its components, its hooks, its
state, its plain functions. So `scroll/` holds the control bar, the scroll engine and the two
atoms, together.

Why this scales better than grouping by type:

- By type, one change touches many folders. "Make the speed slider stepped" means opening
  `components/`, `hooks/` and `state/`. By feature, it is one folder.
- By type, folders only grow. `components/` with 200 files tells you nothing about the app.
  Feature folders grow in number, not size, and the number is the shape of the app.
- By feature, deleting a feature is deleting a folder. By type, it is a hunt.

**What changes when the app gets big:** the feature folders move under a `features/` parent so
`src/` stays readable, and a feature past roughly ten files splits into sub-folders inside
itself. The rule does not change, only the depth.

Only `ui/` is grouped by type, because a button belongs to no feature.

---

## 4. Routing

**TanStack Router, file-based.** Routes are files, and the router plugin generates the
type-safe route tree.

```
src/routes/
  __root.tsx          the shell around every page
  index.tsx           /            the song list
  songs.$slug.tsx     /songs/xxx   one song
  $.tsx               anything else -> not found
```

**The search value lives in the address, and the router owns it.** `validateSearch` on a route
reads the query string, checks it, and hands you a typed object. This is where Zod earns its
place — the address is text a user can edit, so it is the one place with genuinely unchecked
input.

```ts
// routes/index.tsx
validateSearch: z.object({ q: z.string().optional() })
```

The search box reads `q` from the route and writes it back with a navigate call using
`replace: true`, which is TanStack Router's wrapper around `history.replaceState`. That is what
stops the history filling up with one entry per letter.

**Nothing else goes in the address.** Scroll speed and is-it-running are not shareable and not
worth a link, so they stay in Jotai.

---

## 5. Getting data from the backend

**TanStack Query** handles both calls. Two query hooks, nothing else:

```
useSongList()      -> ListSongs()      called once, at startup
useSong(slug)      -> GetSong(slug)    called when a song page opens
```

**Both queries get `staleTime: Infinity`.** The backend parses the song files once at boot and
serves them from memory, so a song cannot change under us. Query fetches once and then answers
from memory — no refetch when you switch tabs, no refetch when you come back to the list, no
flash of a loading state on the second visit.

**Why Query at all for two calls?** We could write two `useEffect` fetches. What it buys us:

- The loading, empty and error states from the requirements come for free, in one shape,
  instead of three hand-rolled `isLoading` flags.
- Going list → song → back does not refetch anything.
- The Retry button for "backend is down" is one call to `refetch()`.

### The API client is copied in by hand

The backend already has the script that turns `proto/sing7.ridl` into a TypeScript client. We do
not repeat that here — the generated file is copied into `src/rpc/` and never edited.

Because it is copied and not generated, **when the `.ridl` changes, the copy has to be made
again, by a person.** Nothing warns you. The copied file carries a comment at the top saying
where it came from and which command produces it — that comment is the only defence.

`src/api/client.ts` wraps the generated client with the base address, which comes from
`VITE_API_URL`, so it can be pointed at a real domain at deploy time.

### Filtering does not touch Query

The list is fetched once. Filtering happens inside a `useMemo` with two dependencies: the song
list, and the `q` from the address. `filterSongs` itself stays a plain function in `song-list/`,
so it can be tested with no React around it — the memo wraps it, it does not absorb it.

The `useMemo` is not there for speed; filtering 28 items costs nothing. It is there so the
filtered array keeps the same identity between renders when neither the songs nor the search
text changed. Without it, anything downstream that compares by identity — a memoized row, a
dependency list, an effect watching the list — breaks quietly.

---

## 6. Client state with Jotai

Almost nothing in this app is client state. The full list, in `src/scroll/atoms.ts`:

```
scrollSpeedAtom       number, 10-300, the percentage     persisted
isAutoScrollingAtom   boolean, is auto-scroll running    not persisted
```

**Why `isAutoScrolling` and not `isScrolling`:** the page scrolls when you turn the wheel too.
`isScrolling` would sound like "the page is moving", which is a larger and different idea.

**Why not `isPlaying`:** the button is a play button, but nothing is playing — no sound comes
out of this app. A reader seeing `isPlaying` would go looking for audio code. The button can
borrow music-player language because that is what people recognise; the code should say what it
does.

**Why Jotai and not `useState`:** these two values are read and written in two places far apart
in the tree — the control bar at the bottom, and the scroll loop that drives the window.
Passing setters down through the page would be the classic mess.

**Speed survives songs and reloads,** so `scrollSpeedAtom` uses `atomWithStorage`, Jotai's
localStorage-backed atom. One line, not a feature to build.

---

## 7. Who owns which piece of state

The rule this table protects: **each piece of state has exactly one owner, and is never copied.**
If two rows ever claim to own the same thing, that is the bug.

| State | Where it lives | Who writes it | Who reads it |
| --- | --- | --- | --- |
| The 28 songs | TanStack Query cache | `useSongList`, once | the song-list screen |
| One full song | TanStack Query cache | `useSong(slug)` | the song screen |
| Search text | the address, `?q=` | `SearchBox` | `filterSongs`, `SearchBox` |
| The filtered list | **nowhere** — worked out from the two rows above | — | the song-list screen |
| Scroll speed % | Jotai + localStorage | `ScrollBar` | `ScrollBar`, `useAutoScroll` |
| Is auto-scrolling | Jotai, memory only | `ScrollBar`, `useScrollKeys`, `useAutoScroll` at the end | `ScrollBar`, `useAutoScroll`, `useWakeLock` |
| Scroll position | **the browser** | the user, and `useAutoScroll` | `useAutoScroll` |
| Where the song starts on the page | a ref on `SongBody` | React, when it renders | `useAutoScroll`, to know where to jump |
| The position expected after each frame | a ref in `useAutoScroll` | `useAutoScroll` | `useAutoScroll`, to spot a hand scroll |
| The wake lock handle | a ref in `useWakeLock` | `useWakeLock` | `useWakeLock` |

Four kinds of state, and why each is where it is:

- **Server state** (the songs) is in Query, because it comes from elsewhere and has loading and
  error states.
- **State in the address** (the search) is there because it should survive Back and be
  shareable as a link.
- **Client state** (speed, is-running) is in Jotai, because two far-apart places need it and it
  belongs to no server.
- **Refs** hold what changes every frame or is not for drawing. Putting the expected scroll
  position in state would re-render the whole song sixty times a second, for nothing.

**The two rows that own nothing are the interesting ones.** The filtered list is not stored — it
is worked out. The scroll position is not stored either; the browser already has it, and a copy
in state would be two versions of one truth that must be kept in step. Those are the two places
this app would most easily go wrong.

---

## 8. Styling

**Tailwind CSS 4**, wired in with `@tailwindcss/vite`. Tailwind 4 has no `tailwind.config.js` —
the design values live in CSS in an `@theme` block, which suits us because the exact colours and
sizes are already agreed in the requirements.

```css
/* src/styles.css */
@import "tailwindcss";

@theme {
  --color-chord:   #1d4ed8;   /* deep blue, bold  */
  --color-lyric:   #202124;   /* near-black       */
  --color-quiet:   #61656b;   /* part names, (x2) */
  --text-lyric:    1.25rem;   /* 20px             */
}
```

So the decisions from the requirements become named values, used as `text-chord`, `text-lyric`
and so on. Change the chord blue in one line.

Plain Tailwind classes in components, with two exceptions:

- **Buttons** use class-variance-authority, in one `Button.tsx`.
- **The chord-over-lyric block** gets a few small CSS classes of its own in `styles.css`, not a
  long string of Tailwind classes. It is the one piece of real layout in the app, the thing most
  likely to need tuning, and a named class is easier to find and change than an inline list.

Phase 2 print will be one `@media print` block in the same stylesheet.

---

## 9. The components that draw a song

The backend hands us sections, then lines, then parts, and the components follow that shape
exactly — one component per level.

```
songs.$slug.tsx           the route: fetch, handle loading/404
└── SongMeta              title, artist, the grey info line
└── StrumGrid             one grid per pattern, or nothing
└── SongBody              the whole song
    └── SongSection       one part of the song ([Verse 1] or no name)
        └── SongLine      one line, and the (x2) note at its end
            └── ChordPart chord on top, its own text underneath
└── ScrollBar             floating at the bottom
```

### ChordPart

Where the whole app lives or dies. It draws one `{ chord, text }` pair as a stacked inline
block: the block flows and wraps like a word, the chord sits over the first letter of its own
text, and nothing is ever nudged.

```html
<span class="part">
  <span class="chord">Am</span>                <!-- left out when there is no chord -->
  <span class="text">Bones, sinking l</span>   <!-- left out when there is no text  -->
</span>
```

**Each half is left out when its field is empty.** That one rule covers most of the awkward
cases by itself, without anyone else having to know about them.

### SongLine

It does **not** pick between three markups. It renders one markup and picks the right CSS class:

```tsx
const hasChords = parts.some(p => p.chord);

<div class={cn("line", !hasChords && "line--no-chords", chordsOnly && "line--chords-only")}>
  {parts.map(p => <ChordPart ... />)}
  {annotation && <span class="annotation">{annotation}</span>}
</div>
```

| Kind of line | Where it is decided | What is different |
| --- | --- | --- |
| Chords over lyrics | — | Nothing. This is the default. |
| Lyric with no chord above it | `SongLine`: no part has a chord | A class removing the space the chord row would take, so it sits tight under the line before. |
| Chords only, no lyric | The backend says so — `chordsOnly` | A class that spaces the chords out. The parts have no `text`, so `ChordPart` already drops the text row. |

**There is no `LyricOnlyLine` or `ChordsOnlyLine` component,** and there does not need to be.
They would have identical markup and differ only by a class name, each used once. The real
difference between these lines is spacing, and spacing is what CSS is for.

Note the two different sources: `chordsOnly` is a field on the line from the backend, while
lyric-only is worked out here from the parts. Do not go looking for a `lyricsOnly` field.

**These components are pure.** Data in, markup out — no fetching, no state, no scroll knowledge.
That makes them the easy part to unit test, and it is why they port almost line for line to
Svelte.

---

## 10. The auto-scroll engine

All the scroll behaviour lives in one hook, `useAutoScroll`. It is the most stateful thing in
the app and the easiest to get subtly wrong, so it gets one home.

### The hook is not called by the song page

`useAutoScroll` is called inside `AutoScrollEngine`, a component that runs it and returns
`null`. The song page renders `<AutoScrollEngine songBodyRef={...} />` rather than calling the
hook itself.

Two reasons. The hook has no markup to contribute — it drives the window, it does not draw — so
its host should draw nothing either. And **a subscription costs exactly what the subscribing
component renders**: the hook subscribes to `scrollSpeedAtom`, so with it in the song page every
step of a slider drag re-rendered every section, line and part, while the frame loop was trying
to scroll. Behind the boundary the same change costs a `null` compared against a `null`,
whatever the length of the song.

`AutoScrollEngine.test.tsx` holds the line — it renders the same tree both ways and counts.

### How it moves

A `requestAnimationFrame` loop. Each frame it works out how far to move from the time since the
last frame and the speed:

```ts
const PIXELS_PER_SECOND_AT_100 = 10;   // the one named constant, tuned on real songs

pixels = (speedPercent / 100) * PIXELS_PER_SECOND_AT_100 * secondsSinceLastFrame;
window.scrollBy(0, pixels);
```

Using elapsed time rather than a fixed step per frame keeps the speed identical on a 60Hz and a
120Hz screen, and stops it slowing down when the browser is busy. Fractional pixels are fine —
the browser keeps the remainder.

### What the hook owns

- The frame loop, started and stopped by `isAutoScrollingAtom`.
- **Where it starts.** On play: if the page has not been scrolled yet, or we are at the end,
  jump so the first line of the song lands a lead-in below the top edge — about a quarter of the
  window down, so it is not gone the moment the scroll starts; otherwise carry on from here. It
  finds that position from a ref on `SongBody`.
- **Stopping at the end of the song**, not the end of the page, and flipping the button back to
  play. The song block carries its own tail space, so its bottom edge already allows for the
  control bar.
- **A hand scroll stops it.** The trick: our own `scrollBy` also fires a scroll event, so we
  cannot simply listen for scroll events. The hook records the position it expects after each
  frame; if the real position differs by more than a pixel or two, a human did it, so it pauses.

### useScrollKeys

The spacebar, on a window key listener: toggle play, and cancel the browser's default page-down.

Its own hook and its own effect: moving the page and reading the keyboard are different jobs,
each effect's dependency list then says only what that one thing needs, and `useScrollKeys` can
be tested with no fake scroll position and no hand-driven frames.

It ignores space when the focused element does something with the key itself: a text field types
a space, and **a focused button activates**. That second case is the one that bites — after you
click play with the mouse the button keeps focus, so space activates it. Toggling as well would
cancel out and the key would look dead.

It toggles with the updater form, so it never reads the atom and never re-renders.

### useWakeLock

A separate hook, because it is a different concern with its own failure rules: ask when
scrolling starts, release when it stops, do nothing at all if the browser refuses, and ask again
when the tab becomes visible if the scroll is still running.

Releasing matters as much as asking — a lock that is never released keeps the machine awake
forever — so it is released when the scroll stops *and* when the page goes away.

---

## 11. Tests and tooling

Enough tests to catch what would break silently, and no more.

**Vitest + Testing Library:**

- `filterSongs` — a plain function, so plain tests. Strict letter matching, empty query returns
  all 28, no match returns none.
- `SongLine` and `ChordPart` — the five awkward cases from the requirements, one test each. This
  is the app's real logic, and a mistake here looks like a slightly odd song rather than an
  error, so a human might never notice.
- `useAutoScroll` — the start-position rules, and that a hand scroll pauses it. Fake timers, fake
  scroll position.

**Playwright** for one end-to-end run, not a suite: open the app, type in the search box, check
the address gained `?q=`, open a song, press space, check the page moved.

It exists because every Vitest case mounts one piece on its own, in jsdom, with hand-written
data — so they would all pass with the router unwired, the proxy broken or the page failing to
mount. Nothing else starts the real app. It runs against the real Go server and asserts on real
songs, so both servers must be up; `webServer` reuses a dev server that is already running.

**Biome** for lint and format, one `biome.json`.

**Not tested on purpose:** the generated rpc client (not our code), Tailwind classes (a
screenshot test breaks on every design tweak), and TanStack Query itself.

### Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | the dev server |
| `pnpm check` | lint, then types, then unit tests — the one to run before committing |
| `pnpm lint` / `pnpm format` | Biome, reporting or fixing |
| `pnpm typecheck` | `tsc -b`. Vite strips types without checking them, so this is the only thing that does |
| `pnpm test` | Vitest, unit tests only |
| `pnpm test:e2e` | Playwright. Needs the Go server up; starts the dev server if it is not |
| `pnpm build` | production build |

---

## 12. What the SvelteKit app must copy

The whole point of building it twice is that the comparison is fair, so the SvelteKit app is not
a fresh design.

| Must be identical | May differ |
| --- | --- |
| The requirements document, all of it | Routing library (SvelteKit has its own) |
| The folder grouping: by feature, same names | How state is held (Svelte runes instead of Jotai) |
| The component split: Body / Section / Line / Part | Component file syntax |
| The 10 pixels-per-second constant | Test runner setup details |
| Tailwind, and the same `@theme` values | |
| The generated webrpc client | |
| What is tested, and the test cases | |

**Two things to settle before that app starts:** SvelteKit runs with `adapter-static` and
`ssr = false`, so it is a browser-only app like this one — otherwise we would be comparing a
server-rendered app against a client-rendered one and learning nothing. And TanStack Query has a
Svelte version, so §5 carries over almost unchanged.
