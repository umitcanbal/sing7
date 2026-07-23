package parser

import (
	"os"
	"path/filepath"
	"testing"

	"sing7/internal/song"
)

// mustParse reads and parses a named corpus file, failing the test on any error.
func mustParse(test *testing.T, name string) song.Song {
	test.Helper()
	data, err := os.ReadFile(filepath.Join(corpusDir, name))
	if err != nil {
		test.Fatalf("reading %s: %v", name, err)
	}
	parsed, err := Parse(data)
	if err != nil {
		test.Fatalf("parsing %s: %v", name, err)
	}
	return parsed
}

// TestDontPanic asserts the full structure of the reference song end to end:
// title, metadata, both strum patterns, a file chord shape, and the chord/lyric
// attachment of the worked example.
func TestDontPanic(test *testing.T) {
	parsed := mustParse(test, "Coldplay - Don't Panic.txt")

	if parsed.Slug != "coldplay-dont-panic" {
		test.Errorf("slug = %q", parsed.Slug)
	}
	if parsed.Title != "Don't Panic" || parsed.Artist != "Coldplay" {
		test.Errorf("title/artist = %q / %q", parsed.Title, parsed.Artist)
	}
	if parsed.Meta.Key != "F" || parsed.Meta.Time != "4/4" || parsed.Meta.Tempo != "122 BPM" {
		test.Errorf("meta = %+v", parsed.Meta)
	}
	if parsed.Meta.Capo != 0 || parsed.Meta.Year != 2000 {
		test.Errorf("capo/year = %d / %d", parsed.Meta.Capo, parsed.Meta.Year)
	}

	if len(parsed.Strum) != 2 {
		test.Fatalf("got %d strums, want 2", len(parsed.Strum))
	}
	first := parsed.Strum[0]
	if first.Label != "Strumming (122 BPM)" || first.Strokes != "↓ · x ↑ · ↑ ↓ ↑" || first.Beats != "1 & 2 & 3 & 4 &" {
		test.Errorf("strum[0] = %+v", first)
	}

	fmaj7, ok := parsed.ChordShapes["Fmaj7"]
	if !ok || !equalInts(fmaj7.Frets, []int{1, 3, 3, 2, 1, -1}) || fmaj7.Source != "file" {
		test.Errorf("Fmaj7 shape = %+v", fmaj7)
	}

	// Section 0 is the intro: one chords-only line, Fmaj7 then Fmaj9.
	intro := parsed.Sections[0]
	if intro.Label != "Intro" || len(intro.Lines) != 1 || !intro.Lines[0].ChordsOnly {
		test.Fatalf("intro section = %+v", intro)
	}
	if got := intro.Lines[0].Parts; len(got) != 2 || got[0].Chord != "Fmaj7" || got[1].Chord != "Fmaj9" {
		test.Errorf("intro parts = %+v", got)
	}

	// The verse's first line is the worked chord/lyric attachment example.
	verse := findSection(parsed, "Verse 1")
	if verse == nil {
		test.Fatal("no Verse 1 section")
	}
	want := []song.Part{{Chord: "Am", Text: "Bones, sinking l"}, {Chord: "C", Text: "ike stones"}}
	if got := verse.Lines[0].Parts; !equalParts(got, want) {
		test.Errorf("verse line 0 parts = %+v, want %+v", got, want)
	}

	// The interlude is a bar-and-note progression that must parse chords-only.
	interlude := findSection(parsed, "Interlude")
	if interlude == nil || len(interlude.Lines) != 1 || !interlude.Lines[0].ChordsOnly {
		test.Fatalf("interlude = %+v", interlude)
	}
	if got := interlude.Lines[0].Parts; len(got) != 4 || got[0].Chord != "Am" || got[3].Chord != "Fmaj7" {
		test.Errorf("interlude parts = %+v", got)
	}
	// The "| Am | C | Fmaj7 | Fmaj7 |   (×2)" repeat hint is kept as-is.
	if got := interlude.Lines[0].Annotation; got != "(×2)" {
		test.Errorf("interlude annotation = %q, want \"(×2)\"", got)
	}
}

