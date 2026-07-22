// Package song defines the internal Song data model — the shared contract the
// parser produces, the store holds, and the DTO maps from. It stays
// dependency-free: it imports none of the other internal packages.
package song

import "strings"

// Song is the parsed, in-memory representation of one song file. It is never
// serialized directly; the HTTP layer maps it to a separate response DTO.
type Song struct {
	Slug        string
	Title       string
	Artist      string
	Meta        Meta
	Strum       []Strum
	ChordShapes map[string]ChordShape
	Sections    []Section
}

// Meta holds the footer fields. Each field's zero value means the file did not
// provide it.
type Meta struct {
	Key   string   // e.g. "F"; "" when the file has no Key/Tónina
	Capo  int      // fret number; 0 means no capo
	Time  string   // e.g. "4/4"; "" when absent
	Tempo string   // e.g. "122 BPM"; "" when absent
	Year  int      // release year; 0 when absent
	Notes []string // unmapped footer labels, kept losslessly
}

// Strum is one strumming pattern: a strokes row over a beats row, labelled by
// where it is played. A file may carry several.
type Strum struct {
	Label   string // where it is played, e.g. "main"; empty when unlabelled
	Strokes string // the strokes row, e.g. "↓ · x ↑ · ↑ ↓ ↑"
	Beats   string // the beats row, e.g. "1 & 2 & 3 & 4 &"
}

// ChordShape is one chord voicing: a fret number per guitar string (low to
// high). A muted string is -1. Source records where the shape came from.
type ChordShape struct {
	Frets  []int  // one entry per string; -1 means muted
	Source string // "base" (base dictionary) or "file" (per-song override)
}

// Section is a run of lines under one section tag. An empty Label means the
// song had no section tag and this is the single implicit section (an empty
// string is never a valid tag, so it is unambiguous as the "untagged" marker).
type Section struct {
	Label string
	Lines []Line
}

// Line is one rendered line: a sequence of chord-over-text parts. ChordsOnly
// marks a chord row with no lyric beneath it (an intro/interlude progression).
type Line struct {
	ChordsOnly bool
	Parts      []Part
}

// Part is a single chord attached to the text that follows it. Either field
// may be empty: a leading lyric with no chord, or a chord with no text.
type Part struct {
	Chord string
	Text  string
}

// Slug builds the stable URL slug and map key from a song's title and artist,
// in the form "artist-title" kebab-cased — e.g. ("Don't Panic", "Coldplay")
// gives "coldplay-dont-panic". Apostrophes are dropped; diacritics are folded
// to ASCII; every other run of non-alphanumeric characters becomes one hyphen.
func Slug(title, artist string) string {
	return kebabCase(artist + " " + title)
}

// kebabCase lowercases the input, folds diacritics to ASCII, removes
// apostrophes, and joins the remaining alphanumeric runs with single hyphens.
func kebabCase(input string) string {
	var builder strings.Builder
	previousWasHyphen := false

	for _, character := range strings.ToLower(input) {
		switch {
		case character == '\'' || character == '’':
			// Drop apostrophes so "don't" becomes "dont", not "don-t".
			continue
		case isSlugAlphanumeric(character):
			builder.WriteRune(foldDiacritic(character))
			previousWasHyphen = false
		default:
			if !previousWasHyphen && builder.Len() > 0 {
				builder.WriteByte('-')
				previousWasHyphen = true
			}
		}
	}

	return strings.Trim(builder.String(), "-")
}

// isSlugAlphanumeric reports whether a character is kept as-is in a slug: an
// ASCII letter or digit, or a letter we can fold to ASCII.
func isSlugAlphanumeric(character rune) bool {
	if character >= 'a' && character <= 'z' {
		return true
	}
	if character >= '0' && character <= '9' {
		return true
	}
	return foldDiacritic(character) != character
}

// foldDiacritic maps a common accented (Czech and general Latin) lowercase
// letter to its plain ASCII base. Characters with no mapping are returned
// unchanged.
func foldDiacritic(character rune) rune {
	if folded, ok := diacriticFolds[character]; ok {
		return folded
	}
	return character
}

// diacriticFolds covers the accented lowercase letters that appear in the
// akordy corpus (Czech) plus common Latin-1 accents.
var diacriticFolds = map[rune]rune{
	// a
	'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a',
	// c
	'č': 'c', 'ç': 'c',
	// d
	'ď': 'd',
	// e
	'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'ě': 'e',
	// i
	'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
	// n
	'ň': 'n', 'ñ': 'n',
	// o
	'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o',
	// r
	'ř': 'r',
	// s
	'š': 's',
	// t
	'ť': 't',
	// u
	'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ů': 'u',
	// y
	'ý': 'y', 'ÿ': 'y',
	// z
	'ž': 'z',
}
