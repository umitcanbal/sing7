# SING7 — Frontend Requirements

What the frontend must do. Agreed section by section in `sing7-frontend-requirements-plan.html`,
which stays as the record of *why* each choice was made. This file is the *what*.

These requirements are framework-free on purpose. Two apps will be built from them —
one React, one SvelteKit — and both must behave the same.

---

## 1. What the app is

SING7 shows song lyrics with the guitar chords printed above the right words, and scrolls
the page by itself at a speed the player sets, so you can play along with both hands on the
guitar.

- **Read-only.** No accounts, no login, no editing songs in the app.
- **The songs come from the backend**, which reads `.txt` files and parses them.
- **Built for a desktop or laptop browser**: a wide window, a mouse, a keyboard.
  Phones and tablets are Phase 2.

### Who is using it

Someone with a guitar in their hands, reading a screen at roughly arm's length. They touch
the computer maybe twice per song: start the scroll, adjust the speed. That is why the text
is bigger than a normal web page, and why the controls stay visible while playing.

---

## 2. Scope

**In the first version**

| Feature | Why |
| --- | --- |
| Browse and search the song list | You cannot play a song you cannot find. |
| Song page: chords above lyrics | This is the whole point of the app. |
| Auto-scroll with a speed control | This is the reason it beats a paper sheet. |
| Strum grid, when the song has one | 9 of the 28 songs have one, and it is free to show. |

**Phase 2 (later, but real)**

- Chord diagrams — click a chord, see where the fingers go.
- Transpose — move every chord up or down.
- Print (see §10).
- Phone and tablet support.

**Never**

Accounts, editing songs inside the app, offline mode, a native phone app.

---

## 3. The API it talks to

The backend is a Go server using webrpc. The contract lives in `proto/sing7.ridl`, and a
generated TypeScript client is in `proto/client.gen.ts`. Generate the client into each app
rather than hand-writing fetch calls.

Two calls:

| Call | Purpose |
| --- | --- |
| `ListSongs(q?)` | Every song, sorted artist then title. `q` filters by title or artist. |
| `GetSong(slug)` | One full song. Returns a `SongNotFound` error (HTTP 404) for an unknown slug. |

**The frontend calls `ListSongs` once at startup with no `q`, and never calls it again.**
The `q` field goes unused for now — it exists for the day the library is too big to send in
one go. `GetSong` is called when a song page opens.

The shape the song page renders:

```
Song
  slug, title, artist
  meta        key, capo, time, tempo, year, notes[]
  strum[]     label, strokes, beats
  chordShapes map of chord name -> { frets[], source }   (Phase 2: diagrams)
  sections[]  label?, lines[]
                lines[]  chordsOnly, annotation?, parts[]
                           parts[]  chord?, text?
```

A `Section` with no `label` is a song with no part names — 13 of the 28 songs are like this.

---

## 4. Screens and addresses

```
/                     the song list, with a search box
/songs/<slug>         one song — the page you play from
/songs/<unknown>      a "not found" screen with a link back
```

The slug comes from the backend and looks like `coldplay-dont-panic`.

### The search text lives in the address

`/?q=panic`. **The address is the only place the search is kept.** The app reads it and
filters; the search box shows what the address says, never the other way round.

That single rule gives three things for free: pressing Back after opening a song brings the
filtered list back, reloading keeps the search, and a filtered list can be shared as a link.

**Keep the address in step with `history.replaceState()`, not `pushState()`.**
`replaceState` overwrites the address of the page you are already on — no request, no
reload, no navigation, and the history does not grow while you type. `pushState` would add
one entry per letter, so Back would walk the user through `pani`, `pan`, `pa`.

The list's scroll position is not remembered. With 28 songs the list is short, and after a
search it is shorter still.

---

## 5. The song list screen

**Fetch the whole list once, then filter it in the browser as you type.** No request per key
press, no debounce, no spinner between letters. The whole list is a few kilobytes.

