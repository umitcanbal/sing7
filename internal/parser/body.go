package parser

import (
	"strings"

	"sing7/internal/song"
)

// chordColumn is one chord found on a chord row, together with the rune column
// its first character sits in. Columns are rune-based so multibyte Czech and
// Italian lyrics stay aligned.
type chordColumn struct {
	col   int
	chord string
}

// parseBody walks the body lines and produces the sections, the song-level
// strum patterns, and the per-file chord shapes. It is a small state machine:
// the first rule that matches a line wins. Structural lines (section tags,
// chord definitions, strum rows, TAB, chord rows) are recognised first;
// anything non-blank that matches none of them falls through to plain text —
// lyric words, or a strum/TAB label, depending on where it sits.
func parseBody(body []string) ([]song.Section, []song.Strum, map[string]song.ChordShape) {
	var sections []song.Section
	var strums []song.Strum
	shapes := map[string]song.ChordShape{} // must be initialised: writing a key to a nil map panics
	current := -1                          // index of the section lines are appended to; -1 until one opens

	// addLine appends to the current section, opening an implicit (unlabelled)
	// section first if none is open yet.
	addLine := func(line song.Line) {
		if current == -1 {
			sections = append(sections, song.Section{Label: ""})
			current = len(sections) - 1
		}
		sections[current].Lines = append(sections[current].Lines, line)
	}

	for i := 0; i < len(body); {
		raw := body[i]
		trimmed := strings.TrimSpace(raw)

		switch {
		case trimmed == "":
			i++

		case isSectionTag(trimmed):
			label := strings.TrimSpace(trimmed[1 : len(trimmed)-1])
			sections = append(sections, song.Section{Label: label})
			current = len(sections) - 1
			i++

		case chordDef(raw) != nil:
			name, shape := chordDefParts(raw)
			shapes[name] = shape
			i++

		// Strum block with no label: strokes row directly over a beats row.
		case isStrokesRow(raw) && i+1 < len(body) && isBeatsRow(body[i+1]):
			strums = append(strums, song.Strum{
				Strokes: strings.TrimSpace(raw),
				Beats:   strings.TrimSpace(body[i+1]),
			})
			i += 2

		// Strum block with a label line directly above the strokes/beats rows.
		case i+2 < len(body) && isPlainText(raw) && isStrokesRow(body[i+1]) && isBeatsRow(body[i+2]):
			strums = append(strums, song.Strum{
				Label:   trimmed,
				Strokes: strings.TrimSpace(body[i+1]),
				Beats:   strings.TrimSpace(body[i+2]),
			})
			i += 3

		// TAB staff line, and the free-text label directly above one, are
		// recognised and skipped — the model has no place for tablature.
		case isTabLine(raw):
			i++
		case i+1 < len(body) && isPlainText(raw) && isTabLine(body[i+1]):
			i++

		case isChordRow(raw):
			cols, _ := chordColumns(raw)
			_, annotation := splitTrailingNote(raw)
			if i+1 < len(body) && isPlainText(body[i+1]) {
				// Chord line (G): attach chords to the lyric beneath it.
				addLine(song.Line{Parts: splitLyric(cols, []rune(body[i+1])), Annotation: annotation})
				i += 2
			} else {
				// Chords-only line (E): a progression with nothing beneath it.
				parts := make([]song.Part, len(cols))
				for j, c := range cols {
					parts[j] = song.Part{Chord: c.chord}
				}
				addLine(song.Line{ChordsOnly: true, Parts: parts, Annotation: annotation})
				i++
			}

		default:
			// Lyric with no chord row above it: the previous chord is still
			// held (§2.5). Store the words with no chord attached.
			addLine(song.Line{Parts: []song.Part{{Text: raw}}})
			i++
		}
	}

	return sections, strums, shapes
}

// isSectionTag reports whether a trimmed line is a bracketed section tag.
func isSectionTag(trimmed string) bool {
	return len(trimmed) > 2 && strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]")
}

// isPlainText reports whether a line is non-blank text that matches none of the
// recognised structural line-types. It is defined negatively on purpose — it is
// the fallback bucket. What such a line *means* depends on where it sits: lyric
// words beneath a chord row, or a free-text label above a strum or TAB block.
func isPlainText(raw string) bool {
	if strings.TrimSpace(raw) == "" {
		return false
	}
	trimmed := strings.TrimSpace(raw)
	if isSectionTag(trimmed) || chordDef(raw) != nil || isStrokesRow(raw) ||
		isBeatsRow(raw) || isTabLine(raw) || isChordRow(raw) || isFence(raw) {
		return false
	}
	return true
}

// isStrokesRow reports whether a line is a strum strokes row: at least two
// slots, each a single strum glyph. It does not require a stroke arrow, because
// some patterns are entirely rests and mutes (Yellowcard); the beats row that a
// caller pairs with it is what confirms a real strum block. The two-slot floor
// keeps a stray single glyph from being read as a strum.
func isStrokesRow(raw string) bool {
	fields := strings.Fields(raw)
	if len(fields) < 2 {
		return false
	}
	for _, f := range fields {
		runes := []rune(f)
		if len(runes) != 1 || !isStrumGlyph(runes[0]) {
			return false
		}
	}
	return true
}

func isStrumGlyph(r rune) bool {
	switch r {
	case '↓', '↑', '▼', '▲', 'x', 'X', '·':
		return true
	}
	return false
}

