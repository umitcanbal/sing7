package song

import "testing"

// TestDontPanicExample constructs the §3 worked example (Coldplay — Don't
// Panic) literally from the structs, proving the model can represent it.
// It is more like a documentation rather than an actual meaningful test
func TestDontPanicExample(test *testing.T) {
	dontPanic := Song{
		Slug:   "coldplay-dont-panic",
		Title:  "Don't Panic",
		Artist: "Coldplay",
		Meta: Meta{
			Key:   "F",
			Capo:  0,
			Time:  "4/4",
			Tempo: "122 BPM",
			Year:  2000,
			Notes: []string{"Source: pdf/dont panic accordi.pdf"},
		},
		Strum: []Strum{
			{Label: "main", Strokes: "↓ · x ↑ · ↑ ↓ ↑", Beats: "1 & 2 & 3 & 4 &"},
		},
		ChordShapes: map[string]ChordShape{
			"C":     {Frets: []int{-1, 3, 2, 0, 1, 0}, Source: "base"},
			"Am":    {Frets: []int{-1, 0, 2, 2, 1, 0}, Source: "base"},
			"Fmaj7": {Frets: []int{1, 3, 3, 2, 1, -1}, Source: "file"},
		},
		Sections: []Section{
			{
				Label: "Intro",
				Lines: []Line{
					{ChordsOnly: true, Parts: []Part{{Chord: "Fmaj7"}, {Chord: "Fmaj9"}}},
				},
			},
			{
				Label: "Verse 1",
				Lines: []Line{
					{Parts: []Part{
						{Chord: "Am", Text: "Bones, sinking l"},
						{Chord: "C", Text: "ike stones"},
					}},
					{Parts: []Part{
						{Text: "All that we "},
						{Chord: "Fmaj7", Text: "fought for"},
					}},
				},
			},
			{
				Label: "Interlude",
				Lines: []Line{
					{ChordsOnly: true, Annotation: "(×2)", Parts: []Part{
						{Chord: "Am"}, {Chord: "C"}, {Chord: "Fmaj7"}, {Chord: "Fmaj7"},
					}},
				},
			},
		},
	}

	// Spot-check a few fields to prove the structure holds together.
	if dontPanic.Meta.Capo != 0 {
		test.Errorf("Capo = %d, want 0", dontPanic.Meta.Capo)
	}
	if dontPanic.Meta.Key != "F" {
		test.Errorf("Key = %q, want \"F\"", dontPanic.Meta.Key)
	}
	if dontPanic.ChordShapes["Fmaj7"].Source != "file" {
		test.Errorf("Fmaj7 source = %q, want \"file\"", dontPanic.ChordShapes["Fmaj7"].Source)
	}
	if dontPanic.ChordShapes["C"].Frets[0] != -1 {
		test.Errorf("C low string = %d, want -1 (muted)", dontPanic.ChordShapes["C"].Frets[0])
	}
	if dontPanic.Sections[0].Label != "Intro" {
		test.Errorf("section 0 label = %q, want \"Intro\"", dontPanic.Sections[0].Label)
	}
	if !dontPanic.Sections[0].Lines[0].ChordsOnly {
		test.Error("intro line should be chords-only")
	}
	if got := dontPanic.Sections[2].Lines[0].Annotation; got != "(×2)" {
		test.Errorf("interlude annotation = %q, want \"(×2)\"", got)
	}
}

func TestSlug(test *testing.T) {
	cases := []struct {
		title, artist, want string
	}{
		{"Don't Panic", "Coldplay", "coldplay-dont-panic"},
		{"Highway to Hell", "AC/DC", "ac-dc-highway-to-hell"},
		{"Everlong (Acoustic)", "Foo Fighters", "foo-fighters-everlong-acoustic"},
		{"Ani k stáru", "Zdeněk Svěrák, Jaroslav Uhlíř", "zdenek-sverak-jaroslav-uhlir-ani-k-staru"},
		{"Medvídek", "Lucie", "lucie-medvidek"},
	}
	for _, testCase := range cases {
		got := Slug(testCase.title, testCase.artist)
		if got != testCase.want {
			test.Errorf("Slug(%q, %q) = %q, want %q", testCase.title, testCase.artist, got, testCase.want)
		}
	}
}
