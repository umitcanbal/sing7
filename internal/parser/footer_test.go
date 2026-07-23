package parser

import "testing"

// TestParseTitleErrors checks the only hard failures the parser reports.
func TestParseTitleErrors(test *testing.T) {
	for _, bad := range [][]byte{
		[]byte(""),
		[]byte("no separator here\n\nbody"),
		[]byte(" — Coldplay\n"),    // empty title
		[]byte("Don't Panic — \n"), // empty artist
	} {
		if _, err := Parse(bad); err == nil {
			test.Errorf("Parse(%q) = nil error, want error", bad)
		}
	}

	good := []byte("Don't Panic — Coldplay\n\nAm\nBones\n")
	parsed, err := Parse(good)
	if err != nil {
		test.Fatalf("Parse(good) errored: %v", err)
	}
	if parsed.Title != "Don't Panic" || parsed.Artist != "Coldplay" {
		test.Errorf("title/artist = %q / %q", parsed.Title, parsed.Artist)
	}
}

// TestParseCapo covers the capo value conventions across languages.
func TestParseCapo(test *testing.T) {
	cases := map[string]int{
		"none":     0,
		"žádný":    0,
		"2nd fret": 2,
		"2":        2,
		"capo 3":   3,
		"":         0,
	}
	for value, want := range cases {
		if got := parseCapo(value); got != want {
			test.Errorf("parseCapo(%q) = %d, want %d", value, got, want)
		}
	}
}

// TestExtractYear covers pulling a release year out of an artist line.
func TestExtractYear(test *testing.T) {
	if year, ok := extractYear("Coldplay (2000)"); !ok || year != 2000 {
		test.Errorf("got %d, %v; want 2000, true", year, ok)
	}
	if _, ok := extractYear("Michal Hrůza"); ok {
		test.Error("expected no year")
	}
	if _, ok := extractYear("track 12345 nonsense"); ok {
		test.Error("a five-digit run is not a year")
	}
}
