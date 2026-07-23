package parser

import (
	"fmt"
	"strconv"
	"strings"

	"sing7/internal/song"
)

// titleSeparator joins title and artist on line 1: space, em dash (U+2014),
// space. All 28 corpus files use exactly this, and no title contains a second
// one, so the split is never ambiguous.
const titleSeparator = " — "

// fenceRune is the box-drawing character (U+2500) a footer fence is made of.
const fenceRune = '─'

// minFenceLen guards against mistaking a short run of dashes in the body for a
// footer fence; real fences are ~40 characters.
const minFenceLen = 10

// Parse converts one song .txt file into the internal song.Song model. It
// returns an error only for input it cannot make sense of at all (a missing or
// malformed title line); everything softer is tolerated, since the parser is
// the app's only guardrail and a rejected file is never added to the store.
func Parse(data []byte) (song.Song, error) {
	text := strings.ReplaceAll(string(data), "\r\n", "\n")
	lines := strings.Split(text, "\n")

	title, artist, err := parseTitle(lines)
	if err != nil {
		return song.Song{}, err
	}

	// Line 1 is the title; line 2 is conventionally blank. Everything from
	// line 2 on is body-or-footer.
	bodyAndFooter := lines[1:]
	bodyLines, footerLines := splitBodyFooter(bodyAndFooter)

	sections, strums, chordShapes := parseBody(bodyLines)

	parsed := song.Song{
		Slug:        song.Slug(title, artist),
		Title:       title,
		Artist:      artist,
		Meta:        parseFooter(footerLines),
		Strum:       strums,
		ChordShapes: chordShapes,
		Sections:    sections,
	}
	return parsed, nil
}

// parseTitle reads "Title — Artist" from line 1. The whole right side is the
// artist (never split further on commas, slashes, or parens).
func parseTitle(lines []string) (title, artist string, err error) {
	if len(lines) == 0 || strings.TrimSpace(lines[0]) == "" {
		return "", "", fmt.Errorf("missing title line")
	}
	first := lines[0]
	separator := strings.Index(first, titleSeparator)
	if separator < 0 {
		return "", "", fmt.Errorf("title line %q is not \"Title — Artist\"", first)
	}
	title = strings.TrimSpace(first[:separator])
	artist = strings.TrimSpace(first[separator+len(titleSeparator):])
	if title == "" || artist == "" {
		return "", "", fmt.Errorf("title line %q has an empty title or artist", first)
	}
	return title, artist, nil
}

// splitBodyFooter separates the readable body from the metadata footer. It is
// deliberately lenient about fences: the clean case is two fences with the
// footer between them, but one corpus file has a single trailing fence with the
// metadata block sitting above it, so that case is handled too.
func splitBodyFooter(bodyAndFooter []string) (body, footer []string) {
	var fences []int
	for i, line := range bodyAndFooter {
		if isFence(line) {
			fences = append(fences, i)
		}
	}

	switch {
	case len(fences) >= 2:
		// Footer lives between the last two fences; anything after the last
		// fence is a tolerated trailing note and is dropped.
		open, close := fences[len(fences)-2], fences[len(fences)-1]
		return bodyAndFooter[:open], bodyAndFooter[open+1 : close]
	case len(fences) == 1:
		// NORMALIZE-REMOVABLE: this whole branch exists only to tolerate one
		// irregular file — Lucie - Medvídek, which has a single trailing fence
		// (with a blank line above it) instead of the standard two. Once a file
		// normalizer gives every song the usual two-fence footer, delete this
		// case and splitBodyFooter collapses to the two-fence slice above. See
		// plan §6.3 (known corpus inconsistencies).
		//
		// Single fence at the end: skip any blank lines directly above it, then
		// walk up over the contiguous metadata block that precedes it.
		fence := fences[0]
		start := fence
		for start > 0 && strings.TrimSpace(bodyAndFooter[start-1]) == "" {
			start--
		}
		for start > 0 {
			above := bodyAndFooter[start-1]
			if strings.TrimSpace(above) == "" {
				break
			}
			if _, _, ok := splitMetaLine(above); !ok {
				break
			}
			start--
		}
		return bodyAndFooter[:start], bodyAndFooter[start:fence]
	default:
		return bodyAndFooter, nil
	}
}

// isFence reports whether a line is a footer fence: a run of at least
// minFenceLen box-drawing characters and nothing else.
func isFence(line string) bool {
	trimmed := strings.TrimSpace(line)
	if len([]rune(trimmed)) < minFenceLen {
		return false
	}
	for _, r := range trimmed {
		if r != fenceRune {
			return false
		}
	}
	return true
}

// splitMetaLine splits a footer line into "label  value" at the first run of
// two or more spaces (the aligned-column convention). ok is false when the line
// has no such split.
func splitMetaLine(line string) (label, value string, ok bool) {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" {
		return "", "", false
	}
	gap := strings.Index(trimmed, "  ")
	if gap < 0 {
		return "", "", false
	}
	label = strings.TrimSpace(trimmed[:gap])
	value = strings.TrimSpace(trimmed[gap:])
	if label == "" || value == "" {
		return "", "", false
	}
	return label, value, true
}

// parseFooter maps footer lines into Meta. Known labels (in English and Czech)
// fill typed fields; everything else is kept losslessly in Notes so the label
// map can grow deliberately later.
func parseFooter(footer []string) song.Meta {
	var meta song.Meta
	for _, line := range footer {
		label, value, ok := splitMetaLine(line)
		if !ok {
			if trimmed := strings.TrimSpace(line); trimmed != "" {
				meta.Notes = append(meta.Notes, trimmed)
			}
			continue
		}
		switch strings.ToLower(label) {
		case "key", "tónina", "tonina":
			meta.Key = value
		case "time", "takt":
			meta.Time = value
		case "tempo":
			meta.Tempo = value
		case "capo":
			meta.Capo = parseCapo(value)
		case "artist", "autoři", "autori":
			if year, ok := extractYear(value); ok {
				meta.Year = year
			}
		default:
			meta.Notes = append(meta.Notes, label+": "+value)
		}
	}
	return meta
}

// parseCapo reads a capo value: "none"/"žádný" (and anything with no number)
// mean 0; otherwise the first integer in the string wins ("2nd fret" → 2).
func parseCapo(value string) int {
	lower := strings.ToLower(value)
	if strings.Contains(lower, "none") || strings.Contains(lower, "žádný") || strings.Contains(lower, "zadny") {
		return 0
	}
	digits := strings.Builder{}
	for _, r := range value {
		if r >= '0' && r <= '9' {
			digits.WriteRune(r)
		} else if digits.Len() > 0 {
			break
		}
	}
	if digits.Len() == 0 {
		return 0
	}
	n, _ := strconv.Atoi(digits.String())
	return n
}

// extractYear finds a four-digit year in an artist line such as
// "Coldplay (2000)". It returns ok=false when there is no plausible year.
func extractYear(value string) (int, bool) {
	runes := []rune(value)
	for i := 0; i+4 <= len(runes); i++ {
		if !isDigit(runes[i]) {
			continue
		}
		if i > 0 && isDigit(runes[i-1]) {
			continue // not the start of the run
		}
		if i+4 < len(runes) && isDigit(runes[i+4]) {
			continue // run is longer than four digits
		}
		if isDigit(runes[i+1]) && isDigit(runes[i+2]) && isDigit(runes[i+3]) {
			year, _ := strconv.Atoi(string(runes[i : i+4]))
			if year >= 1000 && year <= 2999 {
				return year, true
			}
		}
	}
	return 0, false
}

func isDigit(r rune) bool { return r >= '0' && r <= '9' }
