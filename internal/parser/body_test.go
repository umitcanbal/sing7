package parser

import "testing"

// TestClassification checks each line-type recogniser against representative
// lines drawn from the corpus.
func TestClassification(test *testing.T) {
	chordRows := []string{
		"Am              C",
		"| Am | C | Fmaj7 | Fmaj7 |   (×2)", // bars + trailing note
		"G  Bm  Em  D  (×4 takty)",          // trailing note with words
		"D                        Hm",       // Czech H
		"Fmaj7  Fmaj9",
	}
	for _, line := range chordRows {
		if !isChordRow(line) {
			test.Errorf("isChordRow(%q) = false, want true", line)
		}
	}

	notChordRows := []string{
		"Bones, sinking like stones",
		"        Fmaj7 is my favourite", // has real words
		"",
		"e |-0-00-xxxxxx-0-00---xxxx-|",
	}
	for _, line := range notChordRows {
		if isChordRow(line) {
			test.Errorf("isChordRow(%q) = true, want false", line)
		}
	}

	if !isSectionTag("[Verse 1]") || !isSectionTag("[Ref. 2x]") {
		test.Error("section tags should be recognised")
	}
	if isSectionTag("[]") || isSectionTag("Intro") {
		test.Error("non-tags should be rejected")
	}

	strokes := []string{"↓ · x ↑ · ↑ ↓ ↑", "· x · x x x x x · x · x x x x x"}
	for _, line := range strokes {
		if !isStrokesRow(line) {
			test.Errorf("isStrokesRow(%q) = false, want true", line)
		}
	}
	if isStrokesRow("Am C") || isStrokesRow("x") {
		test.Error("non-strokes rows should be rejected")
	}
	if !isBeatsRow("1 & 2 & 3 & 4 &") || isBeatsRow("Am C") {
		test.Error("beats row recognition wrong")
	}

	if !isTabLine("e |-0-00-xxxxxx-0-00---xxxx-|") || !isTabLine("B |---12-12--12-12-") {
		test.Error("tab staff lines should be recognised")
	}
	if isTabLine("| Am | C |") || isTabLine("Bones, sinking") {
		test.Error("non-tab lines should be rejected")
	}
}

// TestChordDef checks chord-definition parsing, including the trailing
// alternate-voicing note and rejection of non-definitions.
func TestChordDef(test *testing.T) {
	if frets := chordDef("Fadd#11: 1 3 3 2 0 1   (or x33201)"); !equalInts(frets, []int{1, 3, 3, 2, 0, 1}) {
		test.Errorf("Fadd#11 frets = %v, want [1 3 3 2 0 1]", frets)
	}
	if frets := chordDef("C:     x 3 2 0 1 0"); !equalInts(frets, []int{-1, 3, 2, 0, 1, 0}) {
		test.Errorf("C frets = %v, want [-1 3 2 0 1 0]", frets)
	}
	for _, notDef := range []string{"D", "Bones, sinking like stones", "Note: not six fret tokens here", "Riff: 0 2 2 1 0 0"} {
		if chordDef(notDef) != nil {
			test.Errorf("chordDef(%q) should be nil", notDef)
		}
	}
}

// TestSplitLyric checks that each chord attaches at its exact source column —
// a chord that lands mid-word stays mid-word (no snapping to the word start).
func TestSplitLyric(test *testing.T) {
	lyric := []rune("Bones, sinking like stones")
	cols := []chordColumn{{col: 0, chord: "Am"}, {col: 16, chord: "C"}}
	parts := splitLyric(cols, lyric)
	if len(parts) != 2 {
		test.Fatalf("got %d parts, want 2", len(parts))
	}
	if parts[0].Chord != "Am" || parts[0].Text != "Bones, sinking l" {
		test.Errorf("part 0 = %+v, want {Am, \"Bones, sinking l\"}", parts[0])
	}
	// C sits at column 16 (one column into "like"); it attaches exactly there.
	if parts[1].Chord != "C" || parts[1].Text != "ike stones" {
		test.Errorf("part 1 = %+v, want {C, \"ike stones\"}", parts[1])
	}

	// A chord column past the end of a short lyric clamps to the end.
	short := []rune("Hi")
	clamped := splitLyric([]chordColumn{{col: 0, chord: "G"}, {col: 40, chord: "C"}}, short)
	if clamped[len(clamped)-1].Text != "" {
		test.Errorf("trailing chord past end should have empty text, got %q", clamped[len(clamped)-1].Text)
	}
}

func equalInts(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// TestImplicitSection checks that a song with no section tags parses as one
// section with an empty label.
func TestImplicitSection(test *testing.T) {
	data := []byte("Song — Artist\n\nAm      C\nla la la\n")
	parsed, err := Parse(data)
	if err != nil {
		test.Fatalf("parse: %v", err)
	}
	if len(parsed.Sections) != 1 || parsed.Sections[0].Label != "" {
		test.Errorf("sections = %+v, want one with empty label", parsed.Sections)
	}
	if len(parsed.Sections[0].Lines) != 1 {
		test.Errorf("want 1 line, got %d", len(parsed.Sections[0].Lines))
	}
}

// TestHeldLyricKeepsIndentation checks that a lyric with no chord above it keeps
// its leading whitespace — parity with chord-attached lyrics; the parser is
// lossless and any trimming is left to the DTO/render layer.
func TestHeldLyricKeepsIndentation(test *testing.T) {
	data := []byte("Song — Artist\n\nAm\nfirst line\n    indented held line\n")
	parsed, err := Parse(data)
	if err != nil {
		test.Fatalf("parse: %v", err)
	}
	lines := parsed.Sections[0].Lines
	if len(lines) != 2 {
		test.Fatalf("want 2 lines, got %d", len(lines))
	}
	if got := lines[1].Parts[0].Text; got != "    indented held line" {
		test.Errorf("held lyric text = %q, want it untrimmed with 4 leading spaces", got)
	}
}
