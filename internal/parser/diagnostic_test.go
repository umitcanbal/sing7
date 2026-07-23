package parser

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"unicode"

	"sing7/internal/song"
)

// TestSuspiciousLyrics is a diagnostic (not a hard assertion): it re-reads every
// corpus file, parses it, and reports any parsed lyric line whose text looks
// structural — mostly digits/symbols, or containing bar/·/tab markers. These are
// the format surprises worth a human's eye. It never fails; run with -v.
func TestSuspiciousLyrics(test *testing.T) {
	files, _ := filepath.Glob(filepath.Join(corpusDir, "*.txt"))
	for _, path := range files {
		data, err := os.ReadFile(path)
		if err != nil {
			test.Fatalf("reading %s: %v", path, err)
		}
		parsed, err := Parse(data)
		if err != nil {
			test.Fatalf("parse %s: %v", path, err)
		}
		for _, section := range parsed.Sections {
			for _, line := range section.Lines {
				if line.ChordsOnly {
					continue
				}
				text := lineText(line)
				if looksStructural(text) {
					test.Logf("%s: suspicious lyric %q", filepath.Base(path), text)
				}
			}
		}
	}
}

// lineText joins a line's parts back into its rendered text.
func lineText(line song.Line) string {
	var builder strings.Builder
	for _, part := range line.Parts {
		builder.WriteString(part.Text)
	}
	return builder.String()
}

func looksStructural(text string) bool {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return false
	}
	if strings.ContainsAny(trimmed, "·|") {
		return true
	}
	letters, digits := 0, 0
	for _, r := range trimmed {
		switch {
		case unicode.IsLetter(r):
			letters++
		case unicode.IsDigit(r):
			digits++
		}
	}
	return digits > letters
}