**Filter the list itself. No dropdown.** You type and the list shrinks — 28 rows become 1.
Click a row to open the song.

```
┌──────────────────────────────────────┐
│ SING7            [ panic          ]  │  you type here
│                                      │
│  Coldplay                       F    │  the list itself
│  Don't Panic                         │  shrank: 28 rows
│                                      │  became 1
└──────────────────────────────────────┘
 address:  sing7.com/?q=panic
```

**One row shows:** title on top, artist under it, and the key (like `F`) on the right if the
song has one. Sorted artist then title — the order the backend already sends. One flat list,
no artist headings.

**Matching is strict: the letters must match exactly.** Typing `severni` does not find
*Severní vítr*, because `i` and `í` are different letters. This is accepted for the first
version. What matters is that the browser filter and the Go search behave identically, so
they cannot drift apart. Ignoring accents is a nice-to-have; when it is added, it is added
to **both** sides in the same change.

---

## 6. The song screen

```
┌──────────────────────────────┐
│ ‹ back      Don't Panic      │  title and artist
│             Coldplay         │
│ Key F · Capo 0 · 122 BPM     │  small info line
├──────────────────────────────┤
│ Intro / verse                │  strum grid, if the
│ ↓ · x ↑ · ↑ ↓ ↑              │  song has one
│ 1 & 2 & 3 & 4 &              │
├──────────────────────────────┤
│ [Verse 1]                    │  the song itself
│  Am              C           │
│ Bones, sinking like stones   │
│         Fmaj7                │
│ All that we fought for       │
│                              │
│ (extra space so the last     │
│  line clears the bar)        │
├──────────────────────────────┤
│ ▶  speed ──────●──── 100%    │  control bar, floats
└──────────────────────────────┘  over the song
```

**The info line** shows only what the song file actually has — key, capo, tempo, time, year
— and quietly skips the rest. `meta.notes` (YouTube links, sources, Czech labels the parser
did not map) goes into a closed "Song info" box at the very bottom. It is reference
material, not something you read while playing.

**The control bar floats at the bottom of the window**, over the song. The song also gets
extra space at its end, the same height as the bar, so the last line can always scroll clear
above it. Floating *and* the extra space — the bar is always in reach and never covers
anything you still need to read.

**The strum grid sits near the top, above the song, and does not float.** A strumming
pattern is one bar long and repeats for the whole song, so a player checks it before
starting and then never looks again. It does not need to stay on screen, and it does not
need a button to hide it.

---

## 7. Drawing chords above lyrics

This is the core of the app. The backend gives each line as an ordered list of parts. Each
part is one chord plus the text that follows it:

```
{ chord: 'Am',    text: 'Bones, sinking l' }
{ chord: 'C',     text: 'ike stones' }
```

**Each part becomes a small block: the chord on top, its own text underneath. The blocks
flow and wrap like words in a paragraph.**

```
Am               C
Bones, sinking like stones
```

**Spacing.** The text pieces sit flush against each other, so a lyric reads as one normal
sentence. A gap only opens when *one part's chord name is wider than that same part's text*
— for example `{ chord: 'Fmaj7', text: 'a' }`, where the chord cannot fit above a single
letter. That block stretches to fit the chord, and the gap lands at the **end** of the part,
pushing the next part right. It never opens inside a word. Most parts hold several words, so
this is rare.

**Long lines wrap; nothing shrinks.** When a row runs out of width, the next block drops to a
new line. Each chord stays glued to its own text, so wrapping never breaks the alignment.
Never shrink the font to make a line fit — then every song would be a different size, and
small text is the wrong answer at arm's length.

> **Do not switch to a fixed-width font.** Copying the `.txt` layout exactly (chord row above,
> lyric row below, spaces preserved) is easier to build and matches the file perfectly, but a
> long line either runs off the side or wraps and destroys the alignment. It also could never
> move to a narrow screen, which would kill the Phase 2 phone work.