// isBeatsRow reports whether a line is a strum beats row: every token is a run
// of digits or the "&" between beats.
func isBeatsRow(raw string) bool {
	fields := strings.Fields(raw)
	if len(fields) == 0 {
		return false
	}
	for _, f := range fields {
		if f == "&" {
			continue
		}
		for _, r := range f {
			if !isDigit(r) {
				return false
			}
		}
	}
	return true
}

// isTabLine reports whether a line is one staff row of a guitar-TAB block: an
// optional single string-name letter, then a "|", then only dashes, digits,
// mutes, and bars. It requires a dash so a chords-only progression with bars is
// not swept up as tablature.
func isTabLine(raw string) bool {
	trimmed := strings.TrimSpace(raw)
	bar := strings.IndexByte(trimmed, '|')
	if bar < 0 {
		return false
	}
	if len([]rune(strings.TrimSpace(trimmed[:bar]))) > 1 {
		return false
	}
	staff := trimmed[bar:]
	for _, r := range staff {
		switch {
		case r == '-' || r == '|' || r == ' ' || r == 'x' || r == 'X':
		case isDigit(r):
		default:
			return false
		}
	}
	return strings.ContainsRune(staff, '-')
}

// isChordRow reports whether a line is made only of chord names (with optional
// "|" bars and a trailing "(…)" note) — the shared shape of a chord line (G)
// and a chords-only line (E).
func isChordRow(raw string) bool {
	_, ok := chordColumns(raw)
	return ok
}

// chordColumns extracts the chords on a chord row with their rune columns. It
// returns ok=false unless every non-bar token is a valid chord, so it doubles
// as the chord-row test. A trailing "(…)" note is ignored.
func chordColumns(raw string) ([]chordColumn, bool) {
	runes := []rune(stripTrailingNote(raw))
	var cols []chordColumn
	i := 0
	for i < len(runes) {
		if runes[i] == ' ' || runes[i] == '\t' {
			i++
			continue
		}
		start := i
		for i < len(runes) && runes[i] != ' ' && runes[i] != '\t' {
			i++
		}
		token := string(runes[start:i])
		if token == "|" {
			continue // bar separator, not a chord
		}
		if !isChordToken(token) {
			return nil, false
		}
		cols = append(cols, chordColumn{col: start, chord: token})
	}
	if len(cols) == 0 {
		return nil, false
	}
	return cols, true
}

// splitTrailingNote splits a trailing parenthesised note off a line (e.g.
// "(×2)", "(×4 takty)", "(or x33201)"), preserving the leading columns. note is
// the "(…)" including its parentheses, or "" when there is none.
func splitTrailingNote(s string) (rest, note string) {
	trimmed := strings.TrimRight(s, " \t")
	if strings.HasSuffix(trimmed, ")") {
		if open := strings.LastIndexByte(trimmed, '('); open >= 0 {
			return strings.TrimRight(trimmed[:open], " \t"), trimmed[open:]
		}
	}
	return trimmed, ""
}

// stripTrailingNote returns the line with any trailing parenthesised note
// removed (see splitTrailingNote).
func stripTrailingNote(s string) string {
	rest, _ := splitTrailingNote(s)
	return rest
}

// chordDef reports whether a line is a chord shape definition ("Name: f f f f f
// f") and returns its six frets, or nil if it is not one. The name must be a
// valid chord, so a lyric that happens to look like a definition (e.g.
// "Riff: 0 2 2 1 0 0") is not mistaken for one. A trailing parenthesised
// alternate voicing is ignored.
func chordDef(raw string) []int {
	colon := strings.IndexByte(raw, ':')
	if colon < 0 {
		return nil
	}
	if !isChordToken(strings.TrimSpace(raw[:colon])) {
		return nil
	}
	fields := strings.Fields(stripTrailingNote(raw[colon+1:]))
	if len(fields) != 6 {
		return nil
	}
	frets := make([]int, 6)
	for j, f := range fields {
		switch {
		case f == "x" || f == "X":
			frets[j] = -1
		case len(f) == 1 && f[0] >= '0' && f[0] <= '9':
			frets[j] = int(f[0] - '0')
		default:
			return nil
		}
	}
	return frets
}

// chordDefParts returns the name and shape of a line already known to be a
// chord definition. Shapes read from a file are tagged Source "file".
func chordDefParts(raw string) (string, song.ChordShape) {
	colon := strings.IndexByte(raw, ':')
	name := strings.TrimSpace(raw[:colon])
	return name, song.ChordShape{Frets: chordDef(raw), Source: "file"}
}

// splitLyric attaches each chord to the run of lyric text that follows it. Each
// chord sits at its exact source column (clamped to the line length): a chord
// the file places mid-word stays mid-word — the .txt alignment is the source of
// truth, so the parser never second-guesses it. Text before the first chord
// becomes a leading chord-less part.
func splitLyric(cols []chordColumn, lyric []rune) []song.Part {
	n := len(lyric)
	var parts []song.Part
	if len(cols) > 0 && cols[0].col > 0 {
		parts = append(parts, song.Part{Text: string(lyric[:min(cols[0].col, n)])})
	}
	for j := range cols {
		start := min(cols[j].col, n)
		end := n
		if j+1 < len(cols) {
			end = min(cols[j+1].col, n)
		}
		parts = append(parts, song.Part{Chord: cols[j].chord, Text: string(lyric[start:end])})
	}
	return parts
}
