package parser

import "testing"

// TestIsChordToken checks the chord grammar accepts every voicing shape seen in
// the corpus (including slash, extension, altered, and Czech "Hm") and rejects
// ordinary words, so a line of chords can be told apart from a line of lyrics.
func TestIsChordToken(test *testing.T) {
	valid := []string{
		"C", "G", "F", "A", "D", "E", "B",
		"Am", "Bm", "Em", "Dm", "Gm", "Cm",
		"C7", "A7", "B7", "D7", "G6", "Dm6",
		"Cadd9", "Fmaj7", "Fmaj9", "Cmaj7", "Dsus4", "Asus2", "Asus4",
		"Fadd#11", "C#m", "C#7sus2", "Bb", "Bbm",
		"C/B", "G/B", "C/E", "F#/A#", "D/F#", "Am/C", "Fsus2/E", "D6/C#",
		"Emi", "Hm", // Czech: E minor, B minor
	}
	for _, name := range valid {
		if !isChordToken(name) {
			test.Errorf("isChordToken(%q) = false, want true", name)
		}
	}

	invalid := []string{
		"", "|", "x", "8", "/C", "Cx",
		"Bones,", "sinking", "like", "stones", "the", "and", "All",
		"Hello", "world", "Yeah", "special", "creep", "Amerika", "door",
	}
	for _, word := range invalid {
		if isChordToken(word) {
			test.Errorf("isChordToken(%q) = true, want false", word)
		}
	}
}