### The awkward lines

| Case | What to do |
| --- | --- |
| **A chord lands mid-word.** About 500 places in the song files do this — Don't Panic splits `Bones, sinking l` / `ike stones`. | Draw it mid-word, exactly as the file says. |
| **A lyric line with no chord above it** — the previous chord is still ringing. | No empty chord row. Just the lyric, close under the line before. Reserving blank space would almost double the height of a song. |
| **A chords-only line** (intro or interlude, no lyric under it). | Chords on their own row, spaced out, with no empty lyric line beneath. |
| **A note at the end of a line** like `(×2)` or `(×4 takty)` — 12 of the 28 songs. | Show it at the end of that line, greyed out, exactly as written. Never drop it. |
| **A part of the song with no name** — 13 of the 28 songs have no section tags. | No heading, no placeholder, no "Untitled". The song just starts. |

**The app never moves a chord.** Not by one pixel. Nudging chords to the nearest word start
would tidy about 500 lines, but the app would then quietly disagree with the file it is
drawing. A song that looks wrong is a bug in that `.txt`, fixed once for everybody — not a
rendering quirk nobody can track down.

---

## 8. The strum grid

9 of the 28 songs carry one or more strumming patterns. Each is a label, a row of strokes,
and a row of beats, one mark per slot:

```
Intro / verse
↓ · x ↑ · ↑ ↓ ↑
1 & 2 & 3 & 4 &
```

- The two rows must line up column by column. **This is the one place a fixed-width font is
  correct.**
- Slot counts vary — 4, 5, 8 and 12 all appear. A 12-slot grid must still line up. If it runs
  out of width, the grid alone scrolls sideways rather than wrapping.
- A song with several patterns shows them **all, one below the other, each with its label.**
  No tabs, no carousel, no picking one.
- A song with no pattern shows nothing at all. No empty box.

**Known backend limit:** every pattern is collected into one flat list. A pattern labelled
"Outro" keeps its label but has no link to the outro part of the song, so it can only be
shown in the list at the top, not next to the outro. Fixing that is a backend change and is
out of scope here.

---

## 9. Auto-scroll

The feature that makes the app worth building.

- **Move smoothly, not in jumps.** The page creeps down a fraction of a pixel per frame,
  rather than jumping a line every few seconds. Jumping makes you lose your place.
- **Play and pause** as one big obvious button, **and the spacebar does the same thing.**
  This is the point of the whole app: both hands stay on the guitar, and reaching for the
  mouse mid-song is the thing we are trying to avoid. The shortcut also has to exist for a
  second reason — the browser's own default for space is "scroll down one screen", which
  would fight the auto-scroll. So space must be captured and its default cancelled whether
  we use it or not. Ignore it while the user is typing in the search box.
- **Speed is a percentage** — a slider with the number next to it. The range is about 10% to
  300%. A number you can learn beats a position you guess.
- **100% = 20 pixels per second.** This must be one named constant in the code, not a feel.
  It is set so a typical rendered line — a chord row plus a lyric row, around 60px tall —
  takes about three seconds to pass, which is roughly how long a sung line lasts. The
  constant can be tuned once real songs are on screen, but it is tuned in one place and both
  apps use the same number, or the React build and the SvelteKit build will scroll at
  different speeds.
- **Scrolling by hand stops it,** exactly as if you pressed pause.
- **It stops at the bottom,** and the button goes back to "play".
- **The speed is remembered** across songs and reloads. One setting for all songs, not one
  per song — otherwise the app fills up with settings nobody chose on purpose.
- **No countdown** before it starts. The scroll begins as soon as you press play.

### Where it starts from

There is no fixed starting height: one song has a strum grid above the words and another does
not, so the first lyric line sits at a different place on every song.

**"The top" always means the first line of the song, not the top of the page.** The title,
info line and strum grid scroll away — you read those before you started.

