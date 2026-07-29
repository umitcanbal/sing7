package parser

import (
	"os"
	"path/filepath"
	"testing"
)

const corpusDir = "../../songs"

// TestCorpusParses parses every real song file and requires that each one
// succeeds and produces a plausible song: a title, an artist, a slug, and at
// least one section with at least one line.
func TestCorpusParses(test *testing.T) {
	files, err := filepath.Glob(filepath.Join(corpusDir, "*.txt"))
	if err != nil {
		test.Fatalf("globbing corpus: %v", err)
	}
	if len(files) != 28 {
		test.Fatalf("expected 28 corpus files, found %d", len(files))
	}

	for _, path := range files {
		test.Run(filepath.Base(path), func(test *testing.T) {
			data, err := os.ReadFile(path)
			if err != nil {
				test.Fatalf("reading: %v", err)
			}
			parsed, err := Parse(data)
			if err != nil {
				test.Fatalf("parse error: %v", err)
			}
			if parsed.Title == "" || parsed.Artist == "" {
				test.Errorf("empty title or artist: %q / %q", parsed.Title, parsed.Artist)
			}
			if parsed.Slug == "" {
				test.Error("empty slug")
			}
			lineCount := 0
			for _, section := range parsed.Sections {
				lineCount += len(section.Lines)
			}
			if lineCount == 0 {
				test.Error("no lines parsed")
			}
			test.Logf("slug=%s sections=%d lines=%d strums=%d shapes=%d meta=%+v",
				parsed.Slug, len(parsed.Sections), lineCount, len(parsed.Strum), len(parsed.ChordShapes), parsed.Meta)
		})
	}
}