// TestBlinkStrumsAndShapes covers a file with two labelled strum patterns and a
// rich set of file chord shapes including an altered voicing.
func TestBlinkStrumsAndShapes(test *testing.T) {
	parsed := mustParse(test, "Blink-182 - I Miss You.txt")

	if len(parsed.Strum) != 2 {
		test.Fatalf("got %d strums, want 2", len(parsed.Strum))
	}
	if parsed.Strum[0].Label != "Intro / verse" || parsed.Strum[1].Label != "Pre-chorus / chorus" {
		test.Errorf("strum labels = %q, %q", parsed.Strum[0].Label, parsed.Strum[1].Label)
	}
	if parsed.Meta.Capo != 2 || parsed.Meta.Year != 2003 {
		test.Errorf("capo/year = %d / %d", parsed.Meta.Capo, parsed.Meta.Year)
	}
	shape, ok := parsed.ChordShapes["Fadd#11"]
	if !ok || !equalInts(shape.Frets, []int{1, 3, 3, 2, 0, 1}) {
		test.Errorf("Fadd#11 = %+v", shape)
	}
}

// TestZejtraMam covers a Czech file: a 16-slot label-less strum, no chord
// definitions, and a chords-only progression with a "(×4 takty)" note.
func TestZejtraMam(test *testing.T) {
	parsed := mustParse(test, "Ready Kirken - Zejtra mám.txt")

	if len(parsed.Strum) != 1 || parsed.Strum[0].Label != "" {
		test.Fatalf("strum = %+v", parsed.Strum)
	}
	if len(parsed.ChordShapes) != 0 {
		test.Errorf("expected no chord shapes, got %d", len(parsed.ChordShapes))
	}
	if parsed.Meta.Key != "G" || parsed.Meta.Tempo != "138 BPM" {
		test.Errorf("meta = %+v", parsed.Meta)
	}
	// The "G  Bm  Em  D  (×4 takty)" progression sits before the first tag, so
	// it lands in the implicit section 0 as a chords-only line of four chords.
	first := parsed.Sections[0]
	if first.Label != "" {
		test.Errorf("section 0 label = %q, want implicit \"\"", first.Label)
	}
	if len(first.Lines) != 1 || !first.Lines[0].ChordsOnly || len(first.Lines[0].Parts) != 4 {
		test.Fatalf("section 0 line = %+v", first.Lines)
	}
	if first.Lines[0].Parts[0].Chord != "G" || first.Lines[0].Parts[3].Chord != "D" {
		test.Errorf("progression chords = %+v", first.Lines[0].Parts)
	}
	if got := first.Lines[0].Annotation; got != "(×4 takty)" {
		test.Errorf("progression annotation = %q, want \"(×4 takty)\"", got)
	}
	if findSection(parsed, "Sloka 1") == nil || findSection(parsed, "Ref.") == nil {
		test.Error("expected Sloka 1 and Ref. sections")
	}
}

// TestSeverniVitrCzechH proves the Czech "Hm" chord attaches to lyrics rather
// than degrading to a lyric line — the regression this notation caused.
func TestSeverniVitrCzechH(test *testing.T) {
	parsed := mustParse(test, "Severní vítr - Svěrák Uhlíř.txt")

	if _, ok := parsed.ChordShapes["Hm"]; !ok {
		test.Error("Hm should be a file chord shape")
	}
	found := false
	for _, section := range parsed.Sections {
		for _, line := range section.Lines {
			for _, part := range line.Parts {
				if part.Chord == "Hm" && part.Text != "" {
					found = true
				}
			}
		}
	}
	if !found {
		test.Error("expected an Hm chord attached to lyric text")
	}
}

// TestMedvidekIrregularFence proves the single-fence footer is still read: its
// metadata populates Meta and does not leak into the body as lyrics.
func TestMedvidekIrregularFence(test *testing.T) {
	parsed := mustParse(test, "Lucie - Medvídek.txt")

	if parsed.Meta.Time != "6/8 (jedna akordová značka = tři osminy)" {
		test.Errorf("time = %q", parsed.Meta.Time)
	}
	if len(parsed.Meta.Notes) == 0 {
		test.Error("expected footer notes, got none")
	}
	// It also mixes an untagged run with a later [Bridge] tag.
	if len(parsed.Sections) != 2 || parsed.Sections[0].Label != "" || parsed.Sections[1].Label != "Bridge" {
		test.Errorf("sections = %d, labels %q/%q", len(parsed.Sections), parsed.Sections[0].Label, parsed.Sections[1].Label)
	}
}

func findSection(s song.Song, label string) *song.Section {
	for i := range s.Sections {
		if s.Sections[i].Label == label {
			return &s.Sections[i]
		}
	}
	return nil
}

func equalParts(a, b []song.Part) bool {
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