| When you press play… | What happens |
| --- | --- |
| You just opened the song and have not scrolled | Jump to the first line of the song, then start scrolling. |
| You stopped in the middle to work on a chord | Carry on from exactly where you are. No jump. |
| The scroll reached the bottom and stopped | Jump back to the first line of the song and start again. |

The song block is one element, and the browser reports how far down it starts, so this works
for any song whatever sits above the words.

### Keeping the screen awake

**The screen must not go to sleep while scrolling, and this does not happen by itself.** The
computer decides you are idle from real input — keyboard, mouse, trackpad — and a page
scrolling itself is not input. Without help the screen dims mid-song.

Use the **Wake Lock API** while the scroll is running, and **release it the moment the scroll
stops**. Releasing matters as much as asking: a lock that is never released keeps the machine
awake forever.

**The lock can fail, and the app must not care.** Two things happen in real use:

| What happens | What the app does |
| --- | --- |
| The browser refuses the lock, or does not support it | **Keep scrolling. Say nothing.** No warning, no banner, no disabled button. The screen may dim, which is a small annoyance; stopping the music over it would be a big one. |
| The user switches tab or minimises — the browser drops the lock by itself | Nothing at the time. When the tab is visible again **and the scroll is still running, ask for the lock again.** |

So the rule is: the lock is a bonus, never a requirement. Scrolling never waits for it,
never stops because of it, and never tells the user about it.

---

## 10. How it looks

**Chords are a different colour from the lyrics.** Lyrics are near-black on white. Chords are
a strong deep blue, and bold. The eye is doing two jobs at once — reading the words, and
catching the next chord change before it arrives — so the two must not look the same.

```
Am               C            <- deep blue, bold
Bones, sinking like stones    <- near-black, normal
```

**Everything else stays quiet** so those two levels stand out:

- Part names like `[Verse 1]`: small, grey, with space above the lines they head.
- Notes at the end of a line like `(×2)`: grey, smaller.
- The info line (key, capo, tempo): grey, small.
- The strum grid: fixed-width font, near-black, no colour.

**Sizes.** Lyrics are bigger than a normal web page — around 18–20px — because you are reading
at arm's length with a guitar in the way. Chords are the *same* size as the lyrics, not
smaller: they are the thing you are looking for.

**Colour is never the only signal.** Chords already sit on their own row above the words, so
the page reads perfectly for someone who cannot tell the colours apart. Colour only makes it
faster. This also means printing in black (Phase 2) loses nothing.

---

## 11. Loading, empty and broken states

| Situation | What the player sees |
| --- | --- |
| The song list is loading | Grey placeholder rows, roughly song-shaped. Not a spinner. The page must not jump when the real list arrives. |
| The search finds nothing | "No songs match *xyz*" and a clear button. Not a blank screen. |
| A song is loading | Title and artist appear straight away if we already have them from the list. The rest fills in after. |
| Unknown slug (404 from the backend) | "That song isn't here" and a link back to the list. |
| The backend is down | A plain message and a Retry button. No error dump, no spinner forever. |

**The app remembers nothing.** No cache, no list of previously opened songs. This keeps the
"no offline mode" rule clean — caching recent songs always sounds cheap and then turns into
questions about stale data, for a feature nobody asked for.

---

## 12. Print (Phase 2)

Not built in the first version. Written down so it is not re-argued later.

Pressing Cmd+P should give a clean sheet with the song and nothing else. The mechanism is a
print stylesheet on the existing song page — CSS has a second set of rules that only apply
while printing:

```css
@media print {
  .controls, .search, nav { display: none; }
  body { background: white; color: black; }
}
```

Same page, same HTML, no second version and no extra route. A print button is optional and not
recommended: it would just call `window.print()`, which is what Cmd+P already does.

**What prints:** title, artist, info line, strum grid and the song. Black on white. A part of
the song should not be split across two pages if it can be avoided, and a chord must never be
separated from the word beneath it by a page break.
